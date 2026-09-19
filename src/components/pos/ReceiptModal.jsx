import React from "react";
import { Printer, CheckCircle2, X } from "lucide-react";

export default function ReceiptModal({ transaction, onClose }) {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(transaction.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Action Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Payment Successful</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div className="p-6 bg-slate-50 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[320px] bg-white p-5 border border-slate-300 shadow-sm text-slate-800 font-mono text-xs leading-relaxed"
          >
            {/* Store Banner */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">APEXRETAIL SUPERMARKET</h3>
              <p className="text-[11px] text-slate-500">Store Node #104 (Bandra West)</p>
              <p className="text-[10px] text-slate-500">Linking Rd, Mumbai - 400050</p>
              <p className="text-[10px] text-slate-500">GSTIN: 27AABCA1234F1Z5</p>
            </div>

            {/* Transaction Metadata */}
            <div className="space-y-0.5 border-b border-dashed border-slate-300 pb-3 mb-3 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Bill No:</span>
                <span className="font-bold text-slate-900">{transaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{transaction.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Register:</span>
                <span>{transaction.registerId}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
              <div className="flex justify-between font-bold text-[11px] text-slate-900 mb-1.5">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>
              <div className="space-y-2">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="text-[11px]">
                    <div className="font-medium text-slate-800 truncate">{item.name}</div>
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>
                        {item.quantity} @ ₹{item.unitPrice.toFixed(2)}
                        {item.discountPercent > 0 ? ` (-${item.discountPercent}%)` : ""}
                      </span>
                      <span className="text-slate-900 font-medium">₹{item.lineTotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 mb-3 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{transaction.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (5%):</span>
                <span>₹{transaction.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>₹{transaction.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Detail */}
            <div className="space-y-0.5 border-b border-dashed border-slate-300 pb-3 mb-3 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-semibold text-slate-900">{transaction.paymentMethod}</span>
              </div>
              {transaction.paymentMethod === "Cash" && (
                <>
                  <div className="flex justify-between">
                    <span>Cash Tendered:</span>
                    <span>₹{(transaction.cashTendered || transaction.total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>Change Due:</span>
                    <span>₹{(transaction.changeDue || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer Barcode */}
            <div className="text-center pt-1">
              <div className="flex justify-center mb-1">
                {/* Visual thermal receipt barcode representation */}
                <div className="flex items-center gap-0.5 h-7">
                  <span className="w-1 h-full bg-slate-900"></span>
                  <span className="w-0.5 h-full bg-slate-900"></span>
                  <span className="w-2 h-full bg-slate-900"></span>
                  <span className="w-0.5 h-full bg-slate-900"></span>
                  <span className="w-1.5 h-full bg-slate-900"></span>
                  <span className="w-0.5 h-full bg-slate-900"></span>
                  <span className="w-2 h-full bg-slate-900"></span>
                  <span className="w-1 h-full bg-slate-900"></span>
                  <span className="w-0.5 h-full bg-slate-900"></span>
                  <span className="w-1.5 h-full bg-slate-900"></span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">{transaction.id}</p>
              <p className="text-[10px] text-slate-400 mt-1">Thank you for shopping local!</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md border border-slate-300 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
          >
            <span>Next Customer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
