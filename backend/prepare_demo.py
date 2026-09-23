import csv
import random
import os
from collections import defaultdict

from app.database import SessionLocal
from app.models import Product, Inventory, Transaction, TransactionItem, PurchaseOrder
from generate_synthetic_transactions import generate

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

        # Group by category
        by_category = defaultdict(list)
        for r in rows:
            cat = (r.get("category") or "Uncategorized").strip()
            if cat:
                by_category[cat].append(r)

        # We want ~400 products.
        target_total = 400
        # Filter to categories with at least 15 products
        valid_cats = [c for c, items in by_category.items() if len(items) >= 15]
        
        # Pick 20 categories, 20 items each = 400
        chosen_cats = random.sample(valid_cats, min(20, len(valid_cats)))
        items_per_cat = target_total // len(chosen_cats)
        
        chosen_products = []
        for c in chosen_cats:
            chosen_products.extend(random.sample(by_category[c], items_per_cat))

        # Fill any remainder (due to rounding)
        remainder = target_total - len(chosen_products)
        if remainder > 0:
            remaining_pool = [r for c in chosen_cats for r in by_category[c] if r not in chosen_products]
            chosen_products.extend(random.sample(remaining_pool, remainder))

        print(f"Selected {len(chosen_products)} products across {len(chosen_cats)} categories.")

        # Insert products
        product_dicts = []
        seen = set()
        for r in chosen_products:
            barcode = (r.get("barcode") or "").strip()
            name = (r.get("name") or "").strip()
            price = _to_float(r.get("price"))
            
            if not barcode or not name or price is None or barcode in seen:
                continue
            seen.add(barcode)
            
            product_dicts.append({
                "barcode": barcode,
                "name": name,
                "brand": r.get("brand") or "Unbranded",
                "category": r.get("category") or "Uncategorized",
                "sub_category": r.get("sub_category") or None,
                "price": price,
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

        inventory_dicts = []
        for i, p in enumerate(product_dicts):
            # Make ~5% zero stock, ~10% low stock (1-5), rest healthy (20-100)
            rand = random.random()
            if rand < 0.05:
                qty = 0
            elif rand < 0.15:
                qty = random.randint(1, 5)
            else:
                qty = random.randint(20, 100)
                
            inventory_dicts.append({
                "product_id": id_map[p["barcode"]],
                "quantity_on_hand": qty,
            })

        db.bulk_insert_mappings(Inventory, inventory_dicts)
        db.commit()
        print(f"Inserted {len(product_dicts)} products and inventory records.")

    finally:
        db.close()

    print("Generating synthetic transactions...")
    generate()
    print("Demo dataset preparation complete.")

if __name__ == "__main__":
    random.seed(42)
    prepare_demo()
