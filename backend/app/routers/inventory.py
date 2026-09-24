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

import math
import os
from datetime import datetime, timedelta, timezone

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product, Inventory, TransactionItem, Transaction
from ..schemas import InventoryOut, InventoryAdjustRequest, StockRiskOut

router = APIRouter(prefix="/inventory", tags=["inventory"])

# Look-back window for computing average daily sales velocity.
VELOCITY_WINDOW_DAYS = 30

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml_model.joblib")
_ml_artifact = None


def _get_ml_artifact():
    global _ml_artifact
    if not os.path.exists(MODEL_PATH):
        _ml_artifact = None
        return None
    if _ml_artifact is None:
        try:
            _ml_artifact = joblib.load(MODEL_PATH)
        except Exception as e:
            print(f"Warning: Failed to load XGBoost model from {MODEL_PATH}: {e}")
            return None
    return _ml_artifact


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
    Computes stock risk and days until stockout for products.
    Uses XGBoost demand forecasting model if available, falling back
    gracefully to 30-day velocity_baseline if the model is missing or
    if product history is insufficient.
    """
    window_start = datetime.now(timezone.utc) - timedelta(days=VELOCITY_WINDOW_DAYS)

    # 1. Total units sold per product in the 30-day window
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

    # 2. Attempt XGBoost inference
    ml_artifact = _get_ml_artifact()
    xgb_preds = {}
    
    if ml_artifact:
        try:
            model = ml_artifact["model"]
            feature_cols = ml_artifact["feature_cols"]

            # Query line items over last 35 days to construct lags
            tx_data = (
                db.query(
                    TransactionItem.product_id,
                    TransactionItem.quantity,
                    Transaction.created_at,
                )
                .join(Transaction, TransactionItem.transaction_id == Transaction.id)
                .filter(Transaction.created_at >= datetime.now(timezone.utc) - timedelta(days=35))
                .all()
            )

            if tx_data:
                df = pd.DataFrame(
                    [
                        {
                            "product_id": t.product_id,
                            "quantity": t.quantity,
                            "date": t.created_at.date() if isinstance(t.created_at, datetime) else pd.to_datetime(t.created_at).date(),
                        }
                        for t in tx_data
                    ]
                )

                daily = df.groupby(["date", "product_id"])["quantity"].sum().reset_index()
                all_dates = pd.date_range(end=datetime.now(timezone.utc).date(), periods=30, freq="D").date
                all_pids = [prod.id for _, prod, _ in rows]

                grid = pd.MultiIndex.from_product([all_dates, all_pids], names=["date", "product_id"]).to_frame().reset_index(drop=True)
                full = pd.merge(grid, daily, on=["date", "product_id"], how="left")
                full["quantity"] = full["quantity"].fillna(0)

                full["date"] = pd.to_datetime(full["date"])
                full = full.sort_values(["product_id", "date"]).reset_index(drop=True)

                full["lag_1"] = full.groupby("product_id")["quantity"].shift(1)
                full["lag_7"] = full.groupby("product_id")["quantity"].shift(7)
                full["rolling_mean_7"] = full.groupby("product_id")["quantity"].shift(1).rolling(7, min_periods=1).mean()
                full["rolling_mean_14"] = full.groupby("product_id")["quantity"].shift(1).rolling(14, min_periods=1).mean()
                full["rolling_mean_30"] = full.groupby("product_id")["quantity"].shift(1).rolling(30, min_periods=1).mean()

                now_date = pd.to_datetime(datetime.now(timezone.utc).date())
                full["day_of_week"] = now_date.dayofweek
                full["is_weekend"] = 1 if now_date.dayofweek >= 5 else 0
                full["recent_demand_trend"] = full["rolling_mean_7"] / (full["rolling_mean_30"] + 1e-5)

                # Map product attributes
                prod_meta = {p.id: (p.min_safety_stock, p.lead_time_days) for _, p, _ in rows}
                full["min_safety_stock"] = full["product_id"].map(lambda pid: prod_meta.get(pid, (10, 3))[0])
                full["lead_time_days"] = full["product_id"].map(lambda pid: prod_meta.get(pid, (10, 3))[1])

                latest = full.groupby("product_id").last().reset_index()
                X_infer = latest[feature_cols].fillna(0)
                predictions = model.predict(X_infer)
                predictions = np.clip(predictions, 0, None)

                for pid, pred in zip(latest["product_id"], predictions):
                    xgb_preds[pid] = float(pred)
        except Exception as e:
            print(f"Warning: XGBoost inference failed, falling back to velocity baseline: {e}")
            xgb_preds = {}

    results = []
    for inventory, product, total_sold in rows:
        total_sold = total_sold or 0
        daily_velocity = round(total_sold / VELOCITY_WINDOW_DAYS, 2)

        # Decide demand source
        if product.id in xgb_preds and xgb_preds[product.id] is not None:
            predicted_demand = round(xgb_preds[product.id], 2)
            forecast_source = "xgboost"
        else:
            predicted_demand = daily_velocity
            forecast_source = "velocity_baseline"

        # Effective demand for stockout projection
        effective_demand = max(predicted_demand, daily_velocity)

        if effective_demand > 0:
            days_until_stockout = round(inventory.quantity_on_hand / effective_demand, 1)
        else:
            days_until_stockout = None

        if inventory.quantity_on_hand <= product.min_safety_stock or (
            days_until_stockout is not None and days_until_stockout <= product.lead_time_days
        ):
            status = "urgent"
        elif days_until_stockout is not None and days_until_stockout <= product.lead_time_days * 2:
            status = "low_stock"
        else:
            status = "healthy"

        # Reorder recommendation
        effective_lead_time = product.lead_time_days + 2
        target_stock = math.ceil(effective_lead_time * max(effective_demand, 1.0)) + product.min_safety_stock
        deficit = target_stock - inventory.quantity_on_hand
        if deficit > 0:
            recommended_reorder_qty = max(12, int(math.ceil(deficit / 12.0) * 12))
        else:
            recommended_reorder_qty = 0

        results.append(
            StockRiskOut(
                product_id=product.id,
                barcode=product.barcode,
                name=product.name,
                quantity_on_hand=inventory.quantity_on_hand,
                daily_velocity=daily_velocity,
                days_until_stockout=days_until_stockout,
                lead_time_days=product.lead_time_days,
                status=status,
                forecast_source=forecast_source,
                predicted_daily_demand=predicted_demand,
                recommended_reorder_quantity=recommended_reorder_qty,
            )
        )

    # Sort urgent products first
    status_order = {"urgent": 0, "low_stock": 1, "healthy": 2}
    results.sort(key=lambda r: status_order[r.status])
    return results

@router.post("/purchase-orders/{po_id}/approve", response_model=dict)
def approve_purchase_order(po_id: str, db: Session = Depends(get_db)):
    """Approve a purchase order.
    This placeholder updates the status of a purchase order to 'Approved'.
    In a full implementation, it would modify the PurchaseOrder model in the DB.
    """
    # TODO: Update PurchaseOrder status in database
    return {"po_id": po_id, "status": "Approved"}