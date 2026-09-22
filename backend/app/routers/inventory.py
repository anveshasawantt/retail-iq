"""
Inventory endpoints -- powers the Manager Dashboard's inventory table,
the manual "Inventory Adjustment" screen, and the "Predictive Stock-Out
Threat Radar" / stock-risk detection feature.

Note: stock-risk detection needs sales history in `transaction_items` to
compute a real velocity. Until your database has real transactions
flowing through /billing/checkout, every product will show
daily_velocity = 0 and status = "healthy" (or "urgent" if already below
safety stock) -- that's expected, not a bug. Run a few test checkouts
once products are loaded to see risk scoring actually differentiate.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product, Inventory, TransactionItem, Transaction
from ..schemas import InventoryOut, InventoryAdjustRequest, StockRiskOut

router = APIRouter(prefix="/inventory", tags=["inventory"])

# Look-back window for computing average daily sales velocity.
VELOCITY_WINDOW_DAYS = 30


@router.get("/", response_model=list[InventoryOut])
def list_inventory(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    rows = (
        db.query(Inventory, Product)
        .join(Product, Inventory.product_id == Product.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        InventoryOut(
            product_id=product.id,
            barcode=product.barcode,
            name=product.name,
            quantity_on_hand=inv.quantity_on_hand,
            min_safety_stock=product.min_safety_stock,
        )
        for inv, product in rows
    ]


@router.post("/{product_id}/adjust", response_model=InventoryOut)
def adjust_inventory(
    product_id: int, payload: InventoryAdjustRequest, db: Session = Depends(get_db)
):
    """
    Matches the 'Inventory Adjustment' screen: managers can add, deduct,
    or set stock directly, with a reason logged (reason isn't persisted
    to its own table yet -- add an inventory_adjustments table later if
    you want an audit trail for your submission's 'measurable evaluation'
    section).
    """
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    product = db.query(Product).filter(Product.id == product_id).first()
    if not inventory or not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if payload.mode == "add":
        inventory.quantity_on_hand += payload.quantity
    elif payload.mode == "deduct":
        inventory.quantity_on_hand = max(0, inventory.quantity_on_hand - payload.quantity)
    elif payload.mode == "set":
        inventory.quantity_on_hand = payload.quantity
    else:
        raise HTTPException(status_code=400, detail="mode must be 'add', 'deduct', or 'set'")

    db.commit()
    db.refresh(inventory)

    return InventoryOut(
        product_id=product.id,
        barcode=product.barcode,
        name=product.name,
        quantity_on_hand=inventory.quantity_on_hand,
        min_safety_stock=product.min_safety_stock,
    )


@router.get("/stock-risk", response_model=list[StockRiskOut])
def stock_risk(db: Session = Depends(get_db)):
    """
    For each product: compute average daily sales velocity over the last
    VELOCITY_WINDOW_DAYS, project days until stock-out, and classify:
      - urgent: at/below min_safety_stock already, OR will run out
                before the supplier's lead time can replenish it
      - low_stock: will run out within 2x lead time
      - healthy: everything else
    This is a simple baseline -- swap in the XGBoost forecast from your
    pitch deck later; this endpoint's shape won't need to change, just
    how daily_velocity gets computed.
    """
    window_start = datetime.now(timezone.utc) - timedelta(days=VELOCITY_WINDOW_DAYS)

    # Total units sold per product in the window.
    velocity_subquery = (
        db.query(
            TransactionItem.product_id.label("product_id"),
            func.sum(TransactionItem.quantity).label("total_sold"),
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .filter(Transaction.created_at >= window_start)
        .group_by(TransactionItem.product_id)
        .subquery()
    )

    rows = (
        db.query(Inventory, Product, velocity_subquery.c.total_sold)
        .join(Product, Inventory.product_id == Product.id)
        .outerjoin(velocity_subquery, velocity_subquery.c.product_id == Product.id)
        .all()
    )

    results = []
    for inventory, product, total_sold in rows:
        total_sold = total_sold or 0
        daily_velocity = total_sold / VELOCITY_WINDOW_DAYS

        if daily_velocity > 0:
            days_until_stockout = inventory.quantity_on_hand / daily_velocity
        else:
            days_until_stockout = None  # not selling -- can't project a stock-out date

        if inventory.quantity_on_hand <= product.min_safety_stock or (
            days_until_stockout is not None and days_until_stockout <= product.lead_time_days
        ):
            status = "urgent"
        elif days_until_stockout is not None and days_until_stockout <= product.lead_time_days * 2:
            status = "low_stock"
        else:
            status = "healthy"

        results.append(
            StockRiskOut(
                product_id=product.id,
                barcode=product.barcode,
                name=product.name,
                quantity_on_hand=inventory.quantity_on_hand,
                daily_velocity=round(daily_velocity, 2),
                days_until_stockout=round(days_until_stockout, 1) if days_until_stockout else None,
                lead_time_days=product.lead_time_days,
                status=status,
            )
        )

    # Show the most urgent products first -- matches your dashboard's
    # "Predictive Stock-Out Threat Radar" ordering.
    status_order = {"urgent": 0, "low_stock": 1, "healthy": 2}
    results.sort(key=lambda r: status_order[r.status])
    return results