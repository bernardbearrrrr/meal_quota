"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
  showSectionHeader?: boolean;
  forceLightTheme?: boolean;
};

function useChartTheme(forceLightTheme = false) {
  const { resolvedTheme } = useTheme();
  const isDark = !forceLightTheme && resolvedTheme === "dark";

  return useMemo(
    () => ({
      isDark,
      gridStroke: isDark ? "#475569" : "#cbd5e1",
      gridOpacity: isDark ? 0.45 : 0.35,
      axisStroke: isDark ? "#64748b" : "#cbd5e1",
      tickFill: isDark ? "#cbd5e1" : "#64748b",
      labelFill: isDark ? "#e2e8f0" : "#475569",
      tooltipContentStyle: {
        borderRadius: "0.5rem",
        border: `1px solid ${isDark ? "#475569" : "#e2e8f0"}`,
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        color: isDark ? "#f1f5f9" : "#334155",
        fontSize: "0.8rem",
        boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.35)" : "0 2px 8px rgba(15,23,42,0.08)",
      },
      tooltipItemStyle: {
        color: isDark ? "#f1f5f9" : "#334155",
      },
      legendColor: isDark ? "#cbd5e1" : "#64748b",
      pieLabelLine: isDark ? "#94a3b8" : "#64748b",
      pieLabelFill: isDark ? "#e2e8f0" : "#475569",
    }),
    [isDark],
  );
}

function renderPieLabel(
  theme: ReturnType<typeof useChartTheme>,
  props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
    name?: string;
  },
) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, name = "" } = props;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.15;
  const radian = (-midAngle * Math.PI) / 180;
  const x = cx + radius * Math.cos(radian);
  const y = cy + radius * Math.sin(radian);

  return (
    <text
      x={x}
      y={y}
      fill={theme.pieLabelFill}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700/50"
      style={{ height }}
    />
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
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
  showSectionHeader = true,
  forceLightTheme = false,
}: ReportAnalyticsChartsProps) {
  const theme = useChartTheme(forceLightTheme);

  const trendTitle =
    trendGranularity === "hour"
      ? "Meals per hour"
      : trendGranularity === "day"
        ? "Meals per day"
        : "Meals per month";

  const useLineChart = trendGranularity !== "hour";
  const labelListProps = {
    fill: theme.labelFill,
    fontSize: 12,
    fontWeight: 600,
  } as const;

  const axisTick = { fontSize: 11, fill: theme.tickFill };

  return (
    <section className="space-y-4 transition-colors">
      {showSectionHeader && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Analytics Overview</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Live visualizations based on your current filters.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800 xl:col-span-2">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Meal Trend</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{trendTitle}</p>
          <div className="mt-4 text-slate-600 dark:text-slate-300">
            {loading ? (
              <ChartSkeleton />
            ) : trendData.every((point) => point.count === 0) ? (
              <EmptyChartState message="No trend data for this period." />
            ) : useLineChart ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData} margin={{ top: 20, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.gridStroke}
                    strokeOpacity={theme.gridOpacity}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={axisTick}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: theme.axisStroke, strokeOpacity: 0.5 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={theme.tooltipContentStyle}
                    itemStyle={theme.tooltipItemStyle}
                    formatter={(value) => [`${value} meal(s)`, "Total"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#6366f1" }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  >
                    <LabelList dataKey="count" position="top" {...labelListProps} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData} margin={{ top: 20, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.gridStroke}
                    strokeOpacity={theme.gridOpacity}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={axisTick}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: theme.axisStroke, strokeOpacity: 0.5 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#6366f1", fillOpacity: theme.isDark ? 0.15 : 0.08 }}
                    contentStyle={theme.tooltipContentStyle}
                    itemStyle={theme.tooltipItemStyle}
                    formatter={(value) => [`${value} meal(s)`, "Total"]}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                    <LabelList dataKey="count" position="top" {...labelListProps} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Meal Distribution</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Breakfast, lunch, dinner & other</p>
          <div className="mt-4 text-slate-600 dark:text-slate-300">
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
                    isAnimationActive={false}
                    label={(props) => renderPieLabel(theme, props)}
                    labelLine={{ stroke: theme.pieLabelLine, strokeWidth: 1 }}
                  >
                    {distributionData.map((entry) => (
                      <Cell key={entry.type} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={theme.tooltipContentStyle}
                    itemStyle={theme.tooltipItemStyle}
                    formatter={(value, _name, item) => {
                      const payload = item.payload as DistributionPoint;
                      return [`${value} meal(s)`, payload.name];
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: theme.legendColor }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800 xl:col-span-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top Departments</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Departments with the highest meal usage</p>
          <div className="mt-4 text-slate-600 dark:text-slate-300">
            {loading ? (
              <ChartSkeleton height={240} />
            ) : departmentData.length === 0 ? (
              <EmptyChartState message="No department data." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, departmentData.length * 36)}>
                <BarChart
                  data={departmentData}
                  layout="vertical"
                  margin={{ top: 4, right: 36, left: 8, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.gridStroke}
                    strokeOpacity={theme.gridOpacity}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    width={120}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={theme.tooltipContentStyle}
                    itemStyle={theme.tooltipItemStyle}
                    formatter={(value) => [`${value} meal(s)`, "Total"]}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
                    <LabelList dataKey="count" position="right" {...labelListProps} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
