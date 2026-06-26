"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import MealTypeBadge from "./MealTypeBadge";
import ReportAnalyticsCharts from "./ReportAnalyticsCharts";
import {
  API_BASE_URL,
  AnalyticsRange,
  authFetch,
  buildQuery,
  MEAL_TYPE_LABELS,
  MealType,
  parseJsonResponse,
  ReportResponse,
} from "../lib/api";
import {
  buildDistributionData,
  buildTopDepartments,
  buildTrendData,
  DateFilterMode,
  formatDateRangeLabel,
  getEffectiveDateRange,
  getTrendGranularity,
} from "../lib/reportAnalytics";

const QUICK_RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

const MEAL_TYPE_OPTIONS: { value: "" | MealType; label: string }[] = [
  { value: "", label: "All meal types" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "other", label: "Other" },
];

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800/60" />
      ))}
    </div>
  );
}

function SummaryCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-3 h-8 w-16 rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

export default function ReportsView() {
  const [dateMode, setDateMode] = useState<DateFilterMode>("quick");
  const [quickRange, setQuickRange] = useState<AnalyticsRange>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [mealType, setMealType] = useState<"" | MealType>("");
  const [debouncedName, setDebouncedName] = useState("");
  const [debouncedDepartment, setDebouncedDepartment] = useState("");

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fetchControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(name.trim()), 500);
    return () => clearTimeout(timer);
  }, [name]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDepartment(department.trim()), 500);
    return () => clearTimeout(timer);
  }, [department]);

  const effectiveDates = useMemo(
    () => getEffectiveDateRange(dateMode, quickRange, customStartDate, customEndDate),
    [dateMode, quickRange, customStartDate, customEndDate],
  );

  const trendGranularity = useMemo(() => {
    if (!effectiveDates) {
      return "hour" as const;
    }

    return getTrendGranularity(dateMode, quickRange, effectiveDates.start, effectiveDates.end);
  }, [dateMode, quickRange, effectiveDates]);

  const chartData = useMemo(() => {
    if (!report || !effectiveDates) {
      return {
        trend: [],
        distribution: [],
        departments: [],
      };
    }

    return {
      trend: buildTrendData(report.data, trendGranularity, effectiveDates.start, effectiveDates.end),
      distribution: buildDistributionData(report.summary.by_type),
      departments: buildTopDepartments(report.data),
    };
  }, [report, effectiveDates, trendGranularity]);

  const loadReport = useCallback(async () => {
    if (!effectiveDates) {
      setReport(null);
      setLoading(false);
      return;
    }

    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const query = buildQuery({
        start_date: effectiveDates.start,
        end_date: effectiveDates.end,
        name: debouncedName,
        department: debouncedDepartment,
        meal_type: mealType,
      });

      const response = await authFetch(`${API_BASE_URL}/admin/reports${query}`, {
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      if (response.status === 422) {
        const data = await parseJsonResponse<{ message?: string }>(response);
        setError(data?.message ?? "Invalid filter combination. Please review your inputs.");
        setReport(null);
        return;
      }

      if (response.status >= 500) {
        setError("Server error. Unable to load analytics.");
        setReport(null);
        return;
      }

      const data = await parseJsonResponse<ReportResponse>(response);

      if (data) {
        setReport(data);
      }
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }

      setError("Unable to connect to the server.");
      setReport(null);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [effectiveDates, debouncedName, debouncedDepartment, mealType]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  function handleQuickRangeSelect(range: AnalyticsRange) {
    setDateMode("quick");
    setQuickRange(range);
    setCustomStartDate("");
    setCustomEndDate("");
  }

  function handleCustomStartChange(value: string) {
    setDateMode("custom");
    setCustomStartDate(value);

    if (value) {
      setQuickRange("today");
    }
  }

  function handleCustomEndChange(value: string) {
    setDateMode("custom");
    setCustomEndDate(value);

    if (value) {
      setQuickRange("today");
    }
  }

  function handleExportPdf() {
    if (!report || report.data.length === 0 || !effectiveDates) {
      setExportError("No data available to export for the current filters.");
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const generatedAt = new Date().toLocaleString();
      const periodLabel = formatDateRangeLabel(effectiveDates.start, effectiveDates.end);

      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text("MealQuota", 14, 18);

      doc.setFontSize(12);
      doc.setTextColor(90, 90, 90);
      doc.text("Meal Analytics Report", 14, 26);

      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated: ${generatedAt}`, pageWidth - 14, 18, { align: "right" });

      const filterParts = [
        `Period: ${periodLabel}`,
        debouncedName ? `Name: ${debouncedName}` : null,
        debouncedDepartment ? `Department: ${debouncedDepartment}` : null,
        `Meal Type: ${mealType ? MEAL_TYPE_LABELS[mealType] : "All"}`,
      ].filter(Boolean);

      doc.text(filterParts.join("  |  "), 14, 34);

      const summary = report.summary;
      doc.text(
        [
          `Total Meals: ${summary.total}`,
          `Unique Employees: ${summary.unique_employees}`,
          `Top Meal: ${summary.top_meal_type ? MEAL_TYPE_LABELS[summary.top_meal_type] : "—"}`,
          `Top Dept: ${summary.top_department ?? "—"}`,
        ].join("   "),
        14,
        40,
      );

      autoTable(doc, {
        startY: 46,
        head: [["#", "Name", "Department", "Date", "Time", "Meal Type"]],
        body: report.data.map((row, index) => [
          String(index + 1),
          row.name,
          row.department,
          row.meal_date,
          row.served_at,
          MEAL_TYPE_LABELS[row.meal_type],
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 246, 250] },
        margin: { left: 14, right: 14 },
      });

      doc.save(`meal-analytics-${effectiveDates.start}_to_${effectiveDates.end}.pdf`);
    } catch {
      setExportError("Failed to generate PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const inputClassName =
    "block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

  const summaryCards = [
    {
      label: "Total Meals",
      value: loading ? "—" : (report?.summary.total ?? 0),
      accent: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Unique Employees",
      value: loading ? "—" : (report?.summary.unique_employees ?? 0),
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Top Meal Type",
      value: loading
        ? "—"
        : report?.summary.top_meal_type
          ? MEAL_TYPE_LABELS[report.summary.top_meal_type]
          : "—",
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Top Department",
      value: loading ? "—" : (report?.summary.top_department ?? "—"),
      accent: "text-slate-900 dark:text-white",
    },
  ];

  const breakdownTypes: MealType[] = ["breakfast", "lunch", "dinner"];

  return (
    <div className="space-y-6">
      {/* Row 1: Header & PDF */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Analytics Dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time meal redemption insights with live filters and visual analytics.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={exporting || loading || !report || report.data.length === 0}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 10.5L12 15m0 0l4.5-4.5M12 15V3" />
          </svg>
          {exporting ? "Preparing..." : "Download PDF"}
        </button>
      </div>

      {/* Row 2: Smart Date Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Time Filter
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Quick Select</p>
            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/50">
              {QUICK_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleQuickRangeSelect(option.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    dateMode === "quick" && quickRange === option.value
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Custom Date Range</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">Start date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => handleCustomStartChange(event.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">End date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => handleCustomEndChange(event.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>
            {dateMode === "custom" && effectiveDates && (
              <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                Active range: {formatDateRangeLabel(effectiveDates.start, effectiveDates.end)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Identity Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Identity Filters
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Employee name</label>
            <input
              type="search"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Filter by name..."
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
            <input
              type="search"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="Filter by department..."
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Meal type</label>
            <select
              value={mealType}
              onChange={(event) => setMealType(event.target.value as "" | MealType)}
              className={inputClassName}
            >
              {MEAL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {exportError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300">
          {exportError}
        </div>
      )}

      {/* Row 4: Summary & Breakdown Cards */}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading && !report
            ? Array.from({ length: 4 }).map((_, index) => <SummaryCardSkeleton key={index} />)
            : summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${card.accent}`}>{card.value}</p>
                </div>
              ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {breakdownTypes.map((type) => (
            <div
              key={type}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <MealTypeBadge type={type} />
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {loading ? "—" : (report?.summary.by_type[type] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 5: Visual Analytics */}
      <ReportAnalyticsCharts
        trendData={chartData.trend}
        trendGranularity={trendGranularity}
        distributionData={chartData.distribution}
        departmentData={chartData.departments}
        loading={loading}
      />

      {/* Row 6: Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Meal Log Details</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {loading
              ? "Loading records..."
              : `${report?.data.length ?? 0} record${report?.data.length === 1 ? "" : "s"} matching current filters`}
          </p>
        </div>

        {loading && !report ? (
          <TableSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Meal Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {!report || report.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                      No records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  report.data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{row.name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.department}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.meal_date}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.served_at}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <MealTypeBadge type={row.meal_type} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
