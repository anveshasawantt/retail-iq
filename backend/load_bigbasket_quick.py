"""
Load products straight from the raw BigBasket CSV, skipping the
OpenFoodFacts matching step entirely.

WHY
---
merge_bigbasket_openfoodfacts.py can take a long time (rate-limited to
~9 requests/min) to find real barcode matches. But your demo doesn't
actually need real barcodes -- your scanner decodes whatever barcode
image you generate/print yourself and looks that code up in YOUR
products table, so a made-up code works identically to a real
OpenFoodFacts one. This script skips the slow matching step and
generates a placeholder barcode for every product immediately.

You can still run merge_bigbasket_openfoodfacts.py separately (or let
it keep running) if you want a handful of real OpenFoodFacts barcodes
for demoing the /lookup-external endpoint specifically -- the two
scripts don't conflict; re-running load_products_seed.py later just
skips whatever's already in the DB.

USAGE
-----
    python load_bigbasket_quick.py --limit 300

Run from the repo root (same level as requirements.txt / .env).
"""

import argparse
import random

import pandas as pd

from app.database import SessionLocal
from app.models import Product, Inventory

BIGBASKET_CSV_PATH = "../data/BigBasket Products.csv"
DEFAULT_LIMIT = 300
INITIAL_STOCK_MIN = 20
INITIAL_STOCK_MAX = 200
PLACEHOLDER_PREFIX = "INT"


def load(csv_path: str, limit: int, chunk_size: int = 1000):
    df = pd.read_csv(csv_path)
    df = df.rename(columns={"product": "name", "sale_price": "price"})
    df = df.dropna(subset=["name", "price"])
    df["name"] = df["name"].astype(str).str.strip()
    df["brand"] = df.get("brand", "Unbranded")
    df["brand"] = df["brand"].fillna("Unbranded").astype(str).str.strip()
    df["category"] = df.get("category", "Uncategorized")
    df["category"] = df["category"].fillna("Uncategorized").astype(str).str.strip()
    df = df.drop_duplicates(subset=["name", "brand"]).reset_index(drop=True)

    if limit and limit < len(df):
        df = df.sample(n=limit, random_state=42).reset_index(drop=True)

    print(f"Loading {len(df)} product(s) from '{csv_path}'.")

    db = SessionLocal()
    try:
        existing_barcodes = {b for (b,) in db.query(Product.barcode).all()}
        next_placeholder_n = 1

        def next_barcode():
            nonlocal next_placeholder_n
            while True:
                code = f"{PLACEHOLDER_PREFIX}{next_placeholder_n:08d}"
                next_placeholder_n += 1
                if code not in existing_barcodes:
                    return code

        rows = df.to_dict("records")
        total_inserted = 0

        for start in range(0, len(rows), chunk_size):
            chunk = rows[start:start + chunk_size]

            product_dicts = []
            for row in chunk:
                barcode = next_barcode()
                existing_barcodes.add(barcode)
                product_dicts.append({
                    "barcode": barcode,
                    "name": row["name"],
                    "brand": row["brand"],
                    "category": row["category"],
                    "sub_category": row.get("sub_category") or None,
                    "price": float(row["price"]),
                    "market_price": float(row["market_price"]) if row.get("market_price") == row.get("market_price") else None,
                    "rating": float(row["rating"]) if row.get("rating") == row.get("rating") else None,
                    "barcode_source": "generated",
                })

            db.bulk_insert_mappings(Product, product_dicts)
            db.flush()

            barcodes_in_chunk = [p["barcode"] for p in product_dicts]
            id_map = dict(
                db.query(Product.barcode, Product.id)
                .filter(Product.barcode.in_(barcodes_in_chunk))
                .all()
            )
            inventory_dicts = [
                {
                    "product_id": id_map[p["barcode"]],
                    "quantity_on_hand": random.randint(INITIAL_STOCK_MIN, INITIAL_STOCK_MAX),
                }
                for p in product_dicts
            ]
            db.bulk_insert_mappings(Inventory, inventory_dicts)
            db.commit()

            total_inserted += len(product_dicts)
            print(f"  ...{total_inserted}/{len(rows)} loaded")

        print(f"Done. Inserted {total_inserted} product(s) with placeholder barcodes.")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", default=BIGBASKET_CSV_PATH,
                         help=f"Path to the raw BigBasket CSV (default: {BIGBASKET_CSV_PATH})")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT,
                         help=f"How many products to load (default: {DEFAULT_LIMIT})")
    args = parser.parse_args()
    load(args.file, args.limit)
