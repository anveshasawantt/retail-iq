const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      // Ignore JSON parse error on non-JSON response
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

export const api = {
  // Products
  getProducts: (skip = 0, limit = 200) => request(`/products/?skip=${skip}&limit=${limit}`),
  getProductByBarcode: (barcode) => request(`/products/barcode/${encodeURIComponent(barcode)}`),
  lookupExternalBarcode: (barcode) => request(`/products/lookup-external/${encodeURIComponent(barcode)}`),
  registerProduct: (productData) =>
    request("/products/", {
      method: "POST",
      body: JSON.stringify(productData),
    }),

  // Inventory
  getInventory: (skip = 0, limit = 200) => request(`/inventory/?skip=${skip}&limit=${limit}`),
  adjustInventory: (productId, mode, quantity, reason) =>
    request(`/inventory/${productId}/adjust`, {
      method: "POST",
      body: JSON.stringify({ mode, quantity, reason }),
    }),
  getStockRisk: () => request("/inventory/stock-risk"),

  // Billing
  checkout: (items, paymentMode, discountAmount = 0, cashierId = null) =>
    request("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({
        items,
        payment_mode: paymentMode.toLowerCase(),
        discount_amount: discountAmount,
        cashier_id: cashierId,
      }),
    }),
  getTransactions: (skip = 0, limit = 200) => request(`/billing/transactions?skip=${skip}&limit=${limit}`),
  getAnalytics: (periodDays = 30) => request(`/billing/analytics?period_days=${periodDays}`),
  
  // Data reset
  resetData: (payload) =>
    request("/reset", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

