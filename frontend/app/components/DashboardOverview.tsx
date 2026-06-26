"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import MealTrendChart from "./MealTrendChart";
import {
  AnalyticsRange,
  AnalyticsResponse,
  API_BASE_URL,
  authFetch,
  buildQuery,
  EmployeesListResponse,
  isEmployeeActive,
  parseJsonResponse,
} from "../lib/api";

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

export default function DashboardOverview() {
  const [total, setTotal] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [range, setRange] = useState<AnalyticsRange>("today");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await authFetch(`${API_BASE_URL}/admin/employees`);

        if (response.status >= 500) {
          setStatsError("Unable to load dashboard statistics.");
          return;
        }

        const data = await parseJsonResponse<EmployeesListResponse>(response);

        if (data) {
          setTotal(data.meta.total);
          setActiveCount(data.data.filter((employee) => isEmployeeActive(employee)).length);
        }
      } catch {
        setStatsError("Unable to connect to the server.");
      } finally {
        setStatsLoading(false);
      }
    }

    loadStats();
  }, []);

  const loadAnalytics = useCallback(async () => {
    setChartLoading(true);
    setChartError(null);

    try {
      const response = await authFetch(`${API_BASE_URL}/admin/analytics${buildQuery({ range })}`);

      if (response.status >= 500) {
        setChartError("Unable to load meal trend.");
        return;
      }

      const data = await parseJsonResponse<AnalyticsResponse>(response);

      if (data) {
        setAnalytics(data);
      }
    } catch {
      setChartError("Unable to connect to the server.");
    } finally {
      setChartLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Monitor employee registrations and meal redemption trends at a glance.
        </p>
      </div>

      {statsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {statsError}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Employees</p>
          <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">
            {statsLoading ? "—" : (total ?? 0)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Registered in the meal quota system</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Employees</p>
          <p className="mt-3 text-4xl font-bold text-emerald-600 dark:text-emerald-400">
            {statsLoading ? "—" : (activeCount ?? 0)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Eligible for daily meal redemption</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Meals This Range</p>
          <p className="mt-3 text-4xl font-bold text-indigo-600 dark:text-indigo-400">
            {chartLoading ? "—" : (analytics?.meta.total ?? 0)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Total scans for the selected period</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Meal Trend</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {range === "today" ? "Meals served per hour today" : "Meals served over the selected period"}
            </p>
          </div>

          <div className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/50">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === option.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {chartError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              {chartError}
            </div>
          ) : chartLoading ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
              Loading chart...
            </div>
          ) : analytics && analytics.data.length > 0 ? (
            <MealTrendChart data={analytics.data} />
          ) : (
            <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
              No meal data for this period.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/40">
        <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Quick Actions</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/employees"
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Manage Employees
          </Link>
          <Link
            href="/admin/reports"
            className="rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-slate-800"
          >
            Generate Report
          </Link>
        </div>
      </div>
    </div>
  );
}
