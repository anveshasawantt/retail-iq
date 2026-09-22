"""
Pydantic schemas -- these define what the API returns as JSON,
separate from the ORM models which define the DB table structure.
"""

from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class ProductOut(BaseModel):
    id: int
    barcode: str
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    price: float
    market_price: Optional[float] = None
    rating: Optional[float] = None
    lead_time_days: int
    min_safety_stock: int

    class Config:
        from_attributes = True  # lets this read directly from ORM objects


class ExternalProductLookup(BaseModel):
    """What we hand back from a live OpenFoodFacts barcode lookup,
    for staff to review/edit before confirming registration."""
    barcode: str
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    found: bool


class ProductCreate(BaseModel):
    """What the 'Register New Product SKU' screen submits once staff
    confirm (or correct) the auto-filled details."""
    barcode: str
    name: str
    brand: Optional[str] = "Unbranded"
    category: Optional[str] = "Uncategorized"
    sub_category: Optional[str] = None
    price: float
    market_price: Optional[float] = None
    min_safety_stock: int = 10
    lead_time_days: int = 3
    initial_stock: int = 0


class CartItem(BaseModel):
    barcode: str
    quantity: int


class CheckoutRequest(BaseModel):
    items: list[CartItem]
    payment_mode: str  # "cash" | "card" | "upi"
    discount_amount: float = 0
    cashier_id: Optional[int] = None


class ReceiptLine(BaseModel):
    barcode: str
    name: str
    quantity: int
    unit_price: float
    line_total: float


class ReceiptOut(BaseModel):
    invoice_number: str
    items: list[ReceiptLine]
    subtotal: float
    gst_amount: float
    discount_amount: float
    total: float
    payment_mode: str


class InventoryOut(BaseModel):
    product_id: int
    barcode: str
    name: str
    quantity_on_hand: int
    min_safety_stock: int

    class Config:
        from_attributes = True


class InventoryAdjustRequest(BaseModel):
    mode: str  # "add" | "deduct" | "set"
    quantity: int
    reason: Optional[str] = None


class StockRiskOut(BaseModel):
    product_id: int
    barcode: str
    name: str
    quantity_on_hand: int
    daily_velocity: float
    days_until_stockout: Optional[float] = None  # None means "not selling / can't project"
    lead_time_days: int
    status: str  # "urgent" | "low_stock" | "healthy"
    forecast_source: Optional[str] = "velocity_baseline"  # "xgboost" | "velocity_baseline"
    predicted_daily_demand: Optional[float] = None
    recommended_reorder_quantity: Optional[int] = None



class TransactionItemOut(BaseModel):
    product_id: int
    barcode: str
    name: str
    quantity: int
    unit_price: float
    line_total: float

    class Config:
        from_attributes = True



class TransactionOut(BaseModel):
    id: int
    invoice_number: str
    subtotal: float
    gst_amount: float
    discount_amount: float
    total: float
    payment_mode: str
    created_at: datetime
    items: list[TransactionItemOut]

    class Config:
        from_attributes = True


# ── Analytics Schemas ──────────────────────────────────────────────────────────

class DailyRevenue(BaseModel):
    date: str          # ISO date string "YYYY-MM-DD"
    revenue: float
    transaction_count: int


class TopProduct(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = None
    units_sold: int
    revenue: float


class CategoryBreakdown(BaseModel):
    category: str
    units_sold: int
    revenue: float


class SlowMover(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = None
    quantity_on_hand: int
    daily_velocity: float


class AnalyticsOut(BaseModel):
    daily_revenue: list[DailyRevenue]
    top_products: list[TopProduct]
    category_breakdown: list[CategoryBreakdown]
    slow_movers: list[SlowMover]
    period_days: int
    total_revenue: float
    total_transactions: int
