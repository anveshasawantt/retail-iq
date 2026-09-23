import React, { useState } from "react";
import {
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Truck,
  ArrowRight,
  Package,
  ShieldAlert,
  SendHorizontal,
  Layers,
  Sparkles,
  BarChart2,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { generateForecastAnalysis } from "../services/forecastingEngine";
import SeoHelmet from "../components/common/SeoHelmet";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import RevenueChart from "../components/dashboard/RevenueChart";
import TopProductsChart from "../components/dashboard/TopProductsChart";
import CategoryChart from "../components/dashboard/CategoryChart";
import SlowMoversTable from "../components/dashboard/SlowMoversTable";

// -- Helpers -------------------------------------------------------------------

function SectionCard({ title, icon: Icon, subtitle, children, className = "" }) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`}>
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-slate-600" />}
          <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">{title}</h2>
        </div>
        {subtitle && <span className="text-[10px] text-slate-400 font-mono">{subtitle}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, alert = false }) {
  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        <span>{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${alert ? "text-rose-500" : "text-slate-400"}`} />}
      </div>
      <div className={`text-2xl font-bold font-mono ${alert ? "text-rose-600" : "text-slate-900"}`}>
        {value}
      </div>
      {sub && <p className="text-[10px] text-slate-400 mt-1 leading-snug">{sub}</p>}
    </div>
  );
}

// -- Main Component ------------------------------------------------------------

export default function DashboardPage({ navigate }) {
  const {
    products,
    transactions,
    purchaseOrders,
    stockRiskData,
    analyticsData,
    isLoading,
    apiConnected,
    approveReorder,
    receivePurchaseOrder,
    getActivePOForProduct,
  } = useStore();

  const [activePoMessage, setActivePoMessage] = useState(null);

  const forecast = generateForecastAnalysis(products, transactions, stockRiskData);

  // -- KPI Metrics --------------------------------------------------------------
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTx = transactions.filter((t) => (t.timestamp || t.created_at || "").startsWith(todayStr));
  const todayRevenue = Math.round(todayTx.reduce((s, t) => s + (t.total || 0), 0) * 100) / 100;
  const todayTxCount = todayTx.length;
  const avgBasket = todayTxCount > 0 ? Math.round((todayRevenue / todayTxCount) * 100) / 100 : 0;
  const criticalCount = forecast.reorderRecommendations.filter((r) => r.urgency === "critical").length;
  const totalUnits = products.reduce((s, p) => s + (p.currentStock || 0), 0);

  // -- PO Handlers --------------------------------------------------------------
  const handleApprovePO = (product, qty) => {
    const po = approveReorder(product, qty);
    setActivePoMessage({
      poId: po.id,
      text: `Purchase Order ${po.id} dispatched to ${product.supplierName} for ${qty} ${product.unit}s (${formatINR(qty * product.costPrice)}). Status: In Transit.`,
    });
  };

  const handleReceiveStock = (poId) => {
    receivePurchaseOrder(poId);
    setActivePoMessage({ poId: null, text: `Stock for ${poId} received and added to store inventory.` });
    setTimeout(() => setActivePoMessage(null), 4000);
  };

  // -- Analytics derived --------------------------------------------------------
  const hasDailyRevenue = analyticsData?.daily_revenue?.length > 0;
  const hasTopProducts = analyticsData?.top_products?.length > 0;
  const hasCategoryData = analyticsData?.category_breakdown?.length > 1;
  const hasSlowMovers = analyticsData?.slow_movers?.length > 0;
  const periodLabel = analyticsData ? `Last ${analyticsData.period_days} days` : null;
  const totalRevLabel = analyticsData
    ? `${formatINR(analyticsData.total_revenue)} total (${analyticsData.total_transactions} transactions)`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <SeoHelmet
        title="Store Operations & Inventory Dashboard"
        description="Real-time retail analytics, FMCG stock-out prediction, revenue trends, and automated purchase order replenishment."
      />

      {/* -- Header -- */}
      <div className="flex items-center justify-between">
        <Breadcrumbs items={[{ label: "Manager Dashboard" }]} navigate={navigate} />
        <button
          onClick={() => navigate("/inventory")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <span>Catalog Directory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* -- PO Action Banner -- */}
      {activePoMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold" dangerouslySetInnerHTML={{ __html: activePoMessage.text }} />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {activePoMessage.poId && (
              <button
                onClick={() => handleReceiveStock(activePoMessage.poId)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-xs transition-colors whitespace-nowrap"
              >
                Simulate Delivery
              </button>
            )}
            <button onClick={() => setActivePoMessage(null)} className="px-2 py-1 text-slate-500 hover:text-slate-800 font-semibold">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* -- KPI Cards -- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Sales"
          value={`${formatINR(todayRevenue)}`}
          sub={`${todayTxCount} register transactions today`}
        />
        <KpiCard
          label="Avg Bill Value"
          value={`${formatINR(avgBasket)}`}
          sub="Calculated across active bills"
          icon={ShoppingBag}
        />
        <KpiCard
          label="Stock-Out Risk"
          value={`${criticalCount} SKUs`}
          sub={`${forecast.reorderRecommendations.length} items need replenishment`}
          icon={AlertTriangle}
          alert={criticalCount > 0}
        />
        <KpiCard
          label="Total Inventory"
          value={`${totalUnits.toLocaleString("en-IN")}`}
          sub={`Across ${products.length} active SKUs`}
          icon={Layers}
        />
      </div>

      {/* -- Revenue Trend Chart -- */}
      <SectionCard
        title="Revenue Trend"
        icon={TrendingUp}
        subtitle={periodLabel}
      >
        {isLoading && !hasDailyRevenue ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400">Loading revenue data...</div>
        ) : hasDailyRevenue ? (
          <>
            {totalRevLabel && (
              <p className="text-[11px] text-slate-500 mb-3 font-mono" dangerouslySetInnerHTML={{ __html: totalRevLabel }} />
            )}
            <RevenueChart data={analyticsData.daily_revenue} />
          </>
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400">
            {apiConnected ? "No revenue data for this period." : "Revenue chart requires backend connection."}
          </div>
        )}
      </SectionCard>

      {/* -- Threat Radar -- */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
              Predictive Stock-Out Threat Radar
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            XGBoost demand forecasting + velocity fallback
          </span>
        </div>

        {forecast.reorderRecommendations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
            <span className="font-semibold text-slate-700">All shelves adequately stocked.</span>
            <p className="text-slate-400 mt-0.5">Ring up items at POS to trigger shelf depletion simulation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forecast.reorderRecommendations.slice(0, 4).map((item) => {
              const activePO = getActivePOForProduct(item.id);
              const isXGB = item.forecastSource === "xgboost";
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border transition-all ${
                    item.urgency === "critical" ? "bg-rose-50/60 border-rose-200" : "bg-amber-50/60 border-amber-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                            item.urgency === "critical" ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
                          }`}
                        >
                          {item.urgency === "critical" ? "URGENT REORDER" : "REORDER SOON"}
                        </span>
                        {isXGB ? (
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded font-mono text-[10px] font-bold inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Forecast
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded font-mono text-[10px]">
                            Baseline
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1.5 leading-tight">{item.name}</h3>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {item.brand} | {item.currentStock} {item.unit}s on shelf
                      </div>
                    </div>
                    <div className="text-right font-mono flex-shrink-0">
                      <div className="text-xs font-bold text-slate-800">
                        {item.predictedDailyDemand ?? item.velocity} / day
                      </div>
                      <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                        ~{item.hoursUntilStockout > 48 ? `${Math.round(item.daysUntilStockout)}d` : `${item.hoursUntilStockout}h`}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 bg-white/80 p-2.5 rounded border border-slate-100 leading-relaxed">
                    {item.rationale}
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      Reorder: <strong className="text-slate-900">{item.recommendedOrderQty} units</strong>{" "}
                      <span className="font-mono">(&#8377;{(item.recommendedOrderQty * item.costPrice).toFixed(2)})</span>
                    </span>
                    {activePO ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold text-[10px] rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PO {activePO.id}
                        </span>
                        <button
                          onClick={() => handleReceiveStock(activePO.id)}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-700 text-white text-[11px] font-semibold rounded"
                        >
                          Receive
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApprovePO(item, item.recommendedOrderQty)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold rounded shadow-sm transition-colors"
                      >
                        <SendHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                        Approve PO
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* -- Top Products + Slow Movers -- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Top Selling Products" icon={BarChart2} subtitle={periodLabel}>
          {isLoading && !hasTopProducts ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-400">Loading...</div>
          ) : (
            <TopProductsChart data={analyticsData?.top_products ?? []} />
          )}
        </SectionCard>
        <SectionCard title="Slow-Moving Inventory" icon={Package} subtitle="No sales in period">
          <SlowMoversTable data={analyticsData?.slow_movers ?? []} navigate={navigate} />
        </SectionCard>
      </div>

      {/* -- Category Performance -- */}
      {hasCategoryData && (
        <SectionCard title="Category Revenue Breakdown" icon={BarChart2} subtitle={periodLabel}>
          <CategoryChart data={analyticsData.category_breakdown} />
        </SectionCard>
      )}

      {/* -- Reorder Replenishment Table -- */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
            Reorder Replenishment Table
          </h2>
          <span className="text-[10px] text-slate-400">Pack multiples &amp; wholesale costs</span>
        </div>
        {forecast.reorderRecommendations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No pending replenishment required.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Item &amp; Supplier</th>
                  <th className="py-3 px-3 text-center">Engine</th>
                  <th className="py-3 px-3 text-center">Stock</th>
                  <th className="py-3 px-3 text-center">Demand/Day</th>
                  <th className="py-3 px-3 text-center">Lead Time</th>
                  <th className="py-3 px-4 text-right">Order Qty</th>
                  <th className="py-3 px-4 text-right">Cost (Rs.)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {forecast.reorderRecommendations.map((item) => {
                  const activePO = getActivePOForProduct(item.id);
                  const isXGB = item.forecastSource === "xgboost";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => navigate(`/product/${item.id}`)}
                          className="font-semibold text-slate-900 hover:text-blue-700 text-left"
                        >
                          {item.name}
                        </button>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {item.supplierName}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isXGB ? (
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded font-mono text-[10px] font-bold">
                            AI
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-[10px]">
                            Base
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">{item.currentStock}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-700">{item.predictedDailyDemand ?? item.velocity}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">{item.supplierLeadTimeDays}d</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">+{item.recommendedOrderQty}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        &#8377;{(item.recommendedOrderQty * item.costPrice).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {activePO ? (
                          <div className="inline-flex items-center gap-1">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded">In Transit</span>
                            <button
                              onClick={() => handleReceiveStock(activePO.id)}
                              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-700 text-white text-[10px] font-semibold rounded"
                            >
                              Receive
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApprovePO(item, item.recommendedOrderQty)}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-700 text-white font-semibold rounded text-xs transition-colors cursor-pointer"
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

      {/* -- Purchase Orders Ledger -- */}
      <SectionCard
        title={`Purchase Orders Ledger (${purchaseOrders.length})`}
        icon={Truck}
      >
        {purchaseOrders.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-3">No purchase orders dispatched yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {purchaseOrders.map((po) => (
              <div
                key={po.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{po.id}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                        po.status === "Received" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-0.5 font-medium">
                    {po.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    &#8377;{po.totalCost.toFixed(2)} | {po.supplierName}
                  </div>
                </div>
                {po.status === "In Transit" && (
                  <button
                    onClick={() => handleReceiveStock(po.id)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs flex-shrink-0 transition-colors"
                  >
                    Receive (+{po.items[0]?.quantity})
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
