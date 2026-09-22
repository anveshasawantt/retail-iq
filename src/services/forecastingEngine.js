/**
 * Forecasting & Reorder Engine
 * Client-side analytical model for inventory velocity, runout estimation,
 * and automated purchase order recommendations.
 * 
 * Rules: Strictly avoid em dashes in generated strings. Use hyphens or arrows.
 */

export function calculateProductVelocity(productId, transactions, daysWindow = 7) {
  const now = new Date();
  const windowStart = new Date();
  windowStart.setDate(now.getDate() - daysWindow);

  let totalSoldInWindow = 0;
  
  transactions.forEach(tx => {
    const txDate = new Date(tx.timestamp);
    if (txDate >= windowStart) {
      tx.items.forEach(item => {
        if (item.productId === productId) {
          totalSoldInWindow += item.quantity;
        }
      });
    }
  });

  // Calculate units per day
  const rawVelocity = totalSoldInWindow / Math.max(1, daysWindow);
  // Round to 1 decimal place, minimum 0.1 if recently sold
  return Math.round(rawVelocity * 10) / 10;
}

export function generateForecastAnalysis(products, transactions, stockRiskData = []) {
  const analyzedProducts = products.map((product) => {
    const velocity = calculateProductVelocity(product.id, transactions, 7);

    // Match backend ML stock risk data if available
    const backendRisk = Array.isArray(stockRiskData)
      ? stockRiskData.find((sr) => sr.product_id === product.id || sr.barcode === product.barcode)
      : null;

    const forecastSource = backendRisk?.forecast_source || "velocity_baseline";
    const predictedDailyDemand =
      backendRisk?.predicted_daily_demand !== undefined && backendRisk?.predicted_daily_demand !== null
        ? Number(backendRisk.predicted_daily_demand)
        : velocity;

    const effectiveVelocity = Math.max(predictedDailyDemand, velocity);

    // Safety buffer days to absorb delivery volatility
    const safetyBufferDays = 2;
    const effectiveLeadTime = product.supplierLeadTimeDays + safetyBufferDays;

    // Days until stock depletion
    const daysUntilStockout =
      backendRisk?.days_until_stockout !== undefined && backendRisk?.days_until_stockout !== null
        ? Number(backendRisk.days_until_stockout)
        : effectiveVelocity > 0
        ? Math.round((product.currentStock / effectiveVelocity) * 10) / 10
        : 999;

    const hoursUntilStockout = Math.round(daysUntilStockout * 24);

    // Stock status flag
    let stockStatus = "healthy";
    let isReorderNeeded = false;
    let urgency = "normal"; // "critical" | "warning" | "normal" | "excess"

    if (product.currentStock === 0) {
      stockStatus = "out_of_stock";
      isReorderNeeded = true;
      urgency = "critical";
    } else if (hoursUntilStockout <= 36 || product.currentStock <= product.minSafetyStock * 0.5) {
      stockStatus = "critical_risk";
      isReorderNeeded = true;
      urgency = "critical";
    } else if (product.currentStock <= product.minSafetyStock || daysUntilStockout <= effectiveLeadTime) {
      stockStatus = "low_stock";
      isReorderNeeded = true;
      urgency = "warning";
    } else if (daysUntilStockout > 60 && effectiveVelocity < 0.3) {
      stockStatus = "slow_moving";
      urgency = "excess";
    }

    // Recommended order quantity
    let recommendedOrderQty = 0;
    if (backendRisk?.recommended_reorder_quantity !== undefined && backendRisk?.recommended_reorder_quantity > 0) {
      recommendedOrderQty = backendRisk.recommended_reorder_quantity;
    } else if (isReorderNeeded) {
      const targetStockLevel = Math.ceil(effectiveLeadTime * Math.max(effectiveVelocity, 1)) + product.minSafetyStock;
      const deficit = targetStockLevel - product.currentStock;
      const packs = Math.max(1, Math.ceil(deficit / product.reorderPackSize));
      recommendedOrderQty = packs * product.reorderPackSize;
    }

    // Plain-language diagnostic narrative (NO em dashes)
    let rationale = "";
    if (product.currentStock === 0) {
      rationale = `Critical stock-out: 0 units on shelf. Lead time is ${product.supplierLeadTimeDays} days. Immediate order of ${recommendedOrderQty} units required to restore supply.`;
    } else if (urgency === "critical") {
      rationale = `Rapid burn rate (${predictedDailyDemand} units/day forecast) with ${product.currentStock} units left. Stock-out projected within ${hoursUntilStockout} hours. Lead time is ${product.supplierLeadTimeDays} days -> immediate reorder recommended.`;
    } else if (urgency === "warning") {
      rationale = `Stock (${product.currentStock} units) below safety threshold (${product.minSafetyStock} units). Lead time is ${product.supplierLeadTimeDays} days -> reorder recommended before buffer depletes.`;
    } else if (urgency === "excess") {
      rationale = `Low sales velocity (${predictedDailyDemand} units/day) with ${Math.round(daysUntilStockout)} days of stock on shelf (Rs.${(product.currentStock * product.costPrice).toFixed(2)} tied capital). Consider promotional bundling.`;
    } else {
      rationale = `Inventory level stable. Current runout timeline is ${daysUntilStockout} days at predicted demand rate (${predictedDailyDemand} units/day).`;
    }

    return {
      ...product,
      velocity,
      predictedDailyDemand,
      forecastSource,
      daysUntilStockout,
      hoursUntilStockout,
      stockStatus,
      urgency,
      isReorderNeeded,
      recommendedOrderQty,
      recommendedOrderCost: Math.round(recommendedOrderQty * product.costPrice * 100) / 100,
      rationale,
    };
  });

  // Sort reorder recommendations by urgency
  const reorderRecommendations = analyzedProducts
    .filter(p => p.isReorderNeeded)
    .sort((a, b) => {
      const urgencyRank = { critical: 3, warning: 2, normal: 1, excess: 0 };
      return (urgencyRank[b.urgency] || 0) - (urgencyRank[a.urgency] || 0) || a.hoursUntilStockout - b.hoursUntilStockout;
    });

  // Calculate top-selling products by quantity sold
  const salesMap = {};
  transactions.forEach(tx => {
    tx.items.forEach(item => {
      if (!salesMap[item.productId]) {
        salesMap[item.productId] = { unitsSold: 0, revenue: 0, name: item.name };
      }
      salesMap[item.productId].unitsSold += item.quantity;
      // Safely derive revenue: prefer lineTotal, fall back to quantity × unitPrice
      const lineRevenue = item.lineTotal != null ? item.lineTotal : (item.quantity * (item.unitPrice || 0));
      salesMap[item.productId].revenue += lineRevenue;
    });
  });

  const topSelling = Object.keys(salesMap)
    .map(prodId => {
    const prod = products.find(p => p.id === Number(prodId));
      return {
        id: prodId,
        name: salesMap[prodId].name,
        unitsSold: salesMap[prodId].unitsSold,
        revenue: Math.round(salesMap[prodId].revenue * 100) / 100,
        currentStock: prod ? prod.currentStock : 0,
        category: prod ? prod.category : "General"
      };
    })
    .sort((a, b) => b.unitsSold - a.unitsSold);

  const slowMoving = analyzedProducts.filter(p => p.stockStatus === "slow_moving");

  return {
    analyzedProducts,
    reorderRecommendations,
    topSelling,
    slowMoving
  };
}
