"""
FastAPI entrypoint. Run with:
    uvicorn app.main:app --reload
"""

import os
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware

from .routers import products, billing, inventory
from .database import get_db
from .models import Product, Inventory, Transaction, TransactionItem, PurchaseOrder

app = FastAPI(title="RetailIQ API")

default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://retail-iq-inky.vercel.app",
]

env_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
allowed_origins = list(set(default_origins + env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(billing.router)
app.include_router(inventory.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "RetailIQ API"}

class ResetPayload(BaseModel):
    products: List[Dict[str, Any]]
    transactions: List[Dict[str, Any]]
    purchaseOrders: List[Dict[str, Any]]

@app.post("/reset")
def reset_data(payload: ResetPayload, db: Session = Depends(get_db)):
    # Safely clear existing data
    db.query(TransactionItem).delete()
    db.query(Transaction).delete()
    db.query(PurchaseOrder).delete()
    db.query(Inventory).delete()
    db.query(Product).delete()
    db.commit()

    # Re-seed products & inventory
    frontend_id_to_db_id = {}
    for p in payload.products:
        prod = Product(
            barcode=p["barcode"],
            name=p["name"],
            brand=p.get("brand", "Unbranded"),
            category=p.get("category", "Uncategorized"),
            price=p.get("sellingPrice", 0),
            market_price=p.get("costPrice", 0),
            min_safety_stock=p.get("minSafetyStock", 10),
            lead_time_days=p.get("supplierLeadTimeDays", 3),
        )
        db.add(prod)
        db.flush()
        
        # Keep track of mapping for Purchase Orders
        frontend_id_to_db_id[p.get("id")] = prod.id

        inv = Inventory(
            product_id=prod.id,
            quantity_on_hand=p.get("currentStock", 0)
        )
        db.add(inv)
        
    # Re-seed Purchase Orders
    for po in payload.purchaseOrders:
        db_product_id = frontend_id_to_db_id.get(po.get("productId"))
        if not db_product_id:
            continue
            
        status_map = {
            "In Transit": "in_transit",
            "Received": "received",
            "Pending": "pending",
            "Approved": "approved"
        }
        db_status = status_map.get(po.get("status"), "pending")
        
        created_at = datetime.utcnow()
        if po.get("createdAt"):
            try:
                created_at = datetime.fromisoformat(po["createdAt"].replace("Z", "+00:00"))
            except ValueError:
                pass

        quantity = 1
        if po.get("items") and len(po["items"]) > 0:
            quantity = po["items"][0].get("quantity", 1)

        db_po = PurchaseOrder(
            product_id=db_product_id,
            quantity=quantity,
            status=db_status,
            created_at=created_at
        )
        db.add(db_po)
        
    # Re-seed transactions
    for t in payload.transactions:
        # handle ISO datetime correctly
        created_at = datetime.utcnow()
        if t.get("timestamp"):
            try:
                # Handle standard ISO and replace Z with +00:00 for python fromisoformat
                created_at = datetime.fromisoformat(t["timestamp"].replace("Z", "+00:00"))
            except ValueError:
                pass

        txn = Transaction(
            invoice_number=t["id"],
            subtotal=t.get("subtotal", 0),
            gst_amount=t.get("tax", 0),
            discount_amount=t.get("discountAmount", 0),
            total=t.get("total", 0),
            payment_mode=t.get("paymentMethod", "cash").lower(),
            created_at=created_at
        )
        db.add(txn)
        db.flush()

        for item in t.get("items", []):
            prod = db.query(Product).filter(Product.barcode == item["barcode"]).first()
            if prod:
                t_item = TransactionItem(
                    transaction_id=txn.id,
                    product_id=prod.id,
                    quantity=item.get("quantity", 1),
                    unit_price=item.get("unitPrice", 0),
                    line_total=item.get("lineTotal", 0),
                )
                db.add(t_item)
                
    db.commit()
    return {"status": "ok", "message": "Database successfully reset to seed state"}