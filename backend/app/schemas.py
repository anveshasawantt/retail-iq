"""
Pydantic schemas -- these define what the API returns as JSON,
separate from the ORM models which define the DB table structure.
"""

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