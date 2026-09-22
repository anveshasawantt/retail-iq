"""
FastAPI entrypoint. Run with:
    uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import products, billing, inventory

app = FastAPI(title="RetailIQ API")

# Allow your Vercel-hosted frontend to call this API.
# Add your real deployed frontend URL once you have one, alongside localhost
# for local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://retail-iq-inky.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(billing.router)
app.include_router(inventory.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "RetailIQ API"}