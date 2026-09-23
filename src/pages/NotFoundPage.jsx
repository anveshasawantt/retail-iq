import React from "react";
import { AlertCircle, ArrowLeft, Scan, BarChart3, Package } from "lucide-react";
import SeoHelmet from "../components/common/SeoHelmet";
import Breadcrumbs from "../components/layout/Breadcrumbs";

export default function NotFoundPage({ navigate }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6">
      <SeoHelmet
        title="404 Screen Not Found"
        description="The requested POS screen or inventory resource could not be found."
      />

      <Breadcrumbs items={[{ label: "404 Error" }]} navigate={navigate} />

      <div className="bg-white p-10 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center mx-auto text-slate-700">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          404 - Requested Screen Not Found
        </h1>

        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          The routing path you attempted to access does not exist in this RetailIQ node terminal. Use the verified platform routes below to navigate.
        </p>

        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <button
            onClick={() => navigate("/pos")}
            className="p-3.5 rounded-md border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs mb-1">
              <Scan className="w-4 h-4 text-emerald-600" />
              <span>Cashier POS</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Open register station to scan barcodes and complete transactions.
            </p>
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="p-3.5 rounded-md border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs mb-1">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <span>Manager Dashboard</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Inspect velocity analytics and approve reorder recommendations.
            </p>
          </button>

          <button
            onClick={() => navigate("/inventory")}
            className="p-3.5 rounded-md border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs mb-1">
              <Package className="w-4 h-4 text-blue-600" />
              <span>Inventory Directory</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Browse complete SKU catalogue and execute manual count adjustments.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
