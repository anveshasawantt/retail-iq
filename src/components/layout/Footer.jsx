import React from "react";
import { Scan } from "lucide-react";
import { useStore } from "../../context/StoreContext";

export default function Footer({ navigate }) {
  const { currentRole } = useStore();

  return (
    <footer className="bg-white border-t border-slate-200 mt-12 py-8 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center text-emerald-400 font-bold">
              <Scan className="w-3 h-3" />
            </div>
            <span className="font-bold text-slate-800">ApexRetail OS</span>
            <span className="text-slate-400 font-mono">India Edition (₹)</span>
            <span className="text-slate-300">|</span>
            <span className="capitalize">{currentRole} Session Active</span>
          </div>

          <div className="flex items-center gap-6">
            {currentRole === "cashier" ? (
              <button
                onClick={() => navigate("/pos")}
                className="hover:text-slate-900 transition-colors font-medium text-slate-700"
              >
                Cashier POS
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="hover:text-slate-900 transition-colors font-medium text-slate-700"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate("/inventory")}
                  className="hover:text-slate-900 transition-colors font-medium text-slate-700"
                >
                  Inventory Catalog
                </button>
              </>
            )}
            <button
              onClick={() => navigate("/terms")}
              className="hover:text-slate-900 transition-colors"
            >
              Terms
            </button>
            <button
              onClick={() => navigate("/privacy")}
              className="hover:text-slate-900 transition-colors"
            >
              Privacy
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400">
          <p>
            Local In-Memory Ledger Architecture. Real-time billing, inventory auto-depletion, and predictive reorder intelligence.
          </p>
          <p className="mt-2 sm:mt-0 font-mono">
            Node Status: Operational (₹ INR)
          </p>
        </div>
      </div>
    </footer>
  );
}
