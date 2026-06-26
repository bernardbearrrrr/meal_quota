"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartPoint, DepartmentPoint, DistributionPoint, TrendGranularity } from "../lib/reportAnalytics";

type ReportAnalyticsChartsProps = {
  trendData: ChartPoint[];
  trendGranularity: TrendGranularity;
  distributionData: DistributionPoint[];
  departmentData: DepartmentPoint[];
  loading?: boolean;
};

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/60"
      style={{ height }}
    />
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">
      {message}
    </div>
  );
}

export default function ReportAnalyticsCharts({
  trendData,
  trendGranularity,
  distributionData,
  departmentData,
  loading = false,
}: ReportAnalyticsChartsProps) {
  const trendTitle =
    trendGranularity === "hour"
      ? "Meals per hour"
      : trendGranularity === "day"
        ? "Meals per day"
        : "Meals per month";

  const useLineChart = trendGranularity !== "hour";

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Analytics Overview</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Live visualizations based on your current filters.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Meal Trend</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{trendTitle}</p>
          <div className="mt-4">
            {loading ? (
              <ChartSkeleton />
            ) : trendData.every((point) => point.count === 0) ? (
              <EmptyChartState message="No trend data for this period." />
            ) : useLineChart ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1", strokeOpacity: 0.4 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}
                    formatter={(value) => [`${value} meal(s)`, "Total"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#6366f1" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1", strokeOpacity: 0.4 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "#6366f1", fillOpacity: 0.08 }}
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}
                    formatter={(value) => [`${value} meal(s)`, "Total"]}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Meal Distribution</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Breakfast, lunch, dinner & other</p>
          <div className="mt-4">
            {loading ? (
              <ChartSkeleton />
            ) : distributionData.length === 0 ? (
              <EmptyChartState message="No distribution data." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {distributionData.map((entry) => (
                      <Cell key={entry.type} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}
                    formatter={(value, _name, item) => {
                      const payload = item.payload as DistributionPoint;
                      return [`${value} meal(s)`, payload.name];
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Top Departments</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Departments with the highest meal usage</p>
          <div className="mt-4">
            {loading ? (
              <ChartSkeleton height={240} />
            ) : departmentData.length === 0 ? (
              <EmptyChartState message="No department data." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, departmentData.length * 36)}>
                <BarChart
                  data={departmentData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.3} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="department"
                    width={120}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}
                    formatter={(value) => [`${value} meal(s)`, "Total"]}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
