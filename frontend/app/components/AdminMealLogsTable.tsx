"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import ConfirmDialog from "./ConfirmDialog";
import MealTypeBadge from "./MealTypeBadge";
import MealTypeFilter from "./MealTypeFilter";
import TablePagination from "./TablePagination";
import {
  API_BASE_URL,
  authFetch,
  buildQuery,
  deleteMealLog,
  MealLogRecord,
  MealLogsListResponse,
  MealType,
  parseJsonResponse,
} from "../lib/api";

function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

function buildMealTypesQuery(base: string, mealTypes: MealType[]): string {
  if (mealTypes.length === 0) {
    return base;
  }

  const encoded = mealTypes.map((type) => `meal_types[]=${encodeURIComponent(type)}`).join("&");
  return base ? `${base}&${encoded}` : `?${encoded}`;
}

export default function AdminMealLogsTable() {
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
  const [deleteTarget, setDeleteTarget] = useState<MealLogRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, mealTypes, startDate, endDate, showAllTime, perPage]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadLogs = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const baseQuery = buildQuery({
        page: currentPage,
        per_page: perPage,
        search: debouncedSearch,
        show_all: showAllTime ? 1 : undefined,
        start_date: showAllTime ? undefined : startDate,
        end_date: showAllTime ? undefined : endDate,
      });
      const query = buildMealTypesQuery(baseQuery, mealTypes);

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
  }, [currentPage, perPage, debouncedSearch, mealTypes, showAllTime, startDate, endDate]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  // Live data: silently refresh the table every 3 seconds.
  useAutoRefresh(loadLogs);

  async function handleVoidLog() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      const response = await deleteMealLog(deleteTarget.id);

      if (response.status >= 500) {
        setToast({ type: "error", message: "Server error. Unable to void this record." });
        return;
      }

      const data = await parseJsonResponse<{ message?: string }>(response);

      if (response.ok) {
        setToast({
          type: "success",
          message: data?.message ?? "Meal record voided. Employee quota restored.",
        });
        setDeleteTarget(null);
        await loadLogs({ silent: true });
        return;
      }

      setToast({ type: "error", message: data?.message ?? "Unable to void this record." });
    } catch {
      setToast({ type: "error", message: "Unable to connect to the server." });
    } finally {
      setDeleting(false);
    }
  }

  const inputClassName =
    "block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800";

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="alert"
          className={`fixed right-4 top-4 z-60 flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          <p>{toast.message}</p>
        </div>
      )}

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
          <MealTypeFilter selected={mealTypes} onChange={setMealTypes} />
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
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    Loading meal logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
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
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(log)}
                        aria-label={`Void meal record for ${log.employee.name}`}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
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

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Void Meal Record"
        description={<p>Are you sure you want to void this meal record? The employee quota will be restored.</p>}
        confirmLabel="Yes, Void Record"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleVoidLog()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
