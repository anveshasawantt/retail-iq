import React, { useState, useMemo } from "react";
import { 
  Package, 
  Search, 
  PlusCircle, 
  Sliders, 
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { generateForecastAnalysis } from "../services/forecastingEngine";
import SeoHelmet from "../components/common/SeoHelmet";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import AddProductModal from "../components/inventory/AddProductModal";
import StockAdjustmentModal from "../components/inventory/StockAdjustmentModal";

export default function InventoryPage({ navigate }) {
  const { products, transactions, stockRiskData } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState(null);

  const forecast = generateForecastAnalysis(products, transactions, stockRiskData);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return forecast.analyzedProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;

      let matchesStatus = true;
      if (selectedStatus === "critical") {
        matchesStatus = p.urgency === "critical";
      } else if (selectedStatus === "warning") {
        matchesStatus = p.urgency === "warning";
      } else if (selectedStatus === "healthy") {
        matchesStatus = p.urgency === "normal" || p.urgency === "optimal";
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [forecast.analyzedProducts, searchTerm, selectedCategory, selectedStatus]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SeoHelmet
        title="Catalog Directory & Stock Replenishment Ledger"
        description="FMCG product catalogue, Indian barcode records, margin analytics, and stock adjustments."
      />

      <div className="flex items-center justify-between">
        <Breadcrumbs items={[{ label: "Inventory Directory" }]} navigate={navigate} />
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Add New SKU</span>
        </button>
      </div>

      {/* Clean Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, brand, SKU or barcode (e.g. Amul, 8901262...)"
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="all">All Statuses</option>
            <option value="critical">URGENT REORDER</option>
            <option value="warning">REORDER SOON</option>
            <option value="healthy">STOCK HEALTHY</option>
          </select>
        </div>
      </div>

      {/* Clean Inventory Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No products match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Item & SKU</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Price (₹)</th>
                  <th className="py-3 px-3 text-center">Margin</th>
                  <th className="py-3 px-3 text-center">Stock</th>
                  <th className="py-3 px-3 text-center">Velocity</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((prod) => {
                  const marginPct = Math.round(((prod.sellingPrice - prod.costPrice) / prod.sellingPrice) * 100);
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => navigate(`/product/${prod.id}`)}
                          className="font-semibold text-slate-900 hover:text-blue-700 text-left"
                        >
                          {prod.name}
                        </button>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {prod.barcode} | {prod.brand}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">{prod.category}</td>
                      <td className="py-3.5 px-3 text-right font-mono">
                        <div className="font-bold text-slate-900">₹{prod.sellingPrice.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400">Cost: ₹{prod.costPrice.toFixed(2)}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                          {marginPct}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {prod.currentStock} {prod.unit}s
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Min: {prod.minSafetyStock}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-slate-700">
                        {prod.velocity}/day
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            prod.urgency === "critical"
                              ? "bg-rose-100 text-rose-800"
                              : prod.urgency === "warning"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {prod.urgency === "critical"
                            ? "URGENT REORDER"
                            : prod.urgency === "warning"
                            ? "Low Stock"
                            : "Healthy"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setAdjustingProduct(prod)}
                            title="Adjust stock count"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/product/${prod.id}`)}
                            title="Inspect analytics"
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <StockAdjustmentModal
        product={adjustingProduct}
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
      />
    </div>
  );
}
