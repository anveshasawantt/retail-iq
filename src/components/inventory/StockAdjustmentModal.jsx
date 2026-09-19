import React, { useState } from "react";
import { Sliders, X } from "lucide-react";
import { useStore } from "../../context/StoreContext";

export default function StockAdjustmentModal({ product, isOpen, onClose }) {
  const { adjustProductStock } = useStore();
  const [adjustmentType, setAdjustmentType] = useState("add"); // "add" | "set" | "subtract"
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState("Restock delivery receipt");

  if (!isOpen || !product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = Number(amount);
    let delta = 0;

    if (adjustmentType === "add") {
      delta = qty;
    } else if (adjustmentType === "subtract") {
      delta = -Math.min(product.currentStock, qty);
    } else if (adjustmentType === "set") {
      delta = qty - product.currentStock;
    }

    adjustProductStock(product.id, delta, reason);
    onClose();
  };

  const calculateNewStock = () => {
    const qty = Number(amount) || 0;
    if (adjustmentType === "add") return product.currentStock + qty;
    if (adjustmentType === "subtract") return Math.max(0, product.currentStock - qty);
    if (adjustmentType === "set") return Math.max(0, qty);
    return product.currentStock;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Inventory Adjustment</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <div className="text-xs font-semibold text-slate-900">{product.name}</div>
            <div className="text-[11px] font-mono text-slate-500">
              SKU: {product.sku} | Barcode: {product.barcode}
            </div>
            <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md flex justify-between items-center">
              <span className="text-slate-600">Current On-Hand:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {product.currentStock} {product.unit}s
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Adjustment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType("add")}
                className={`py-2 px-2 text-center rounded-md border font-medium transition-colors ${
                  adjustmentType === "add"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                + Add Units
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("subtract")}
                className={`py-2 px-2 text-center rounded-md border font-medium transition-colors ${
                  adjustmentType === "subtract"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                - Deduct
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("set")}
                className={`py-2 px-2 text-center rounded-md border font-medium transition-colors ${
                  adjustmentType === "set"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                = Set Absolute
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason / Note</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="Restock delivery receipt">Restock delivery receipt</option>
              <option value="Physical cycle count correction">Physical cycle count correction</option>
              <option value="Damaged or expired write-off">Damaged or expired write-off</option>
              <option value="Store use / testing">Store use / testing</option>
              <option value="Customer return restocked">Customer return restocked</option>
            </select>
          </div>

          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md flex justify-between items-center text-emerald-900">
            <span className="font-medium">Projected New Total:</span>
            <span className="font-mono font-bold text-sm">
              {calculateNewStock()} {product.unit}s
            </span>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors"
            >
              Update Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
