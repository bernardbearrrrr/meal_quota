"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyticsPoint } from "../lib/api";

type MealTrendChartProps = {
  data: AnalyticsPoint[];
};

export default function MealTrendChart({ data }: MealTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.3} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={{ stroke: "#cbd5e1", strokeOpacity: 0.4 }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "#6366f1", fillOpacity: 0.08 }}
          contentStyle={{
            borderRadius: "0.5rem",
            border: "1px solid #e2e8f0",
            fontSize: "0.8rem",
          }}
          labelStyle={{ fontWeight: 600 }}
          formatter={(value) => [`${value} meal(s)`, "Total"]}
        />
        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
