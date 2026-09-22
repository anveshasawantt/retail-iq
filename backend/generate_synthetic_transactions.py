"""
Generate synthetic sales history for RetailIQ — batched version.

WHY A REWRITE
-------------
The original version called db.add() + db.flush() once per transaction
(to get its id for the line items), and updated each Inventory ORM
object in place -- which SQLAlchemy then emits as one UPDATE statement
per touched row per commit. Over 60 simulated days with a few hundred
products, that's potentially thousands of individual round-trips to a
remote Neon database. This version:

  1. Builds each day's transactions + line items fully in memory first.
  2. bulk_insert_mappings() all of that day's Transactions at once
     (1 round-trip), then one SELECT to get back their ids (1 round-
     trip), then bulk_insert_mappings() all line items at once
     (1 round-trip). ~3 round-trips per day instead of ~1 per
     transaction.
  3. Tracks inventory changes purely in a Python dict during the
     simulation -- no DB writes at all until the very end, when ALL
     changed quantities are pushed in a SINGLE UPDATE statement using
     psycopg2's execute_values (a Postgres "UPDATE ... FROM (VALUES ...)"
     pattern) -- 1 round-trip total, regardless of how many products
     changed.

USAGE
-----
    python generate_synthetic_transactions.py

Run from the repo root (same level as requirements.txt / .env), same
as load_products_seed.py / load_bigbasket_quick.py.
"""

import random
import uuid
from datetime import datetime, timedelta, timezone

from psycopg2.extras import execute_values

from app.database import SessionLocal
from app.models import Product, Inventory, Transaction, TransactionItem

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DAYS_OF_HISTORY = 60
MIN_TXNS_PER_DAY = 15
MAX_TXNS_PER_DAY = 35
WEEKEND_MULTIPLIER = 1.6

MIN_BASKET_SIZE = 1
MAX_BASKET_SIZE = 8
MIN_LINE_QTY = 1
MAX_LINE_QTY = 5

GST_RATE = 0.05
DISCOUNT_CHANCE = 0.12
PAYMENT_MODES = ["cash", "card", "upi"]
PAYMENT_WEIGHTS = [0.35, 0.25, 0.40]


def _invoice_number() -> str:
    return f"TXN-{uuid.uuid4().hex[:8].upper()}"


def _zipf_weights(n: int) -> list[float]:
    return [1.0 / (rank + 1) for rank in range(n)]


def generate():
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        if not products:
            print("No products found — load your seed data first.")
            return

        # Plain dicts for speed -- no ORM tracking, no surprise UPDATEs.
        stock = {
            inv.product_id: inv.quantity_on_hand
            for inv in db.query(Inventory).all()
        }
        prices = {p.id: float(p.price) for p in products}
        sellable_ids = [p.id for p in products if p.id in stock]
        if not sellable_ids:
            print("No inventory rows found — run your inventory seeding first.")
            return

        weights = _zipf_weights(len(sellable_ids))
        today = datetime.now(timezone.utc).date()

        total_txns = 0
        total_items = 0
        total_revenue = 0.0

        for day_offset in range(DAYS_OF_HISTORY, 0, -1):
            day = today - timedelta(days=day_offset)
            is_weekend = day.weekday() >= 5

            n_txns = random.randint(MIN_TXNS_PER_DAY, MAX_TXNS_PER_DAY)
            if is_weekend:
                n_txns = int(n_txns * WEEKEND_MULTIPLIER)

            day_transactions = []          # dicts to bulk_insert_mappings
            day_items_by_invoice = {}      # invoice_number -> list of item dicts

            for _ in range(n_txns):
                basket_size = min(random.randint(MIN_BASKET_SIZE, MAX_BASKET_SIZE), len(sellable_ids))
                chosen_ids = list(dict.fromkeys(random.choices(sellable_ids, weights=weights, k=basket_size)))

                subtotal = 0.0
                lines = []
                for pid in chosen_ids:
                    available = stock.get(pid, 0)
                    if available <= 0:
                        continue
                    qty = min(random.randint(MIN_LINE_QTY, MAX_LINE_QTY), available)
                    if qty <= 0:
                        continue

                    unit_price = prices[pid]
                    line_total = round(unit_price * qty, 2)
                    subtotal += line_total
                    lines.append({"product_id": pid, "quantity": qty,
                                   "unit_price": unit_price, "line_total": line_total})
                    stock[pid] -= qty

                if not lines:
                    continue

                discount_amount = round(subtotal * random.uniform(0.05, 0.15), 2) \
                    if random.random() < DISCOUNT_CHANCE else 0.0
                gst_amount = round(subtotal * GST_RATE, 2)
                total = round(subtotal + gst_amount - discount_amount, 2)
                created_at = datetime(day.year, day.month, day.day, tzinfo=timezone.utc) \
                    + timedelta(hours=random.uniform(9, 21))
                invoice_number = _invoice_number()

                day_transactions.append({
                    "invoice_number": invoice_number,
                    "cashier_id": None,
                    "subtotal": round(subtotal, 2),
                    "gst_amount": gst_amount,
                    "discount_amount": discount_amount,
                    "total": total,
                    "payment_mode": random.choices(PAYMENT_MODES, weights=PAYMENT_WEIGHTS)[0],
                    "created_at": created_at,
                })
                day_items_by_invoice[invoice_number] = lines

                total_txns += 1
                total_items += len(lines)
                total_revenue += total

            if not day_transactions:
                continue

            # 1 round-trip: insert every transaction for this day at once.
            db.bulk_insert_mappings(Transaction, day_transactions)
            db.flush()

            # 1 round-trip: get back the ids Postgres just assigned.
            invoice_numbers = list(day_items_by_invoice.keys())
            id_map = dict(
                db.query(Transaction.invoice_number, Transaction.id)
                .filter(Transaction.invoice_number.in_(invoice_numbers))
                .all()
            )

            item_dicts = [
                {
                    "transaction_id": id_map[invoice],
                    "product_id": line["product_id"],
                    "quantity": line["quantity"],
                    "unit_price": line["unit_price"],
                    "line_discount": 0,
                    "line_total": line["line_total"],
                }
                for invoice, lines in day_items_by_invoice.items()
                for line in lines
            ]

            # 1 round-trip: insert every line item for this day at once.
            db.bulk_insert_mappings(TransactionItem, item_dicts)
            db.commit()

            print(f"  day -{day_offset}: {len(day_transactions)} transactions, "
                  f"{len(item_dicts)} line items")

        # --- Single bulk UPDATE for every inventory row that changed ---
        original_stock = {
            inv.product_id: inv.quantity_on_hand
            for inv in db.query(Inventory).all()
        }
        changed = [(pid, qty) for pid, qty in stock.items() if original_stock.get(pid) != qty]

        if changed:
            raw_conn = db.connection().connection
            cur = raw_conn.cursor()
            execute_values(
                cur,
                """
                UPDATE inventory AS inv
                SET quantity_on_hand = data.qty
                FROM (VALUES %s) AS data(product_id, qty)
                WHERE inv.product_id = data.product_id
                """,
                changed,
            )
            db.commit()

        print(f"\nDone. Generated {total_txns} transactions, {total_items} line items "
              f"across {DAYS_OF_HISTORY} days.")
        print(f"Simulated revenue: ₹{total_revenue:,.2f}")
        print(f"Updated stock for {len(changed)} product(s) in a single bulk update.")

        stocked_out = sum(1 for qty in stock.values() if qty == 0)
        print(f"{stocked_out} product(s) now at 0 stock — good, that's your "
              f"'urgent' rows for the stock-risk demo.")

    finally:
        db.close()


if __name__ == "__main__":
    random.seed(42)
    generate()