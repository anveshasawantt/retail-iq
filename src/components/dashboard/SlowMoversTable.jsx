import React from "react";
import { Package } from "lucide-react";

export default function SlowMoversTable({ data = [], navigate }) {
  const safe = (data || []).filter((d) => d && d.name);

  if (safe.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-400">
        <Package className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
        No slow-moving products detected.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <th className="py-2 px-3">Product</th>
            <th className="py-2 px-3 text-right">Stock</th>
            <th className="py-2 px-3 hidden sm:table-cell">Category</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {safe.map((item, idx) => (
            <tr key={item.product_id ?? idx} className="hover:bg-slate-50/60 transition-colors">
              <td className="py-2 px-3">
                {navigate ? (
                  <button
                    onClick={() => navigate(`/product/${item.product_id}`)}
                    className="font-medium text-slate-800 hover:text-blue-700 text-left leading-tight"
                  >
                    {item.name}
                  </button>
                ) : (
                  <span className="font-medium text-slate-800 leading-tight">{item.name}</span>
                )}
              </td>
              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                {item.quantity_on_hand}
              </td>
              <td className="py-2 px-3 text-slate-500 hidden sm:table-cell truncate max-w-[140px]">
                {item.category || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
