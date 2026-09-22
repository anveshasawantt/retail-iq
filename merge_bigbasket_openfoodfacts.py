"""
Merge the BigBasket product catalog with Open Food Facts barcode data
into a single seed file ready to load into RetailIQ's `products` table.

WHAT THIS DOES
--------------
1. Loads the BigBasket "Entire Product List" CSV (product, category,
   sub_category, brand, sale_price, market_price, rating, ...).
2. For each product, queries the Open Food Facts search API for a
   matching product sold in India, and pulls its barcode if found.
3. Where no OpenFoodFacts match exists, generates a placeholder internal
   barcode so every row still has something scannable in your demo.
4. Writes out data/products_seed.csv, ready for `COPY` / bulk insert
   into Postgres.

BEFORE YOU RUN THIS
--------------------
- pip install pandas requests
- Put the BigBasket CSV at data/BigBasket Products.csv (adjust
  BIGBASKET_CSV_PATH below if your filename differs).
- This calls the public OpenFoodFacts API, which is free but rate-limited
  by convention (be a good citizen: identify your app, don't hammer it).
  Matching all ~27,500 BigBasket products will take hours at a polite
  request rate. For a hackathon demo, matching a subset is enough --
  see SAMPLE_SIZE below.
"""

import csv
import time
import random
import requests
import pandas as pd

# ---------------------------------------------------------------------------
# Config -- adjust these for your run
# ---------------------------------------------------------------------------

BIGBASKET_CSV_PATH = "data/BigBasket Products.csv"
OUTPUT_CSV_PATH = "data/products_seed.csv"
CHECKPOINT_CSV_PATH = "data/products_seed_partial.csv"

# Keep trying products until this many get a REAL OpenFoodFacts barcode.
TARGET_MATCHES = 150

# Safety cap so a bad run can't loop forever if matches are very rare.
MAX_ATTEMPTS = 5000

# OpenFoodFacts asks that API clients identify themselves.
USER_AGENT = "RetailIQ-Hackathon/1.0 (contact: [email protected])"

# OpenFoodFacts documents a hard limit of 10 search requests/min/IP.
# 6.5 seconds between requests keeps us safely under that (~9.2/min)
# even accounting for the occasional fallback second request per product.
MIN_SECONDS_BETWEEN_REQUESTS = 6.5

OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"

# Prefix for placeholder barcodes we invent when no OFF match is found.
# Real EAN-13 barcodes are 13 digits, so this stays clearly out of that
# range while still being scannable as text/Code128 in a demo.
PLACEHOLDER_PREFIX = "INT"


# ---------------------------------------------------------------------------
# Step A: load and clean the BigBasket catalog
# ---------------------------------------------------------------------------

def load_bigbasket(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    # Column names vary slightly across BigBasket CSV re-uploads --
    # normalize the ones we actually need.
    rename_map = {
        "product": "name",
        "sale_price": "price",
        "market_price": "market_price",
        "sub_category": "sub_category",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    required = ["name", "category", "brand", "price"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            f"BigBasket CSV is missing expected columns: {missing}. "
            f"Found columns: {list(df.columns)}"
        )

    # Drop rows with no product name or no price -- not usable in a POS demo.
    df = df.dropna(subset=["name", "price"])
    df["name"] = df["name"].astype(str).str.strip()
    df["brand"] = df["brand"].fillna("Unbranded").astype(str).str.strip()
    df["category"] = df["category"].fillna("Uncategorized").astype(str).str.strip()

    df = df.drop_duplicates(subset=["name", "brand"]).reset_index(drop=True)
    return df


# ---------------------------------------------------------------------------
# Step B: look up a barcode on Open Food Facts for one product
# ---------------------------------------------------------------------------

import re
import difflib

# Matches trailing pack-size text like "(1 Litre)", "500 g", "2x100ml".
_PACK_SIZE_RE = re.compile(
    r"[\(\[]?\s*\d+(\.\d+)?\s?"
    r"(kg|g|gm|gms|ml|l|ltr|litre|litres|pcs|pack|packs|pieces)\b\.?\s*[\)\]]?",
    re.IGNORECASE,
)


def _clean_product_name(name: str) -> str:
    """Strip pack-size/weight text so it doesn't dilute the search query."""
    cleaned = _PACK_SIZE_RE.sub("", name)
    cleaned = re.sub(r"[()\[\]]", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def _similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, a.lower(), b.lower()).ratio()


_last_request_time = 0.0


def _wait_for_rate_limit() -> None:
    """Block until enough time has passed since the last OFF request."""
    global _last_request_time
    elapsed = time.monotonic() - _last_request_time
    remaining = MIN_SECONDS_BETWEEN_REQUESTS - elapsed
    if remaining > 0:
        time.sleep(remaining)
    _last_request_time = time.monotonic()


def _search_openfoodfacts(query: str, restrict_to_india: bool) -> list[dict]:
    params = {
        "search_terms": query,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": 10,
    }
    if restrict_to_india:
        params.update(
            {
                "tagtype_0": "countries",
                "tag_contains_0": "contains",
                "tag_0": "en:india",
            }
        )
    headers = {"User-Agent": USER_AGENT}

    _wait_for_rate_limit()
    try:
        resp = requests.get(OFF_SEARCH_URL, params=params, headers=headers, timeout=10)
        if resp.status_code == 429:
            print("  hit OpenFoodFacts rate limit -- backing off for 60s...")
            time.sleep(60)
            return []
        resp.raise_for_status()
        return resp.json().get("products", [])
    except (requests.RequestException, ValueError) as e:
        print(f"  request failed ({e}), treating as no match")
        return []


def find_barcode_on_openfoodfacts(product_name: str, brand: str) -> str | None:
    """
    Search OpenFoodFacts for a product matching this name, ranking
    candidates by text similarity rather than taking the first hit.
    Falls back to a worldwide search if the India-restricted search
    (which most products aren't tagged for) comes up empty.
    Returns the best matching barcode (the `code` field), or None.
    """
    clean_name = _clean_product_name(product_name)
    query = f"{brand} {clean_name}".strip()
    target = f"{brand} {clean_name}".lower()

    candidates = _search_openfoodfacts(query, restrict_to_india=True)
    if not candidates:
        candidates = _search_openfoodfacts(query, restrict_to_india=False)
    if not candidates:
        return None

    scored = []
    for p in candidates:
        code = p.get("code")
        off_name = f"{p.get('brands', '')} {p.get('product_name', '')}".strip()
        if code and off_name:
            scored.append((_similarity(target, off_name), code))

    if not scored:
        return None

    scored.sort(key=lambda pair: pair[0], reverse=True)
    best_score, best_code = scored[0]

    # Below this, the "match" is usually noise (wrong product entirely).
    MIN_SIMILARITY = 0.35
    return best_code if best_score >= MIN_SIMILARITY else None


# ---------------------------------------------------------------------------
# Step C: enrich the BigBasket dataframe with barcodes
# ---------------------------------------------------------------------------

def enrich_with_barcodes(df: pd.DataFrame, target_matches: int, max_attempts: int) -> pd.DataFrame:
    df = df.copy()
    df["barcode"] = None
    df["barcode_source"] = None

    shuffled_indices = df.index.tolist()
    random.shuffle(shuffled_indices)

    matches_found = 0
    attempts = 0

    for idx in shuffled_indices:
        if matches_found >= target_matches or attempts >= max_attempts:
            break

        attempts += 1
        row = df.loc[idx]
        barcode = find_barcode_on_openfoodfacts(row["name"], row["brand"])

        if barcode:
            df.at[idx, "barcode"] = barcode
            df.at[idx, "barcode_source"] = "openfoodfacts"
            matches_found += 1
            print(f"  match {matches_found}/{target_matches} found "
                  f"(attempt {attempts}): {row['name']}")

        if attempts % 20 == 0:
            elapsed_min = attempts * MIN_SECONDS_BETWEEN_REQUESTS / 60
            print(f"  ...{attempts} attempts so far (~{elapsed_min:.0f} min elapsed), "
                  f"{matches_found} real matches")
            _write_checkpoint(df)

    if matches_found < target_matches:
        print(f"  stopped after {attempts} attempts (safety cap) with only "
              f"{matches_found}/{target_matches} matches -- BigBasket/OFF "
              f"overlap is genuinely limited for the remaining products")

    # Anything left without a real barcode gets a placeholder so every
    # product is still scannable in the demo.
    missing_mask = df["barcode"].isna()
    df.loc[missing_mask, "barcode"] = [
        f"{PLACEHOLDER_PREFIX}{n:08d}" for n in range(missing_mask.sum())
    ]
    df.loc[missing_mask, "barcode_source"] = "generated"

    return df


def _write_checkpoint(df: pd.DataFrame) -> None:
    """Save progress so a long run isn't lost if interrupted."""
    partial = df[df["barcode"].notna()]
    if len(partial):
        write_seed_csv(partial, CHECKPOINT_CSV_PATH)


# ---------------------------------------------------------------------------
# Step D: write the merged seed file
# ---------------------------------------------------------------------------

def write_seed_csv(df: pd.DataFrame, path: str) -> None:
    columns = [
        "barcode",
        "name",
        "brand",
        "category",
        "sub_category" if "sub_category" in df.columns else None,
        "price",
        "market_price" if "market_price" in df.columns else None,
        "rating" if "rating" in df.columns else None,
        "barcode_source",
    ]
    columns = [c for c in columns if c is not None]

    df[columns].to_csv(path, index=False, quoting=csv.QUOTE_MINIMAL)
    print(f"Wrote {len(df)} rows to {path}")


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Loading BigBasket catalog...")
    bigbasket_df = load_bigbasket(BIGBASKET_CSV_PATH)
    print(f"  loaded {len(bigbasket_df)} unique products")

    est_minutes = MAX_ATTEMPTS * MIN_SECONDS_BETWEEN_REQUESTS / 60
    print(f"Enriching with OpenFoodFacts barcodes -- targeting {TARGET_MATCHES} "
          f"real matches (worst case ~{est_minutes:.0f} min if the target isn't "
          f"hit sooner)...")
    merged_df = enrich_with_barcodes(bigbasket_df, TARGET_MATCHES, MAX_ATTEMPTS)

    matched = (merged_df["barcode_source"] == "openfoodfacts").sum()
    print(f"  matched {matched} products to a real OpenFoodFacts barcode")

    write_seed_csv(merged_df, OUTPUT_CSV_PATH)