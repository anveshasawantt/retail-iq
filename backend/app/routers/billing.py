"""
Billing / POS checkout -- this is the 'Automated Billing' + 'Inventory
Synchronization' features from your pitch deck: a cashier scans items,
this computes the bill, and stock is decremented automatically the
moment the transaction is recorded.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product, Inventory, Transaction, TransactionItem
from ..schemas import CheckoutRequest, ReceiptOut, ReceiptLine

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