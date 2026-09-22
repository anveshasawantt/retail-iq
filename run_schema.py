"""
Run schema.sql against your Neon (or any Postgres) database directly.

Usage:
    pip install sqlalchemy psycopg2-binary
    python run_schema.py
"""

from sqlalchemy import create_engine, text

# Paste your Neon connection string here (from the Connection Details panel).
DATABASE_URL = "postgresql://neondb_owner:npg_wmo27OgbLKYI@ep-steep-unit-b3xu8rhn-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

SCHEMA_FILE_PATH = "schema.sql"


def run_schema():
    with open(SCHEMA_FILE_PATH, "r") as f:
        schema_sql = f.read()

    # Split on semicolons so each CREATE TABLE runs as its own statement --
    # some drivers don't like multiple statements sent in a single execute().
    raw_statements = [s.strip() for s in schema_sql.split(";") if s.strip()]

    # Defensive filter: only keep chunks that actually contain a CREATE TABLE.
    # This guards against stray non-SQL text (e.g. a UI title accidentally
    # copy-pasted in) ending up at the top of the file and breaking on the
    # first statement.
    statements = [s for s in raw_statements if "CREATE TABLE" in s.upper()]

    skipped = len(raw_statements) - len(statements)
    if skipped:
        print(f"  (skipped {skipped} non-SQL chunk(s) that weren't CREATE TABLE statements)")

    engine = create_engine(DATABASE_URL)
    with engine.begin() as conn:
        for statement in statements:
            print(f"Running: {statement[:60]}...")
            conn.execute(text(statement))

    print(f"Done. Ran {len(statements)} statements.")


if __name__ == "__main__":
    run_schema()
