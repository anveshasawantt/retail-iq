import React, { useState } from "react";
import { 
  TrendingUp, 
  IndianRupee, 
  ShoppingBag, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Truck, 
  ArrowUpRight, 
  Package, 
  ShieldAlert,
  SendHorizontal,
  Layers,
  ArrowRight,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { generateForecastAnalysis } from "../services/forecastingEngine";
import SeoHelmet from "../components/common/SeoHelmet";
import Breadcrumbs from "../components/layout/Breadcrumbs";

export default function DashboardPage({ navigate }) {
  const { 
    products, 
    transactions, 
    purchaseOrders, 
    stockRiskData,
    approveReorder, 
    receivePurchaseOrder,
    getActivePOForProduct 
  } = useStore();

  const [activePoMessage, setActivePoMessage] = useState(null);
  const [justApprovedPoId, setJustApprovedPoId] = useState(null);

  const forecast = generateForecastAnalysis(products, transactions, stockRiskData);

  // Today's Metrics
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTransactions = transactions.filter((t) => t.timestamp.startsWith(todayStr));
  
  const todayRevenue = Math.round(todayTransactions.reduce((acc, t) => acc + t.total, 0) * 100) / 100;
  const todayTxCount = todayTransactions.length;
  const avgBasketValue = todayTxCount > 0 ? Math.round((todayRevenue / todayTxCount) * 100) / 100 : 0;
  const criticalCount = forecast.reorderRecommendations.filter((r) => r.urgency === "critical").length;
  const totalCatalogUnits = products.reduce((acc, p) => acc + p.currentStock, 0);

  const handleApprovePO = (product, recommendedQty) => {
    const po = approveReorder(product, recommendedQty);
    setJustApprovedPoId(po.id);
    setActivePoMessage({
      poId: po.id,
      text: `Purchase Order ${po.id} dispatched to ${product.supplierName} for ${recommendedQty} ${product.unit}s (₹${(recommendedQty * product.costPrice).toFixed(2)}). Status: In Transit.`
    });
  };

  const handleReceiveStock = (poId) => {
    receivePurchaseOrder(poId);
    setActivePoMessage({
      poId: null,
      text: `Stock for ${poId} successfully received and added to store inventory.`
    });
    setTimeout(() => setActivePoMessage(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SeoHelmet
        title="Store Operations & Inventory Velocity Dashboard"
        description="Real-time retail analytics, Indian FMCG stock-out prediction, and automated purchase order replenishment."
      />

      <div className="flex items-center justify-between">
        <Breadcrumbs items={[{ label: "Manager Dashboard" }]} navigate={navigate} />
        <button
          onClick={() => navigate("/inventory")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span>Catalog Directory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Notification Banner with 1-Click "Receive Stock" Demo Action */}
      {activePoMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{activePoMessage.text}</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {activePoMessage.poId && (
              <button
                onClick={() => handleReceiveStock(activePoMessage.poId)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-xs transition-colors shadow-sm whitespace-nowrap"
              >
                Simulate Delivery (Receive Stock)
              </button>
            )}
            <button
              onClick={() => setActivePoMessage(null)}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Clean 4-Card Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Today's Sales</span>
            <IndianRupee className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            ₹{todayRevenue.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {todayTxCount} register transactions today
          </p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Average Bill Value</span>
            <ShoppingBag className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            ₹{avgBasketValue.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Calculated across active bills
          </p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Stock-Out Risk (&lt;36h)</span>
            <AlertTriangle className={`w-4 h-4 ${criticalCount > 0 ? "text-rose-600" : "text-emerald-600"}`} />
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${criticalCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {criticalCount} SKUs
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {forecast.reorderRecommendations.length} items need replenishment
          </p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Total Physical Stock</span>
            <Layers className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {totalCatalogUnits} units
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {products.length} active Indian FMCG products
          </p>
        </div>
      </div>

      {/* Stock-Out Threat Radar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Predictive Stock-Out Threat Radar
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            AI-powered demand forecasting with velocity-based fallback
          </span>
        </div>

        {forecast.reorderRecommendations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <span className="font-semibold text-slate-800">All shelves are adequately stocked.</span>
            <p className="text-slate-400 mt-0.5">Ring up items at the POS to trigger simulated shelf depletion.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forecast.reorderRecommendations.slice(0, 4).map((item) => {
              const activePO = getActivePOForProduct(item.id);
              const isXGBoost = item.forecastSource === "xgboost";
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border transition-all ${
                    item.urgency === "critical"
                      ? "bg-rose-50/50 border-rose-300"
                      : "bg-amber-50/50 border-amber-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                            item.urgency === "critical"
                              ? "bg-rose-600 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          {item.urgency === "critical" ? "URGENT REORDER" : "REORDER SOON"}
                        </span>
                        {isXGBoost ? (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded font-mono text-[10px] font-bold inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-600" /> AI Forecast
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded font-mono text-[10px] font-semibold">
                            Baseline Forecast
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1.5">
                        {item.name}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-500">
                        {item.brand} | Current: {item.currentStock} {item.unit}s left
                      </div>
                    </div>

                    <div className="text-right font-mono flex-shrink-0">
                      <div className="text-xs font-bold text-slate-800">
                        {item.predictedDailyDemand !== undefined ? item.predictedDailyDemand : item.velocity} sold / day
                      </div>
                      <div className="text-[11px] text-rose-600 font-semibold">
                        Stock-out: ~{item.hoursUntilStockout > 48 ? `${Math.round(item.daysUntilStockout)} days` : `${item.hoursUntilStockout}h`}
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-700 bg-white/80 p-2.5 rounded border border-slate-200">
                    {item.rationale}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">
                      Recommended: <strong className="text-slate-900">{item.recommendedOrderQty} units</strong> (₹{(item.recommendedOrderQty * item.costPrice).toFixed(2)})
                    </span>

                    {activePO ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-semibold text-[11px] rounded border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>PO Placed ({activePO.id})</span>
                        </span>
                        <button
                          onClick={() => handleReceiveStock(activePO.id)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded"
                        >
                          Receive
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApprovePO(item, item.recommendedOrderQty)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded shadow-sm transition-colors cursor-pointer"
                      >
                        <SendHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Approve PO</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Smart Reorder Recommendations Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Reorder Replenishment Table
          </h2>
          <span className="text-xs text-slate-500">
            Pack Multiples & Wholesale Costs
          </span>
        </div>

        {forecast.reorderRecommendations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No pending replenishment required.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Item & Supplier</th>
                  <th className="py-3 px-3 text-center">Engine</th>
                  <th className="py-3 px-3 text-center">Stock</th>
                  <th className="py-3 px-3 text-center">Demand</th>
                  <th className="py-3 px-3 text-center">Lead Time</th>
                  <th className="py-3 px-4 text-right">Order Units</th>
                  <th className="py-3 px-4 text-right">Cost (₹)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forecast.reorderRecommendations.map((item) => {
                  const activePO = getActivePOForProduct(item.id);
                  const isXGBoost = item.forecastSource === "xgboost";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => navigate(`/product/${item.id}`)}
                          className="font-semibold text-slate-900 hover:text-blue-700 text-left"
                        >
                          {item.name}
                        </button>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Supplier: {item.supplierName}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isXGBoost ? (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded font-mono text-[10px] font-bold">
                            AI Forecast
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px] font-medium">
                            Baseline
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {item.currentStock}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-700 font-semibold">
                        {item.predictedDailyDemand !== undefined ? item.predictedDailyDemand : item.velocity}/day
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600">
                        {item.supplierLeadTimeDays}d
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        +{item.recommendedOrderQty}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        ₹{(item.recommendedOrderQty * item.costPrice).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {activePO ? (
                          <div className="inline-flex items-center gap-1">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded">
                              In Transit
                            </span>
                            <button
                              onClick={() => handleReceiveStock(activePO.id)}
                              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded"
                            >
                              Receive
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApprovePO(item, item.recommendedOrderQty)}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs transition-colors cursor-pointer shadow-sm"
                          >
                            Approve PO
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Purchase Orders Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Purchase Orders Ledger ({purchaseOrders.length})
            </h2>
          </div>
        </div>

        {purchaseOrders.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            No purchase orders dispatched yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {purchaseOrders.map((po) => (
              <div
                key={po.id}
                className="p-3 rounded border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{po.id}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[10px] uppercase font-semibold ${
                        po.status === "Received"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-0.5 font-medium">
                    {po.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Total: ₹{po.totalCost.toFixed(2)} | Supplier: {po.supplierName}
                  </div>
                </div>

                {po.status === "In Transit" && (
                  <button
                    onClick={() => handleReceiveStock(po.id)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition-colors flex-shrink-0"
                  >
                    Receive (+{po.items[0]?.quantity})
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
