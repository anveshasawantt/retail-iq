"""
Product endpoints -- barcode lookup is the core of your Cashier POS flow:
scan -> look up here -> add to cart. When a barcode isn't in our own
database, lookup-external checks OpenFoodFacts live, and the staff
confirms/edits the details via the register endpoint.
"""

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product, Inventory
from ..schemas import ProductOut, ExternalProductLookup, ProductCreate

router = APIRouter(prefix="/products", tags=["products"])

OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
OFF_USER_AGENT = "RetailIQ-Hackathon/1.0 (contact: [email protected])"


@router.get("/", response_model=list[ProductOut])
def list_products(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Product).offset(skip).limit(limit).all()


@router.get("/barcode/{barcode}", response_model=ProductOut)
def get_product_by_barcode(barcode: str, db: Session = Depends(get_db)):
    """Look up a barcode in OUR OWN database -- this is the fast path
    used every time a cashier scans a known product."""
    product = db.query(Product).filter(Product.barcode == barcode).first()
    if not product:
        raise HTTPException(
            status_code=404,
            detail="Unknown barcode -- try /products/lookup-external/{barcode} "
                   "to check OpenFoodFacts, then register it.",
        )
    return product


@router.get("/lookup-external/{barcode}", response_model=ExternalProductLookup)
def lookup_external(barcode: str):
    """
    Called only when get_product_by_barcode returns 404 -- this is a
    single direct barcode lookup on OpenFoodFacts (not a search), so it's
    fast and cheap: it's the live equivalent of what the merge script
    does in bulk offline.
    """
    try:
        resp = requests.get(
            OFF_PRODUCT_URL.format(barcode=barcode),
            headers={"User-Agent": OFF_USER_AGENT},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException:
        return ExternalProductLookup(barcode=barcode, found=False)

    if data.get("status") != 1:  # OFF's convention for "not found"
        return ExternalProductLookup(barcode=barcode, found=False)

    product = data.get("product", {})
    return ExternalProductLookup(
        barcode=barcode,
        name=product.get("product_name") or None,
        brand=product.get("brands") or None,
        category=(product.get("categories") or "").split(",")[0] or None,
        found=True,
    )


@router.post("/", response_model=ProductOut, status_code=201)
def register_product(payload: ProductCreate, db: Session = Depends(get_db)):
    """
    Staff-confirmed product registration -- called after lookup-external
    (auto-filled) or after manual entry (barcode genuinely unknown
    anywhere, e.g. loose produce). This is what the 'Register New
    Product SKU' screen submits.
    """
    existing = db.query(Product).filter(Product.barcode == payload.barcode).first()
    if existing:
        raise HTTPException(status_code=409, detail="Barcode already registered")

    product = Product(
        barcode=payload.barcode,
        name=payload.name,
        brand=payload.brand,
        category=payload.category,
        sub_category=payload.sub_category,
        price=payload.price,
        market_price=payload.market_price,
        min_safety_stock=payload.min_safety_stock,
        lead_time_days=payload.lead_time_days,
        barcode_source="manual",
    )
    db.add(product)
    db.flush()  # get product.id before creating the inventory row

    inventory = Inventory(product_id=product.id, quantity_on_hand=payload.initial_stock)
    db.add(inventory)

    db.commit()
    db.refresh(product)
    return product