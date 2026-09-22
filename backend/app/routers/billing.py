"""
Billing / POS checkout -- this is the 'Automated Billing' + 'Inventory
Synchronization' features from your pitch deck: a cashier scans items,
this computes the bill, and stock is decremented automatically the
moment the transaction is recorded.
"""

import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product, Inventory, Transaction, TransactionItem
from ..schemas import (
    CheckoutRequest, ReceiptOut, ReceiptLine,
    TransactionOut, TransactionItemOut,
    AnalyticsOut, DailyRevenue, TopProduct, CategoryBreakdown, SlowMover,
)

router = APIRouter(prefix="/billing", tags=["billing"])

GST_RATE = 0.05  # flat 5%, matching your Cashier POV mockup


def _generate_invoice_number() -> str:
    return f"TXN-{uuid.uuid4().hex[:8].upper()}"


@router.post("/checkout", response_model=ReceiptOut, status_code=201)
def checkout(payload: CheckoutRequest, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # --- Step 1: look up every product and check stock BEFORE committing
    # anything, so a bill never gets partially recorded. ---
    resolved_lines = []
    subtotal = 0.0

    for cart_item in payload.items:
        product = (
            db.query(Product)
            .filter(Product.barcode == cart_item.barcode)
            .first()
        )
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Unknown barcode in cart: {cart_item.barcode}",
            )

        inventory = (
            db.query(Inventory)
            .filter(Inventory.product_id == product.id)
            .first()
        )
        available = inventory.quantity_on_hand if inventory else 0
        if available < cart_item.quantity:
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient stock for {product.name}: "
                       f"requested {cart_item.quantity}, only {available} available",
            )

        line_total = float(product.price) * cart_item.quantity
        subtotal += line_total

        resolved_lines.append(
            {
                "product": product,
                "inventory": inventory,
                "quantity": cart_item.quantity,
                "unit_price": float(product.price),
                "line_total": line_total,
            }
        )

    gst_amount = round(subtotal * GST_RATE, 2)
    total = round(subtotal + gst_amount - payload.discount_amount, 2)

    # --- Step 2: create the transaction + line items ---
    transaction = Transaction(
        invoice_number=_generate_invoice_number(),
        cashier_id=payload.cashier_id,
        subtotal=round(subtotal, 2),
        gst_amount=gst_amount,
        discount_amount=payload.discount_amount,
        total=total,
        payment_mode=payload.payment_mode,
        created_at=datetime.now(timezone.utc),
    )
    db.add(transaction)
    db.flush()  # get transaction.id

    receipt_lines = []
    for line in resolved_lines:
        db.add(
            TransactionItem(
                transaction_id=transaction.id,
                product_id=line["product"].id,
                quantity=line["quantity"],
                unit_price=line["unit_price"],
                line_total=line["line_total"],
            )
        )

        # --- Step 3: this IS the "automatic inventory synchronization" ---
        line["inventory"].quantity_on_hand -= line["quantity"]

        receipt_lines.append(
            ReceiptLine(
                barcode=line["product"].barcode,
                name=line["product"].name,
                quantity=line["quantity"],
                unit_price=line["unit_price"],
                line_total=line["line_total"],
            )
        )

    db.commit()

    return ReceiptOut(
        invoice_number=transaction.invoice_number,
        items=receipt_lines,
        subtotal=round(subtotal, 2),
        gst_amount=gst_amount,
        discount_amount=payload.discount_amount,
        total=total,
        payment_mode=payload.payment_mode,
    )


@router.get("/transactions", response_model=list[TransactionOut])
def list_transactions(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    txs = (
        db.query(Transaction)
        .order_by(Transaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    results = []
    for tx in txs:
        items = (
            db.query(TransactionItem, Product)
            .join(Product, TransactionItem.product_id == Product.id)
            .filter(TransactionItem.transaction_id == tx.id)
            .all()
        )
        item_list = [
            TransactionItemOut(
                product_id=ti.product_id,
                barcode=prod.barcode,
                name=prod.name,
                quantity=ti.quantity,
                unit_price=float(ti.unit_price),
                line_total=float(ti.line_total),
            )
            for ti, prod in items
        ]
        results.append(
            TransactionOut(
                id=tx.id,
                invoice_number=tx.invoice_number,
                subtotal=float(tx.subtotal),
                gst_amount=float(tx.gst_amount),
                discount_amount=float(tx.discount_amount),
                total=float(tx.total),
                payment_mode=tx.payment_mode,
                created_at=tx.created_at,
                items=item_list,
            )
        )
    return results


@router.get("/analytics", response_model=AnalyticsOut)
def get_analytics(period_days: int = 30, db: Session = Depends(get_db)):
    """
    Aggregated analytics for the dashboard charts.
    Returns daily revenue trend, top products, category breakdown, and slow movers.
    All aggregation is done in PostgreSQL — no large dataset sent to the frontend.
    The existing /billing/transactions endpoint is NOT modified.
    """
    window_start = datetime.now(timezone.utc) - timedelta(days=period_days)

    # ── 1. Daily Revenue ────────────────────────────────────────────────────────
    daily_rows = (
        db.query(
            cast(Transaction.created_at, Date).label("day"),
            func.sum(Transaction.total).label("revenue"),
            func.count(Transaction.id).label("tx_count"),
        )
        .filter(Transaction.created_at >= window_start)
        .group_by(cast(Transaction.created_at, Date))
        .order_by(cast(Transaction.created_at, Date))
        .all()
    )
    daily_revenue = [
        DailyRevenue(
            date=str(row.day),
            revenue=round(float(row.revenue), 2),
            transaction_count=int(row.tx_count),
        )
        for row in daily_rows
    ]

    # ── 2. Summary Totals ───────────────────────────────────────────────────────
    total_revenue = sum(d.revenue for d in daily_revenue)
    total_transactions = sum(d.transaction_count for d in daily_revenue)

    # ── 3. Top Products (with category via JOIN) ────────────────────────────────
    top_rows = (
        db.query(
            TransactionItem.product_id,
            Product.name,
            Product.category,
            func.sum(TransactionItem.quantity).label("units_sold"),
            func.sum(TransactionItem.line_total).label("revenue"),
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .join(Product, TransactionItem.product_id == Product.id)
        .filter(Transaction.created_at >= window_start)
        .group_by(TransactionItem.product_id, Product.name, Product.category)
        .order_by(func.sum(TransactionItem.line_total).desc())
        .limit(10)
        .all()
    )
    top_products = [
        TopProduct(
            product_id=row.product_id,
            name=row.name,
            category=row.category,
            units_sold=int(row.units_sold),
            revenue=round(float(row.revenue), 2),
        )
        for row in top_rows
    ]

    # ── 4. Category Breakdown ───────────────────────────────────────────────────
    cat_rows = (
        db.query(
            Product.category,
            func.sum(TransactionItem.quantity).label("units_sold"),
            func.sum(TransactionItem.line_total).label("revenue"),
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .join(Product, TransactionItem.product_id == Product.id)
        .filter(Transaction.created_at >= window_start)
        .filter(Product.category.isnot(None))
        .group_by(Product.category)
        .order_by(func.sum(TransactionItem.line_total).desc())
        .all()
    )
    category_breakdown = [
        CategoryBreakdown(
            category=row.category or "Uncategorized",
            units_sold=int(row.units_sold),
            revenue=round(float(row.revenue), 2),
        )
        for row in cat_rows
        if row.category
    ]

    # ── 5. Slow Movers (velocity = 0 or very low in the window) ────────────────
    # Products that had zero or near-zero sales in the period window
    sold_subq = (
        db.query(TransactionItem.product_id)
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .filter(Transaction.created_at >= window_start)
        .subquery()
    )
    slow_rows = (
        db.query(Product, Inventory)
        .join(Inventory, Inventory.product_id == Product.id)
        .outerjoin(sold_subq, sold_subq.c.product_id == Product.id)
        .filter(sold_subq.c.product_id.is_(None))   # no sales in window
        .filter(Inventory.quantity_on_hand > 0)       # has stock sitting
        .order_by(Inventory.quantity_on_hand.desc())
        .limit(10)
        .all()
    )
    slow_movers = [
        SlowMover(
            product_id=prod.id,
            name=prod.name,
            category=prod.category,
            quantity_on_hand=inv.quantity_on_hand,
            daily_velocity=0.0,
        )
        for prod, inv in slow_rows
    ]

    return AnalyticsOut(
        daily_revenue=daily_revenue,
        top_products=top_products,
        category_breakdown=category_breakdown,
        slow_movers=slow_movers,
        period_days=period_days,
        total_revenue=round(total_revenue, 2),
        total_transactions=total_transactions,
    )

