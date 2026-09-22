"""
FastAPI entrypoint. Run with:
    uvicorn app.main:app --reload
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import products, billing, inventory

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