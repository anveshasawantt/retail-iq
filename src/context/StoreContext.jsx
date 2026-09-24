import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SEED_PRODUCTS, SEED_TRANSACTIONS, SEED_PURCHASE_ORDERS } from "../data/seedData";
import { playBarcodeBeep, playCheckoutSuccess, playErrorBuzz } from "../utils/audio";
import { api } from "../services/api";

const StoreContext = createContext();

const STORAGE_KEYS = {
  PRODUCTS: "retailiq_inr_products_v2",
  TRANSACTIONS: "retailiq_inr_transactions_v2",
  PURCHASE_ORDERS: "retailiq_inr_pos_v2",
  ROLE: "retailiq_inr_role_v2",
};

export function StoreProvider({ children }) {
  // 1. Products state (Indian catalog in INR)
  const [products, setProducts] = useState(SEED_PRODUCTS);

  // 2. Transactions ledger
  const [transactions, setTransactions] = useState(SEED_TRANSACTIONS);

  // 3. Purchase Orders
  const [purchaseOrders, setPurchaseOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PURCHASE_ORDERS);
      return saved ? JSON.parse(saved) : SEED_PURCHASE_ORDERS;
    } catch {
      return SEED_PURCHASE_ORDERS;
    }
  });

  // 4. Active Role ('cashier' or 'manager')
  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
      return saved || "cashier";
    } catch {
      return "cashier";
    }
  });

  // 5. Active POS Cart
  const [cart, setCart] = useState([]);

  // 6. Unknown barcode state
  const [unknownBarcodeScanned, setUnknownBarcodeScanned] = useState(null);

  // 7. Last receipt for modal
  const [lastReceipt, setLastReceipt] = useState(null);

  // 8. API Connectivity, ML Stock-Risk state, and Analytics
  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [stockRiskData, setStockRiskData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Fetch initial data from FastAPI backend
  const refreshStoreData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dbProducts, dbInventory, dbTransactions, dbStockRisk, dbAnalytics] = await Promise.all([
        api.getProducts(0, 500),
        api.getInventory(0, 500),
        api.getTransactions(0, 100),
        api.getStockRisk().catch(() => []),
        api.getAnalytics(30).catch(() => null),
      ]);

      if (Array.isArray(dbStockRisk)) {
        setStockRiskData(dbStockRisk);
      }
      if (dbAnalytics && dbAnalytics.daily_revenue) {
        setAnalyticsData(dbAnalytics);
      }

      const invMap = {};
      if (Array.isArray(dbInventory)) {
        dbInventory.forEach((inv) => {
          invMap[inv.product_id] = inv.quantity_on_hand;
        });
      }

      if (Array.isArray(dbProducts) && dbProducts.length > 0) {
        const mergedProducts = dbProducts.map((p) => ({
          id: p.id,
          barcode: p.barcode,
          sku: `SKU-${p.barcode.slice(-4)}`,
          name: p.name,
          brand: p.brand || "Unbranded",
          category: p.category || "General Staples",
          sellingPrice: Number(p.price) || 0,
          costPrice: p.market_price
            ? Number(p.market_price) * 0.8
            : Math.round(Number(p.price) * 0.75 * 100) / 100,
          currentStock: invMap[p.id] !== undefined ? invMap[p.id] : 0,
          minSafetyStock: p.min_safety_stock || 10,
          supplierLeadTimeDays: p.lead_time_days || 3,
          reorderPackSize: 12,
          supplierName: "Standard Distribution Hub",
          supplierEmail: "dispatch@distribution.in",
          unit: "unit",
        }));
        setProducts(mergedProducts);
      }

      if (Array.isArray(dbTransactions) && dbTransactions.length > 0) {
        const mappedTx = dbTransactions.map((t) => ({
          id: t.invoice_number || `TXN-${t.id}`,
          timestamp: t.created_at,
          cashierName: "Rajesh S. (POS-01)",
          registerId: "POS-01",
          paymentMethod: (t.payment_mode || "upi").toUpperCase(),
          subtotal: Number(t.subtotal),
          tax: Number(t.gst_amount),
          total: Number(t.total),
          discountAmount: Number(t.discount_amount),
          items: (t.items || []).map((item) => ({
            productId: item.product_id,
            barcode: item.barcode,
            name: item.name,
            unitPrice: Number(item.unit_price),
            quantity: item.quantity,
            lineTotal: Number(item.line_total),
          })),
        }));
        setTransactions(mappedTx);
      }

      setApiConnected(true);
    } catch (err) {
      console.warn("FastAPI backend not reachable; operating with seed data fallback:", err.message);
      setApiConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStoreData();
  }, [refreshStoreData]);

  // Sync state to local storage as client backup
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, currentRole);
  }, [currentRole]);

  const switchRole = (newRole) => {
    setCurrentRole(newRole);
  };

  // Add to cart by barcode or SKU or title
  const scanOrAddProduct = (query, requestedQty = 1) => {
    const trimmed = String(query).trim();
    if (!trimmed) return { success: false, reason: "empty" };

    const found = products.find(
      (p) =>
        p.barcode === trimmed ||
        p.sku.toLowerCase() === trimmed.toLowerCase() ||
        p.name.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (!found) {
      playErrorBuzz();
      setUnknownBarcodeScanned(trimmed);

      // Async live lookup on OpenFoodFacts via backend if string looks like barcode
      if (/^\d+$/.test(trimmed)) {
        api
          .lookupExternalBarcode(trimmed)
          .then((ext) => {
            if (ext && ext.found) {
              setUnknownBarcodeScanned({
                barcode: trimmed,
                name: ext.name || "",
                brand: ext.brand || "",
                category: ext.category || "General Staples",
                found: true,
              });
            }
          })
          .catch(() => {});
      }

      return { success: false, reason: "unknown", barcode: trimmed };
    }

    playBarcodeBeep();

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === found.id);
      if (existingIndex > -1) {
        const nextCart = [...prevCart];
        const item = nextCart[existingIndex];
        const newQty = item.quantity + requestedQty;
        nextCart[existingIndex] = {
          ...item,
          quantity: newQty,
          lineTotal: Math.round(newQty * item.unitPrice * (1 - item.discountPercent / 100) * 100) / 100,
        };
        return nextCart;
      } else {
        return [
          ...prevCart,
          {
            product: found,
            quantity: requestedQty,
            unitPrice: found.sellingPrice,
            discountPercent: 0,
            lineTotal: Math.round(requestedQty * found.sellingPrice * 100) / 100,
          },
        ];
      }
    });

    return { success: true, product: found };
  };

  const updateCartQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const lineTotal = Math.round(newQty * item.unitPrice * (1 - item.discountPercent / 100) * 100) / 100;
          return { ...item, quantity: newQty, lineTotal };
        }
        return item;
      })
    );
  };

  const updateCartDiscount = (productId, discountPercent) => {
    const pct = Math.max(0, Math.min(100, Number(discountPercent) || 0));
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const lineTotal = Math.round(item.quantity * item.unitPrice * (1 - pct / 100) * 100) / 100;
          return { ...item, discountPercent: pct, lineTotal };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Process Checkout via FastAPI
  const processCheckout = async ({ paymentMethod = "UPI", cashierName = "Rajesh S. (POS-01)", cashTendered = 0 }) => {
    if (cart.length === 0) return null;

    const subtotal = Math.round(cart.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
    const gstRate = 0.05;
    const tax = Math.round(subtotal * gstRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const changeDue = paymentMethod === "Cash" ? Math.max(0, Math.round((cashTendered - total) * 100) / 100) : 0;

    const cartItemsPayload = cart.map((item) => ({
      barcode: item.product.barcode,
      quantity: item.quantity,
    }));

    try {
      const receipt = await api.checkout(cartItemsPayload, paymentMethod, 0, null);

      const newTransaction = {
        id: receipt.invoice_number,
        timestamp: new Date().toISOString(),
        cashierName,
        registerId: "POS-01",
        paymentMethod,
        subtotal: receipt.subtotal,
        tax: receipt.gst_amount,
        total: receipt.total,
        cashTendered: paymentMethod === "Cash" ? cashTendered : receipt.total,
        changeDue,
        items: receipt.items.map((i) => ({
          barcode: i.barcode,
          name: i.name,
          unitPrice: i.unit_price,
          quantity: i.quantity,
          lineTotal: i.line_total,
        })),
      };

      // Optimistically deduct physical inventory in React state
      setProducts((prevProducts) =>
        prevProducts.map((p) => {
          const cartItem = cart.find((item) => item.product.barcode === p.barcode);
          if (cartItem) {
            const updatedStock = Math.max(0, p.currentStock - cartItem.quantity);
            return { ...p, currentStock: updatedStock };
          }
          return p;
        })
      );

      setTransactions((prevTx) => [newTransaction, ...prevTx]);
      playCheckoutSuccess();
      setLastReceipt(newTransaction);
      setCart([]);

      // Refresh DB data in background to stay in sync
      refreshStoreData();

      return newTransaction;
    } catch (err) {
      console.warn("Checkout via FastAPI failed, using local checkout fallback:", err.message);
      
      // Fallback checkout logic if API server is offline
      const transactionId = `TXN-${Math.floor(10000 + Math.random() * 90000)}`;
      const timestamp = new Date().toISOString();

      const lineItems = cart.map((item) => ({
        productId: item.product.id,
        barcode: item.product.barcode,
        sku: item.product.sku,
        name: item.product.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountPercent: item.discountPercent,
        lineTotal: item.lineTotal,
      }));

      const fallbackTx = {
        id: transactionId,
        timestamp,
        cashierName,
        registerId: "POS-01",
        paymentMethod,
        subtotal,
        tax,
        total,
        cashTendered: paymentMethod === "Cash" ? cashTendered : total,
        changeDue,
        items: lineItems,
      };

      setProducts((prevProducts) =>
        prevProducts.map((p) => {
          const cartItem = cart.find((item) => item.product.id === p.id);
          if (cartItem) {
            const updatedStock = Math.max(0, p.currentStock - cartItem.quantity);
            return { ...p, currentStock: updatedStock };
          }
          return p;
        })
      );

      setTransactions((prevTx) => [fallbackTx, ...prevTx]);
      playCheckoutSuccess();
      setLastReceipt(fallbackTx);
      setCart([]);

      return fallbackTx;
    }
  };

  const adjustProductStock = async (productId, mode, qty, reason = "Manual adjustment") => {
    try {
      if (apiConnected && typeof productId === "number") {
        await api.adjustInventory(productId, mode, qty, reason);
      }
    } catch (err) {
      console.warn("Stock adjustment API failed, applying locally:", err.message);
    }

    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        if (p.id === productId) {
          let nextStock = p.currentStock;
          if (mode === "add") nextStock += qty;
          else if (mode === "deduct") nextStock = Math.max(0, nextStock - qty);
          else if (mode === "set") nextStock = qty;
          return { ...p, currentStock: nextStock };
        }
        return p;
      })
    );
  };

  const addProduct = async (productData) => {
    const payload = {
      barcode: productData.barcode,
      name: productData.name,
      brand: productData.brand || "Unbranded",
      category: productData.category || "Uncategorized",
      sub_category: productData.subCategory || null,
      price: Number(productData.sellingPrice) || 0,
      market_price: Number(productData.costPrice) ? Number(productData.costPrice) * 1.25 : null,
      min_safety_stock: Number(productData.minSafetyStock) || 10,
      lead_time_days: Number(productData.supplierLeadTimeDays) || 3,
      initial_stock: Number(productData.currentStock) || 0,
    };

    try {
      const created = await api.registerProduct(payload);
      const newProductObj = {
        id: created.id,
        barcode: created.barcode,
        sku: productData.sku || `SKU-${created.barcode.slice(-4)}`,
        name: created.name,
        brand: created.brand || "Unbranded",
        category: created.category || "General Staples",
        sellingPrice: Number(created.price),
        costPrice: Number(productData.costPrice) || Math.round(Number(created.price) * 0.75 * 100) / 100,
        currentStock: Number(productData.currentStock) || 0,
        minSafetyStock: created.min_safety_stock,
        supplierLeadTimeDays: created.lead_time_days,
        reorderPackSize: 12,
        supplierName: productData.supplierName || "Standard Distribution Hub",
        supplierEmail: productData.supplierEmail || "dispatch@distribution.in",
        unit: productData.unit || "unit",
      };

      setProducts((prev) => [newProductObj, ...prev]);
      setUnknownBarcodeScanned(null);
      return newProductObj;
    } catch (err) {
      console.warn("Product registration API failed, adding locally:", err.message);
      const newId = `prod-${String(products.length + 1).padStart(3, "0")}`;
      const fallbackProd = {
        id: newId,
        barcode: productData.barcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        sku: productData.sku || `SKU-${Date.now().toString().slice(-4)}`,
        name: productData.name,
        brand: productData.brand || "FMCG Brand",
        category: productData.category || "General Staples",
        sellingPrice: Number(productData.sellingPrice) || 50,
        costPrice: Number(productData.costPrice) || 38,
        currentStock: Number(productData.currentStock) || 15,
        minSafetyStock: Number(productData.minSafetyStock) || 12,
        supplierLeadTimeDays: Number(productData.supplierLeadTimeDays) || 2,
        reorderPackSize: Number(productData.reorderPackSize) || 12,
        supplierName: productData.supplierName || "Standard Distribution Hub",
        supplierEmail: productData.supplierEmail || "dispatch@distribution.in",
        unit: productData.unit || "unit",
      };
      setProducts((prev) => [fallbackProd, ...prev]);
      setUnknownBarcodeScanned(null);
      return fallbackProd;
    }
  };

  const updateProduct = (productId, updatedFields) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updatedFields } : p))
    );
  };

  // Approve Reorder -> Generates PO
  const approveReorder = (product, recommendedQty, supplierNotes = "") => {
    const poId = `PO-${Math.floor(5000 + Math.random() * 4999)}`;
    const cost = Math.round(recommendedQty * product.costPrice * 100) / 100;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + (product.supplierLeadTimeDays || 2));

    const newPO = {
      id: poId,
      productId: product.id,
      createdAt: new Date().toISOString(),
      supplierName: product.supplierName,
      supplierEmail: product.supplierEmail,
      items: [
        {
          productId: product.id,
          name: product.name,
          quantity: recommendedQty,
          unitCost: product.costPrice,
          totalCost: cost,
        },
      ],
      totalCost: cost,
      status: "In Transit",
      expectedDelivery: deliveryDate.toISOString(),
      notes: supplierNotes || `Automated reorder replenishment for ${product.name}.`,
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);
    // Persist PO approval to backend (fire‑and‑forget)
    api.approvePurchaseOrder(poId).catch((err) => {
      console.warn("Failed to approve PO on backend:", err);
    });
    return newPO;
  };

  // Receive stock from purchase order into inventory
  const receivePurchaseOrder = (poId) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po || po.status === "Received") return;

    po.items.forEach((item) => {
      adjustProductStock(item.productId, "add", item.quantity, `Received PO ${poId}`);
    });

    setPurchaseOrders((prevPOs) =>
      prevPOs.map((p) => (p.id === poId ? { ...p, status: "Received", receivedAt: new Date().toISOString() } : p))
    );
  };

  const getActivePOForProduct = (productId) => {
    return purchaseOrders.find(
      (po) => po.status === "In Transit" && po.items.some((i) => i.productId === productId)
    );
  };


  const value = {
    products,
    transactions,
    purchaseOrders,
    currentRole,
    cart,
    unknownBarcodeScanned,
    lastReceipt,
    isLoading,
    apiConnected,
    stockRiskData,
    analyticsData,
    refreshStoreData,
    setUnknownBarcodeScanned,
    setLastReceipt,
    switchRole,
    scanOrAddProduct,
    updateCartQuantity,
    updateCartDiscount,
    removeFromCart,
    clearCart,
    processCheckout,
    adjustProductStock,
    addProduct,
    updateProduct,
    approveReorder,
    receivePurchaseOrder,
    getActivePOForProduct,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
