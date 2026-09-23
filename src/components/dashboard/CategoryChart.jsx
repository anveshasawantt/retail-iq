import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const PALETTE = [
  "#1e293b", "#334155", "#475569", "#64748b", "#94a3b8",
  "#0f766e", "#0369a1", "#4f46e5", "#b45309", "#15803d",
  "#9333ea", "#be123c"
];

function truncateCat(name, max = 20) {
  if (!name) return "";
  return name.length > max ? name.slice(0, max) + "..." : name;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <div className="font-bold text-slate-800 mb-1">{d?.category}</div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Revenue</span>
        <span className="font-mono font-bold text-slate-900">{formatINR(d?.revenue)}</span>
      </div>
      <div className="flex justify-between gap-4 mt-0.5">
        <span className="text-slate-500">Units Sold</span>
        <span className="font-mono font-semibold text-slate-700">{d?.units_sold ?? 0}</span>
      </div>
    </div>
  );
};

export default function CategoryChart({ data = [] }) {
  const safe = data
    .filter((d) => d && d.category && typeof d.revenue === "number" && d.revenue > 0)
    .slice(0, 10)
    .map((d) => ({ ...d, shortCat: truncateCat(d.category) }));

  if (safe.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-slate-400">
        No category breakdown available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, safe.length * 34)}>
      <BarChart
        data={safe}
        layout="vertical"
        margin={{ top: 4, right: 80, left: 4, bottom: 4 }}
        barSize={13}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "ui-monospace, monospace" }}
          tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="shortCat"
          tick={{ fontSize: 10, fill: "#475569", fontFamily: "inherit" }}
          axisLine={false}
          tickLine={false}
          width={148}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="revenue" radius={[0, 3, 3, 0]}>
          {safe.map((_, index) => (
            <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
