-- RetailIQ database schema
-- Run this against a fresh Postgres database, e.g.:
--   psql -U your_user -d retailiq -f schema.sql

-- ---------------------------------------------------------------------------
-- Users & roles (owner / cashier / inventory manager, per your mockups)
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(30) NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'inventory_manager')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------------

CREATE TABLE suppliers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(30),
    lead_time_days  INTEGER NOT NULL DEFAULT 3,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Products -- this is what products_seed.csv loads into
-- ---------------------------------------------------------------------------

CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    barcode         VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    brand           VARCHAR(120),
    category        VARCHAR(120),
    sub_category    VARCHAR(120),
    price           NUMERIC(10, 2) NOT NULL,
    market_price    NUMERIC(10, 2),
    rating          NUMERIC(3, 2),
    barcode_source  VARCHAR(20) DEFAULT 'generated', -- 'openfoodfacts' | 'generated'
    min_safety_stock INTEGER NOT NULL DEFAULT 10,
    lead_time_days  INTEGER NOT NULL DEFAULT 3,
    supplier_id     INTEGER REFERENCES suppliers(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);

-- ---------------------------------------------------------------------------
-- Inventory -- current on-hand stock per product
-- ---------------------------------------------------------------------------

CREATE TABLE inventory (
    product_id      INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Transactions -- one row per completed bill
-- ---------------------------------------------------------------------------

CREATE TABLE transactions (
    id              SERIAL PRIMARY KEY,
    invoice_number  VARCHAR(30) UNIQUE NOT NULL,
    cashier_id      INTEGER REFERENCES users(id),
    subtotal        NUMERIC(10, 2) NOT NULL,
    gst_amount      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total           NUMERIC(10, 2) NOT NULL,
    payment_mode    VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash', 'card', 'upi')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- ---------------------------------------------------------------------------
-- Transaction line items -- one row per product scanned in a bill
-- ---------------------------------------------------------------------------

CREATE TABLE transaction_items (
    id              SERIAL PRIMARY KEY,
    transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(id),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(10, 2) NOT NULL,
    line_discount   NUMERIC(10, 2) NOT NULL DEFAULT 0,
    line_total      NUMERIC(10, 2) NOT NULL
);

CREATE INDEX idx_transaction_items_product_id ON transaction_items(product_id);
CREATE INDEX idx_transaction_items_transaction_id ON transaction_items(transaction_id);

-- ---------------------------------------------------------------------------
-- Purchase orders -- reorder recommendations that get approved/received
-- ---------------------------------------------------------------------------

CREATE TABLE purchase_orders (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id),
    supplier_id     INTEGER REFERENCES suppliers(id),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'received')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_at     TIMESTAMPTZ
);
