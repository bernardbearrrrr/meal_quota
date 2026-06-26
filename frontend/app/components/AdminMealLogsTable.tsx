"use client";

import { useCallback, useEffect, useState } from "react";
import MealTypeBadge from "./MealTypeBadge";
import {
  API_BASE_URL,
  authFetch,
  buildQuery,
  MealLogsListResponse,
  MealType,
  parseJsonResponse,
} from "../lib/api";

const MEAL_TYPE_OPTIONS: { value: "" | MealType; label: string }[] = [
  { value: "", label: "All meal types" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "other", label: "Other" },
];

function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

export default function AdminMealLogsTable() {
  const [logs, setLogs] = useState<MealLogsListResponse["data"]>([]);
  const [pagination, setPagination] = useState<MealLogsListResponse["meta"]>({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mealType, setMealType] = useState<"" | MealType>("");
  const [startDate, setStartDate] = useState(getTodayDateString);
  const [endDate, setEndDate] = useState(getTodayDateString);
  const [showAllTime, setShowAllTime] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, mealType, startDate, endDate, showAllTime]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = buildQuery({
        page: currentPage,
        search: debouncedSearch,
        meal_type: mealType,
        show_all: showAllTime ? 1 : undefined,
        start_date: showAllTime ? undefined : startDate,
        end_date: showAllTime ? undefined : endDate,
      });

      const response = await authFetch(`${API_BASE_URL}/admin/meal-logs${query}`);

      if (response.status >= 500) {
        setError("Server error. Unable to load meal logs.");
        return;
      }

      const data = await parseJsonResponse<MealLogsListResponse>(response);

      if (data) {
        setLogs(data.data);
        setPagination(data.meta);
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, mealType, showAllTime, startDate, endDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const inputClassName =
    "block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Meal Logs</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Review meal redemptions categorised by time (breakfast, lunch, dinner).
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search name or department..."
            className={inputClassName}
            aria-label="Search meal logs"
          />
          <select
            value={mealType}
            onChange={(event) => setMealType(event.target.value as "" | MealType)}
            className={inputClassName}
            aria-label="Filter by meal type"
          >
            {MEAL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            disabled={showAllTime}
            className={inputClassName}
            aria-label="Start date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            disabled={showAllTime}
            className={inputClassName}
            aria-label="End date"
          />
        </div>

        <label className="inline-flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showAllTime}
            onChange={(event) => setShowAllTime(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            All Time (bypass date filtering)
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Meal Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Served At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    Loading meal logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    No meal logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {log.employee.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {log.employee.type === "intern" ? (
                        <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                          Intern
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                          {log.employee.employee_id || "—"}
                        </span>
                      )}
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

        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading
              ? "Loading..."
              : `Showing ${logs.length} of ${pagination.total} record${pagination.total === 1 ? "" : "s"} (page ${pagination.current_page} of ${pagination.last_page})`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={loading || pagination.current_page <= 1}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(pagination.last_page, page + 1))}
              disabled={loading || pagination.current_page >= pagination.last_page}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
