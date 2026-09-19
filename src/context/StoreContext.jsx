import React, { createContext, useContext, useState, useEffect } from "react";
import { SEED_PRODUCTS, SEED_TRANSACTIONS, SEED_PURCHASE_ORDERS } from "../data/seedData";
import { playBarcodeBeep, playCheckoutSuccess, playErrorBuzz } from "../utils/audio";

const StoreContext = createContext();

const STORAGE_KEYS = {
  PRODUCTS: "apexretail_inr_products_v2",
  TRANSACTIONS: "apexretail_inr_transactions_v2",
  PURCHASE_ORDERS: "apexretail_inr_pos_v2",
  ROLE: "apexretail_inr_role_v2",
};

export function StoreProvider({ children }) {
  // 1. Products state (Indian catalog in INR)
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : SEED_PRODUCTS;
    } catch {
      return SEED_PRODUCTS;
    }
  });

  // 2. Transactions ledger
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return saved ? JSON.parse(saved) : SEED_TRANSACTIONS;
    } catch {
      return SEED_TRANSACTIONS;
    }
  });

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

  // Sync to local storage
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
          lineTotal: Math.round(newQty * item.unitPrice * (1 - item.discountPercent / 100) * 100) / 100
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
            lineTotal: Math.round(requestedQty * found.sellingPrice * 100) / 100
          }
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

  // Process Checkout
  const processCheckout = ({ paymentMethod = "UPI", cashierName = "Rajesh S. (POS-01)", cashTendered = 0 }) => {
    if (cart.length === 0) return null;

    const subtotal = Math.round(cart.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
    const gstRate = 0.05; // 5% GST on packaged grocery items
    const tax = Math.round(subtotal * gstRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const changeDue = paymentMethod === "Cash" ? Math.max(0, Math.round((cashTendered - total) * 100) / 100) : 0;

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
      lineTotal: item.lineTotal
    }));

    const newTransaction = {
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
      items: lineItems
    };

    // Deduct physical inventory
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

    setTransactions((prevTx) => [newTransaction, ...prevTx]);
    playCheckoutSuccess();
    setLastReceipt(newTransaction);
    setCart([]);

    return newTransaction;
  };

  const adjustProductStock = (productId, delta, reason = "Manual adjustment") => {
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        if (p.id === productId) {
          const nextStock = Math.max(0, p.currentStock + Number(delta));
          return { ...p, currentStock: nextStock };
        }
        return p;
      })
    );
  };

  const addProduct = (productData) => {
    const newId = `prod-${String(products.length + 1).padStart(3, "0")}`;
    const newProduct = {
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
      description: productData.description || ""
    };

    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
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
          totalCost: cost
        }
      ],
      totalCost: cost,
      status: "In Transit",
      expectedDelivery: deliveryDate.toISOString(),
      notes: supplierNotes || `Automated reorder replenishment for ${product.name}.`
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);
    return newPO;
  };

  // Receive stock from purchase order into inventory
  const receivePurchaseOrder = (poId) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po || po.status === "Received") return;

    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const item = po.items.find((i) => i.productId === prod.id);
        if (item) {
          return { ...prod, currentStock: prod.currentStock + item.quantity };
        }
        return prod;
      })
    );

    setPurchaseOrders((prevPOs) =>
      prevPOs.map((p) => (p.id === poId ? { ...p, status: "Received", receivedAt: new Date().toISOString() } : p))
    );
  };

  // Check if a product currently has an active in-transit PO
  const getActivePOForProduct = (productId) => {
    return purchaseOrders.find(
      (po) => po.status === "In Transit" && po.items.some((i) => i.productId === productId)
    );
  };

  const resetToSeedData = () => {
    setProducts(SEED_PRODUCTS);
    setTransactions(SEED_TRANSACTIONS);
    setPurchaseOrders(SEED_PURCHASE_ORDERS);
    setCart([]);
    setLastReceipt(null);
    setUnknownBarcodeScanned(null);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.PURCHASE_ORDERS);
  };

  const value = {
    products,
    transactions,
    purchaseOrders,
    currentRole,
    cart,
    unknownBarcodeScanned,
    lastReceipt,
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
    resetToSeedData
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
