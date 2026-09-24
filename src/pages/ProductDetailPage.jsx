import React, { useState } from "react";
import { 
  Package, 
  ArrowLeft, 
  Clock, 
  TrendingUp, 
  Truck, 
  Sliders, 
  CheckCircle2, 
  SendHorizontal,
  Sparkles
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { calculateProductVelocity } from "../services/forecastingEngine";
import SeoHelmet from "../components/common/SeoHelmet";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import StockAdjustmentModal from "../components/inventory/StockAdjustmentModal";
import { formatINR } from "../utils/currency";

export default function ProductDetailPage({ productId, navigate }) {
  const { products, transactions, stockRiskData, approveReorder } = useStore();
  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [orderSentMessage, setOrderSentMessage] = useState(null);

  const product = products.find((p) => String(p.id) === String(productId));

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Product SKU Not Found</h2>
        <button
          onClick={() => navigate("/inventory")}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-semibold"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const baseVelocity = calculateProductVelocity(product.id, transactions, 7);
  const simulatedVelocity = Math.max(0.1, Math.round(baseVelocity * demandMultiplier * 10) / 10);

  // Backend ML risk data for this product (from /inventory/stock-risk)
  const backendRisk = Array.isArray(stockRiskData)
    ? stockRiskData.find((sr) => sr.product_id === product.id || sr.barcode === product.barcode)
    : null;
  const forecastSource = backendRisk?.forecast_source || "velocity_baseline";
  const isXGBoost = forecastSource === "xgboost";
  const mlPredictedDemand = backendRisk?.predicted_daily_demand != null
    ? Number(backendRisk.predicted_daily_demand)
    : null;
  const mlDaysUntilStockout = backendRisk?.days_until_stockout != null
    ? Number(backendRisk.days_until_stockout)
    : null;
  const mlRecommendedQty = backendRisk?.recommended_reorder_quantity != null
    ? Number(backendRisk.recommended_reorder_quantity)
    : null;
  const mlStatus = backendRisk?.status || null;

  const daysUntilStockout = Math.round((product.currentStock / simulatedVelocity) * 10) / 10;
  const hoursUntilStockout = Math.round(daysUntilStockout * 24);

  const effectiveLeadTime = product.supplierLeadTimeDays + 2;
  const targetStock = Math.ceil(effectiveLeadTime * simulatedVelocity) + product.minSafetyStock;
  const deficit = targetStock - product.currentStock;
  const recommendedPacks = Math.max(1, Math.ceil(deficit / product.reorderPackSize));
  const simulatedReorderQty = recommendedPacks * product.reorderPackSize;
  const simulatedOrderCost = Math.round(simulatedReorderQty * product.costPrice * 100) / 100;

  const marginDollar = product.sellingPrice - product.costPrice;
  const marginPct = Math.round((marginDollar / product.sellingPrice) * 100);

  const relevantTransactions = transactions.filter((tx) =>
    tx.items.some((i) => i.productId === product.id)
  );

  const handleCreateReorder = () => {
    const po = approveReorder(product, simulatedReorderQty);
    setOrderSentMessage(`PO ${po.id} submitted for ${simulatedReorderQty} units. Dispatched to ${product.supplierName}.`);
    setTimeout(() => setOrderSentMessage(null), 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SeoHelmet
        title={`${product.name} - SKU Velocity Analysis`}
        description={`Inventory diagnostics, sales velocity, and lead-time replenishment simulation for ${product.name}.`}
      />

      <Breadcrumbs
        items={[
          { label: "Inventory Directory", path: "/inventory" },
          { label: product.name }
        ]}
        navigate={navigate}
      />

      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            onClick={() => navigate("/inventory")}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Inventory</span>
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {product.name}
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {product.category}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            Barcode: {product.barcode} | Brand: {product.brand} | SKU: {product.sku}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md border border-slate-300 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Adjust Stock</span>
          </button>
          <button
            onClick={handleCreateReorder}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
          >
            <SendHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reorder {simulatedReorderQty} Units</span>
          </button>
        </div>
      </div>

      {orderSentMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-md flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{orderSentMessage}</span>
        </div>
      )}

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            On-Hand Stock
          </span>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            <span className={`text-2xl font-bold ${product.currentStock <= product.minSafetyStock ? "text-rose-600" : "text-slate-900"}`}>
              {product.currentStock}
            </span>
            <span className="text-xs text-slate-500">{product.unit}s</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Safety buffer: {product.minSafetyStock} units
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Sales Velocity
            </span>
            {isXGBoost ? (
              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded font-mono text-[10px] font-bold inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Forecast
              </span>
            ) : (
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded font-mono text-[10px] font-semibold">
                Baseline
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-slate-900">
              {mlPredictedDemand != null ? mlPredictedDemand : baseVelocity}
            </span>
            <span className="text-xs text-slate-500">units / day</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {mlPredictedDemand != null
              ? `AI predicted demand (local 7-day: ${baseVelocity})`
              : "7-day rolling average"}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Unit Economics
          </span>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-slate-900">{marginPct}%</span>
            <span className="text-xs text-emerald-600 font-semibold">+{formatINR(marginDollar)}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Selling: {formatINR(product.sellingPrice)} | Cost: {formatINR(product.costPrice)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Supplier Lead Time
          </span>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-slate-900">{product.supplierLeadTimeDays}</span>
            <span className="text-xs text-slate-500">days</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Pack multiple: {product.reorderPackSize} units
          </div>
        </div>
      </div>

      {/* Demand Simulator */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-800" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Demand Simulator
            </h2>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
            Factor: {Math.round(demandMultiplier * 100)}%
          </span>
        </div>

        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={demandMultiplier}
          onChange={(e) => setDemandMultiplier(parseFloat(e.target.value))}
          className="w-full accent-slate-900 cursor-pointer h-2 bg-slate-200 rounded-lg"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500">Projected Velocity:</span>
            <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
              {simulatedVelocity} units/day
            </div>
          </div>
          <div className={`p-3 rounded border ${hoursUntilStockout <= 36 ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
            <span className="text-slate-500">Projected Depletion:</span>
            <div className="text-sm font-bold font-mono mt-0.5">
              {hoursUntilStockout > 48 ? `${daysUntilStockout} days` : `${hoursUntilStockout} hours`}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500">Suggested Order:</span>
            <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
              {simulatedReorderQty} units ({formatINR(simulatedOrderCost)})
            </div>
          </div>
        </div>

        {/* Backend ML Reference Row — shown only when backend data is available */}
        {backendRisk && (
          <div className="mt-3 p-3 rounded border border-indigo-100 bg-indigo-50/60 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-900 mb-2">
              {isXGBoost && <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
              <span>Backend ML Reference</span>
              <span className={`ml-auto px-1.5 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                mlStatus === "urgent" ? "bg-rose-100 text-rose-800" :
                mlStatus === "low_stock" ? "bg-amber-100 text-amber-800" :
                "bg-emerald-100 text-emerald-800"
              }`}>
                {mlStatus || "healthy"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-slate-700">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">AI Demand</div>
                <div className="font-bold text-slate-900">
                  {mlPredictedDemand != null ? `${mlPredictedDemand} /day` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Days to Stockout</div>
                <div className="font-bold text-slate-900">
                  {mlDaysUntilStockout != null ? `${mlDaysUntilStockout}d` : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">ML Reorder Qty</div>
                <div className="font-bold text-slate-900">
                  {mlRecommendedQty != null ? `${mlRecommendedQty} units` : "—"}
                </div>
              </div>
            </div>
          </div>
        )}
      
      </div>

      {/* Supplier Info & Sales History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            <Truck className="w-4 h-4 text-slate-600" />
            <span>Supplier Details</span>
          </div>
          <div className="space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>Distributor:</span>
              <span className="font-semibold text-slate-900">{product.supplierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Contact:</span>
              <span className="font-mono text-slate-700">{product.supplierEmail}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery SLA:</span>
              <span className="font-medium text-slate-800">{product.supplierLeadTimeDays} days</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
          <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100">
            Recent Sales History ({relevantTransactions.length} receipts)
          </div>
          {relevantTransactions.length === 0 ? (
            <p className="text-slate-400 py-3 text-center">No sales recorded yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {relevantTransactions.slice(0, 4).map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="font-mono font-semibold text-slate-700">{tx.id}</span>
                  <span className="text-slate-500 font-mono">
                    {new Date(tx.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatINR(tx.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <StockAdjustmentModal
        product={product}
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
      />
    </div>
  );
}
