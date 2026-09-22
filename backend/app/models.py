"""
ORM models mirroring the tables created by schema.sql.
These map Python objects to your existing Postgres tables --
they don't create tables themselves (schema.sql already did that).
"""

from sqlalchemy import (
    Column, Integer, String, Numeric, TIMESTAMP, ForeignKey, CheckConstraint
)
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    contact_email = Column(String(255))
    contact_phone = Column(String(30))
    lead_time_days = Column(Integer, nullable=False, default=3)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    barcode = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    brand = Column(String(120))
    category = Column(String(120))
    sub_category = Column(String(120))
    price = Column(Numeric(10, 2), nullable=False)
    market_price = Column(Numeric(10, 2))
    rating = Column(Numeric(3, 2))
    barcode_source = Column(String(20), default="generated")
    min_safety_stock = Column(Integer, nullable=False, default=10)
    lead_time_days = Column(Integer, nullable=False, default=3)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class Inventory(Base):
    __tablename__ = "inventory"

    product_id = Column(Integer, ForeignKey("products.id"), primary_key=True)
    quantity_on_hand = Column(Integer, nullable=False, default=0)
    last_updated = Column(TIMESTAMP(timezone=True), server_default=func.now())


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    invoice_number = Column(String(30), unique=True, nullable=False)
    cashier_id = Column(Integer, ForeignKey("users.id"))
    subtotal = Column(Numeric(10, 2), nullable=False)
    gst_amount = Column(Numeric(10, 2), nullable=False, default=0)
    discount_amount = Column(Numeric(10, 2), nullable=False, default=0)
    total = Column(Numeric(10, 2), nullable=False)
    payment_mode = Column(String(20), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class TransactionItem(Base):
    __tablename__ = "transaction_items"

    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    line_discount = Column(Numeric(10, 2), nullable=False, default=0)
    line_total = Column(Numeric(10, 2), nullable=False)

    __table_args__ = (CheckConstraint("quantity > 0"),)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    quantity = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    received_at = Column(TIMESTAMP(timezone=True))
