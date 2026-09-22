import React, { useState } from "react";
import { AlertCircle, PlusCircle, X } from "lucide-react";
import { useStore } from "../../context/StoreContext";

export default function UnknownBarcodeModal({ barcode, onClose, onOpenCatalogAdd }) {
  if (!barcode) return null;

  const displayBarcode = typeof barcode === "object" ? barcode.barcode : barcode;
  const isFoundOnOFF = typeof barcode === "object" && barcode.found;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-sm">
              {isFoundOnOFF ? "OpenFoodFacts Match Found" : "Unrecognized Barcode"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-700">
            {isFoundOnOFF
              ? "Product details auto-filled from live OpenFoodFacts lookup:"
              : "The scanned barcode was not found in store catalog directory:"}
          </p>

          <div className="bg-slate-100 p-3 rounded-md border border-slate-200 font-mono text-center text-sm font-bold text-slate-900">
            {displayBarcode}
          </div>

          {isFoundOnOFF && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs space-y-1 text-emerald-950">
              {barcode.name && <div><strong>Name:</strong> {barcode.name}</div>}
              {barcode.brand && <div><strong>Brand:</strong> {barcode.brand}</div>}
              {barcode.category && <div><strong>Category:</strong> {barcode.category}</div>}
            </div>
          )}

          <p className="text-xs text-slate-500 leading-relaxed">
            Would you like to register this SKU into inventory now, or dismiss and continue ringing current customer items?
          </p>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenCatalogAdd(barcode);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Product</span>
          </button>
        </div>
      </div>
    </div>
  );
}
