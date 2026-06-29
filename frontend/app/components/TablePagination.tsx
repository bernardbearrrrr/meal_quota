"use client";

import { PER_PAGE_OPTIONS } from "../lib/api";

type TablePaginationProps = {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  shownCount: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
};

export default function TablePagination({
  currentPage,
  lastPage,
  total,
  perPage,
  shownCount,
  loading = false,
  onPageChange,
  onPerPageChange,
}: TablePaginationProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          Rows per page:
          <select
            value={perPage}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            aria-label="Rows per page"
          >
            {PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          {loading
            ? "Loading..."
            : `Showing ${shownCount} of ${total} record${total === 1 ? "" : "s"} (page ${currentPage} of ${lastPage})`}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={loading || currentPage <= 1}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(lastPage, currentPage + 1))}
          disabled={loading || currentPage >= lastPage}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Next
        </button>
      </div>
    </div>
  );
}
