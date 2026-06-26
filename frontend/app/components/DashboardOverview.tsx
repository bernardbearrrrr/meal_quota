"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  API_BASE_URL,
  authFetch,
  EmployeesListResponse,
  parseJsonResponse,
} from "../lib/api";

export default function DashboardOverview() {
  const [total, setTotal] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await authFetch(`${API_BASE_URL}/admin/employees`);

        if (response.status >= 500) {
          setError("Unable to load dashboard statistics.");
          return;
        }

        const data = await parseJsonResponse<EmployeesListResponse>(response);

        if (data) {
          setTotal(data.meta.total);
          setActiveCount(data.data.filter((employee) => employee.is_active !== false).length);
        }
      } catch {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Monitor employee registrations and meal quota enrollment at a glance.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Employees</p>
          <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">
            {loading ? "—" : (total ?? 0)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Registered in the meal quota system</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Employees</p>
          <p className="mt-3 text-4xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "—" : (activeCount ?? 0)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Eligible for daily meal redemption</p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/40 sm:col-span-2 xl:col-span-1">
          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Quick Actions</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/admin/add"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Add New Employee
            </Link>
            <Link
              href="/admin/employees"
              className="rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-slate-800"
            >
              View All Employees
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
