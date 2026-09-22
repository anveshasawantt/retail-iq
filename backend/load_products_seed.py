"""
Load data/products_seed.csv into `products` + `inventory` — batched.

WHY A REWRITE
-------------
The original version added one Product at a time and flushed after each
one to get its auto-generated id (needed for the matching Inventory
row) -- that's one network round-trip per product. Against a remote
Neon database, with products_seed.csv covering the *entire* BigBasket
catalog (~27,500 rows, not just the ~150 with real OpenFoodFacts
barcodes -- the rest get placeholder barcodes), that's ~27,500 round
trips just for products, then another ~27,500 for inventory. That's
what was taking so long.

This version processes CHUNK_SIZE rows at a time:
  1. bulk_insert_mappings() all Products in the chunk (1 round-trip)
  2. one SELECT to get back the ids Postgres just assigned (1 round-trip)
  3. bulk_insert_mappings() all matching Inventory rows (1 round-trip)
  4. commit
So ~27,500 rows becomes ~3 round-trips per 1000 rows, instead of 2
round-trips per single row -- roughly a 300x reduction in round-trips.

Still safe to re-run / resume: it still skips any barcode already in
the DB, so if you interrupt it partway through, running it again picks
up where it left off instead of duplicating anything.

USAGE
-----
    python load_products_seed.py
    python load_products_seed.py --file ../data/products_seed.csv
    python load_products_seed.py --file ../data/products_seed.csv --chunk-size 2000

Run from the repo root (same level as requirements.txt / .env).
"""

import argparse
import csv
import os
import random

from app.database import SessionLocal
from app.models import Product, Inventory

DEFAULT_CSV_PATH = "data/products_seed.csv"
FALLBACK_CSV_PATH = "data/products_seed_partial.csv"

DEFAULT_CHUNK_SIZE = 1000
INITIAL_STOCK_MIN = 20
INITIAL_STOCK_MAX = 200


def _to_float(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def load(csv_path: str, chunk_size: int):
    if not os.path.exists(csv_path):
        print(f"'{csv_path}' not found.")
        if csv_path == DEFAULT_CSV_PATH and os.path.exists(FALLBACK_CSV_PATH):
            print(f"Found '{FALLBACK_CSV_PATH}' instead — re-run with: "
                  f"python load_products_seed.py --file {FALLBACK_CSV_PATH}")
        return

    with open(csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    print(f"Read {len(rows)} row(s) from '{csv_path}'.")

    db = SessionLocal()
    try:
        existing_barcodes = {b for (b,) in db.query(Product.barcode).all()}
        print(f"{len(existing_barcodes)} product(s) already in the DB — those will be skipped.")

        total_inserted = 0
        total_skipped = 0

        for start in range(0, len(rows), chunk_size):
            chunk = rows[start:start + chunk_size]

            product_dicts = []
            seen_in_chunk = set()

            for row in chunk:
                barcode = (row.get("barcode") or "").strip()
                name = (row.get("name") or "").strip()
                price = _to_float(row.get("price"))

                if not barcode or not name or price is None:
                    total_skipped += 1
                    continue
                if barcode in existing_barcodes or barcode in seen_in_chunk:
                    total_skipped += 1
                    continue

                product_dicts.append({
                    "barcode": barcode,
                    "name": name,
                    "brand": row.get("brand") or "Unbranded",
                    "category": row.get("category") or "Uncategorized",
                    "sub_category": row.get("sub_category") or None,
                    "price": price,
                    "market_price": _to_float(row.get("market_price")),
                    "rating": _to_float(row.get("rating")),
                    "barcode_source": row.get("barcode_source") or "generated",
                })
                seen_in_chunk.add(barcode)

            if not product_dicts:
                continue

            # 1 round-trip: insert every product in this chunk at once.
            db.bulk_insert_mappings(Product, product_dicts)
            db.flush()

            # 1 round-trip: get back the ids Postgres just assigned.
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
                if p["barcode"] in id_map
            ]

            # 1 round-trip: insert every inventory row in this chunk at once.
            db.bulk_insert_mappings(Inventory, inventory_dicts)
            db.commit()

            existing_barcodes.update(barcodes_in_chunk)
            total_inserted += len(product_dicts)
            print(f"  ...{total_inserted} inserted so far "
                  f"({start + len(chunk)}/{len(rows)} rows processed)")

        print(f"Done. Inserted {total_inserted} new product(s), skipped {total_skipped} "
              f"(already in DB or missing required fields).")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", default=DEFAULT_CSV_PATH,
                         help=f"Path to the seed CSV (default: {DEFAULT_CSV_PATH})")
    parser.add_argument("--chunk-size", type=int, default=DEFAULT_CHUNK_SIZE,
                         help=f"Rows per batch (default: {DEFAULT_CHUNK_SIZE})")
    args = parser.parse_args()
    load(args.file, args.chunk_size)