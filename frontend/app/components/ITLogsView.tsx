"use client";

import { useCallback, useEffect, useState } from "react";
import { getSystemLogs, LogEntry, parseJsonResponse } from "../lib/api";

type LogsResponse = {
  data: LogEntry[];
  meta?: { total: number };
};

function levelClasses(level: string): string {
  switch (level.toUpperCase()) {
    case "ERROR":
    case "CRITICAL":
    case "EMERGENCY":
    case "ALERT":
      return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    case "WARNING":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
    default:
      return "text-slate-700 dark:text-slate-300";
  }
}

function levelBadge(level: string): string {
  switch (level.toUpperCase()) {
    case "ERROR":
    case "CRITICAL":
    case "EMERGENCY":
    case "ALERT":
      return "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200";
    case "WARNING":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200";
    case "INFO":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

export default function ITLogsView() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getSystemLogs();

      if (response.status >= 500) {
        setError("Server error. Unable to load logs.");
        return;
      }

      const data = await parseJsonResponse<LogsResponse>(response);

      if (data) {
        setLogs(data.data);
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Error Logs</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Latest entries from <code className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-700">laravel.log</code> (most recent first).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadLogs()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Timestamp</th>
                <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Level</th>
                <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    No log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={`${log.timestamp}-${index}`} className={levelClasses(log.level)}>
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-xs">
                      {log.timestamp}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${levelBadge(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className="line-clamp-2 font-mono text-xs">{log.message}</span>
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
