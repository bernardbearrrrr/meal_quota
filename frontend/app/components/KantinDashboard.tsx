"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import MealTypeBadge from "./MealTypeBadge";
import {
  authFetch,
  getMealDashboard,
  MEAL_TYPE_LABELS,
  MealDashboardResponse,
  MealType,
  parseJsonResponse,
} from "../lib/api";

const MEAL_TYPE_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "other"];

const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: "#f59e0b",
  lunch: "#10b981",
  dinner: "#6366f1",
  other: "#94a3b8",
};

const EMPTY_DASHBOARD: MealDashboardResponse = {
  total_today: 0,
  by_type: { breakfast: 0, lunch: 0, dinner: 0, other: 0 },
  recent: [],
};

export default function KantinDashboard() {
  const [data, setData] = useState<MealDashboardResponse>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await getMealDashboard();

      if (response.status >= 500) {
        setError("Server error. Unable to load dashboard.");
        return;
      }

      const payload = await parseJsonResponse<MealDashboardResponse>(response);

      if (payload) {
        setData(payload);
        setError(null);
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Live data: silently refresh scorecard, chart, and feed every 3 seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      void loadDashboard({ silent: true });
    }, 3000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  const chartData = MEAL_TYPE_ORDER.map((type) => ({
    type,
    name: MEAL_TYPE_LABELS[type],
    value: data.by_type[type] ?? 0,
  })).filter((entry) => entry.value > 0);

  const hasChartData = chartData.length > 0;

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Kantin Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Live overview of today&apos;s meal distribution.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Total Porsi Terdistribusi Hari Ini
            </p>
          </div>
          <p className="mt-6 text-5xl font-bold text-slate-900 dark:text-white">
            {loading ? "—" : data.total_today}
          </p>
          <p className="mt-2 text-xs text-slate-400">Auto-updates every 3 seconds</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Distribusi Hari Ini</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Grouped by meal type (breakfast, lunch, dinner, other).
          </p>

          <div className="mt-4 h-[280px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Loading chart...
              </div>
            ) : hasChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.type} fill={MEAL_TYPE_COLORS[entry.type]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "0.5rem",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.875rem",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No meals distributed yet today.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Scans</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              The last 5 employees who scanned successfully.
            </p>
          </div>
          <Link
            href="/kantin/logs"
            className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Meal Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Served At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    Loading recent scans...
                  </td>
                </tr>
              ) : data.recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    No scans yet.
                  </td>
                </tr>
              ) : (
                data.recent.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {log.employee.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {log.employee.department}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <MealTypeBadge type={log.meal_type} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {log.served_at}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
