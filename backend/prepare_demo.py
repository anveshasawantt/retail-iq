import csv
import random
import os
from collections import defaultdict

from app.database import SessionLocal
from app.models import Product, Inventory, Transaction, TransactionItem, PurchaseOrder
import generate_synthetic_transactions

def _to_float(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None

def prepare_demo():
    db = SessionLocal()
    try:
        print("Clearing existing data...")
        db.query(TransactionItem).delete()
        db.query(Transaction).delete()
        db.query(PurchaseOrder).delete()
        db.query(Inventory).delete()
        db.query(Product).delete()
        db.commit()
        print("Database cleared safely.")

        print("Reading products_seed.csv...")
        csv_path = "../data/products_seed.csv"
        with open(csv_path, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))

        # Filter only valid rows first
        valid_rows = []
        seen_barcodes = set()
        for r in rows:
            barcode = (r.get("barcode") or "").strip()
            name = (r.get("name") or "").strip()
            price = _to_float(r.get("price"))
            cat = (r.get("category") or "Uncategorized").strip()
            if barcode and name and price is not None and cat and barcode not in seen_barcodes:
                valid_rows.append(r)
                seen_barcodes.add(barcode)

        # Group by category
        by_category = defaultdict(list)
        for r in valid_rows:
            by_category[r["category"]].append(r)

        target_total = 150
        valid_cats = [c for c, items in by_category.items() if len(items) >= 15]
        
        # Pick 10 categories
        chosen_cats = random.sample(valid_cats, min(10, len(valid_cats)))
        items_per_cat = target_total // len(chosen_cats)
        
        chosen_products = []
        for c in chosen_cats:
            chosen_products.extend(random.sample(by_category[c], items_per_cat))

        remainder = target_total - len(chosen_products)
        if remainder > 0:
            remaining_pool = [r for c in chosen_cats for r in by_category[c] if r not in chosen_products]
            chosen_products.extend(random.sample(remaining_pool, remainder))

        print(f"Selected exactly {len(chosen_products)} products across {len(chosen_cats)} categories.")

        # Insert products
        product_dicts = []
        for r in chosen_products:
            product_dicts.append({
                "barcode": r["barcode"],
                "name": r["name"],
                "brand": r.get("brand") or "Unbranded",
                "category": r["category"],
                "sub_category": r.get("sub_category") or None,
                "price": _to_float(r.get("price")),
                "market_price": _to_float(r.get("market_price")),
                "rating": _to_float(r.get("rating")),
                "barcode_source": r.get("barcode_source") or "generated",
            })

        db.bulk_insert_mappings(Product, product_dicts)
        db.flush()

        barcodes_in_chunk = [p["barcode"] for p in product_dicts]
        id_map = dict(
            db.query(Product.barcode, Product.id)
            .filter(Product.barcode.in_(barcodes_in_chunk))
            .all()
        )

        # Distribute inventory precisely: 10 zero stock, 15 low stock (1-5), 125 healthy
        qty_distribution = [0] * 10 + [random.randint(1, 5) for _ in range(15)] + [random.randint(20, 100) for _ in range(125)]
        random.shuffle(qty_distribution)

        inventory_dicts = []
        for i, p in enumerate(product_dicts):
            inventory_dicts.append({
                "product_id": id_map[p["barcode"]],
                "quantity_on_hand": qty_distribution[i],
            })

        db.bulk_insert_mappings(Inventory, inventory_dicts)
        db.commit()
        print(f"Inserted {len(product_dicts)} products and inventory records.")

    finally:
        db.close()

    print("Generating synthetic transactions...")
    # Temporarily override limits to generate 500-800 txns across 60 days
    # ~8-13 per day will yield ~500-800 overall
    generate_synthetic_transactions.MIN_TXNS_PER_DAY = 7
    generate_synthetic_transactions.MAX_TXNS_PER_DAY = 13
    generate_synthetic_transactions.generate()
    print("Demo dataset preparation complete.")

if __name__ == "__main__":
    random.seed(43)
    prepare_demo()
