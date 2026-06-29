"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import MealTypeBadge from "./MealTypeBadge";
import MealTypeFilter from "./MealTypeFilter";
import TablePagination from "./TablePagination";
import {
  API_BASE_URL,
  authFetch,
  MealLogsListResponse,
  MealType,
  parseJsonResponse,
} from "../lib/api";

function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

export default function MealLogsTable() {
  const [logs, setLogs] = useState<MealLogsListResponse["data"]>([]);
  const [pagination, setPagination] = useState<MealLogsListResponse["meta"]>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [startDate, setStartDate] = useState(getTodayDateString);
  const [endDate, setEndDate] = useState(getTodayDateString);
  const [showAllTime, setShowAllTime] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, mealTypes, startDate, endDate, showAllTime, perPage]);

  const loadLogs = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("per_page", String(perPage));

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      mealTypes.forEach((type) => params.append("meal_types[]", type));

      if (showAllTime) {
        params.set("show_all", "1");
      } else {
        if (startDate) {
          params.set("start_date", startDate);
        }

        if (endDate) {
          params.set("end_date", endDate);
        }
      }

      const response = await authFetch(`${API_BASE_URL}/meals/logs?${params.toString()}`);

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
  }, [currentPage, perPage, debouncedSearch, mealTypes, endDate, showAllTime, startDate]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  // Live data: silently refresh the table every 3 seconds.
  useAutoRefresh(loadLogs);

  const inputClassName =
    "block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

  function handleStartDateChange(value: string) {
    setStartDate(value);

    if (endDate && value > endDate) {
      setEndDate(value);
    }
  }

  function handleEndDateChange(value: string) {
    setEndDate(value);

    if (startDate && value < startDate) {
      setStartDate(value);
    }
  }

  return (
    <div className="flex flex-1 flex-col p-6 lg:p-8">
      <div className="mb-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="meal-log-search" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Search by name or department
            </label>
            <input
              id="meal-log-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search employees..."
              className={inputClassName}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Meal type</span>
            <MealTypeFilter selected={mealTypes} onChange={setMealTypes} />
          </div>

          <div>
            <label htmlFor="meal-log-start-date" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Start date
            </label>
            <input
              id="meal-log-start-date"
              type="date"
              value={startDate}
              onChange={(event) => handleStartDateChange(event.target.value)}
              disabled={showAllTime}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="meal-log-end-date" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              End date
            </label>
            <input
              id="meal-log-end-date"
              type="date"
              value={endDate}
              onChange={(event) => handleEndDateChange(event.target.value)}
              disabled={showAllTime}
              className={inputClassName}
            />
          </div>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showAllTime}
            onChange={(event) => setShowAllTime(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            All Time (bypass date filtering)
          </span>
        </label>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Meal Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Served At
                </th>
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
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
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

        <TablePagination
          currentPage={pagination.current_page}
          lastPage={pagination.last_page}
          total={pagination.total}
          perPage={perPage}
          shownCount={logs.length}
          loading={loading}
          onPageChange={setCurrentPage}
          onPerPageChange={setPerPage}
        />
      </div>
    </div>
  );
}
