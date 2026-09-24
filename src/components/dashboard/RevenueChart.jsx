import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { formatINR } from "../../utils/currency";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatRupee(value) {
  if (value == null || isNaN(value)) return "Rs.0";
  if (value >= 100000) return `Rs.${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `Rs.${(value / 1000).toFixed(1)}K`;
  return `Rs.${value.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs min-w-[140px]">
      <div className="font-bold text-slate-800 mb-1">{formatDate(label)}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-500">Revenue</span>
        <span className="font-mono font-bold text-slate-900">{formatINR(d?.revenue)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 mt-0.5">
        <span className="text-slate-500">Transactions</span>
        <span className="font-mono font-semibold text-slate-700">{d?.transaction_count ?? 0}</span>
      </div>
    </div>
  );
};

export default function RevenueChart({ data = [] }) {
  const safeData = data
    .filter((d) => d && d.date && typeof d.revenue === "number" && !isNaN(d.revenue))
    .map((d) => ({ ...d, revenue: Math.max(0, d.revenue) }));

  if (safeData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-400">
        No revenue data available for the selected period.
      </div>
    );
  }

  const maxRevenue = Math.max(...safeData.map((d) => d.revenue), 0);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={safeData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1e293b" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#1e293b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "ui-monospace, monospace" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatRupee}
          tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "ui-monospace, monospace" }}
          axisLine={false}
          tickLine={false}
          width={56}
          domain={[0, Math.ceil(maxRevenue * 1.15)]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#1e293b", strokeWidth: 1, strokeDasharray: "4 2" }} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#1e293b"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#1e293b", stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
