import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { formatINR } from "../../utils/currency";

const COLORS = ["#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9", "#f8fafc", "#fff"];

function truncateName(name, max = 22) {
  if (!name) return "";
  return name.length > max ? name.slice(0, max) + "..." : name;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <div className="font-bold text-slate-800 mb-1 leading-tight">{d?.name}</div>
      {d?.category && <div className="text-slate-400 mb-1.5 text-[10px]">{d.category}</div>}
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Units Sold</span>
        <span className="font-mono font-bold text-slate-900">{d?.units_sold ?? 0}</span>
      </div>
      <div className="flex justify-between gap-4 mt-0.5">
        <span className="text-slate-500">Revenue</span>
        <span className="font-mono font-semibold text-emerald-700">{formatINR(d?.revenue)}</span>
      </div>
    </div>
  );
};

export default function TopProductsChart({ data = [] }) {
  const safe = data
    .filter((d) => d && d.name && typeof d.units_sold === "number")
    .slice(0, 7)
    .map((d) => ({ ...d, shortName: truncateName(d.name) }));

  if (safe.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-slate-400">
        No product sales data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, safe.length * 38)}>
      <BarChart
        data={safe}
        layout="vertical"
        margin={{ top: 4, right: 60, left: 4, bottom: 4 }}
        barSize={14}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "ui-monospace, monospace" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          tick={{ fontSize: 10, fill: "#475569", fontFamily: "inherit" }}
          axisLine={false}
          tickLine={false}
          width={150}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="units_sold" radius={[0, 3, 3, 0]}>
          {safe.map((_, index) => (
            <Cell key={index} fill={index === 0 ? "#1e293b" : index === 1 ? "#334155" : "#64748b"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
