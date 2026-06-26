"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import MealTypeBadge from "./MealTypeBadge";
import {
  API_BASE_URL,
  authFetch,
  buildQuery,
  MEAL_TYPE_LABELS,
  MealType,
  parseJsonResponse,
  ReportResponse,
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

export default function ReportsView() {
  const [startDate, setStartDate] = useState(getTodayDateString);
  const [endDate, setEndDate] = useState(getTodayDateString);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [mealType, setMealType] = useState<"" | MealType>("");

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setExportError(null);

    try {
      const query = buildQuery({
        start_date: startDate,
        end_date: endDate,
        name,
        department,
        meal_type: mealType,
      });

      const response = await authFetch(`${API_BASE_URL}/admin/reports${query}`);

      if (response.status === 422) {
        const data = await parseJsonResponse<{ message?: string }>(response);
        setError(data?.message ?? "Invalid filter combination. Please review your inputs.");
        return;
      }

      if (response.status >= 500) {
        setError("Server error. Unable to generate report.");
        return;
      }

      const data = await parseJsonResponse<ReportResponse>(response);

      if (data) {
        setReport(data);
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  function handleExportPdf() {
    if (!report || report.data.length === 0) {
      setExportError("Generate a report with at least one record before exporting.");
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const generatedAt = new Date().toLocaleString();

      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text("MealQuota", 14, 18);

      doc.setFontSize(12);
      doc.setTextColor(90, 90, 90);
      doc.text("Meal Redemption Report", 14, 26);

      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated: ${generatedAt}`, pageWidth - 14, 18, { align: "right" });

      const filterParts = [
        `Period: ${startDate || "—"} to ${endDate || "—"}`,
        name ? `Name: ${name}` : null,
        department ? `Department: ${department}` : null,
        `Meal Type: ${mealType ? MEAL_TYPE_LABELS[mealType] : "All"}`,
      ].filter(Boolean);

      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(filterParts.join("  |  "), 14, 34);

      const summary = report.summary;
      const summaryLine = [
        `Total Meals: ${summary.total}`,
        `Unique Employees: ${summary.unique_employees}`,
        `Top Meal: ${summary.top_meal_type ? MEAL_TYPE_LABELS[summary.top_meal_type] : "—"}`,
        `Top Dept: ${summary.top_department ?? "—"}`,
      ].join("   ");
      doc.text(summaryLine, 14, 40);

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

      const safeStart = startDate || "all";
      const safeEnd = endDate || "all";
      doc.save(`meal-report-${safeStart}_to_${safeEnd}.pdf`);
    } catch {
      setExportError("Failed to generate PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const inputClassName =
    "block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

  const summaryCards = report
    ? [
        { label: "Total Meals", value: report.summary.total, accent: "text-indigo-600 dark:text-indigo-400" },
        { label: "Unique Employees", value: report.summary.unique_employees, accent: "text-emerald-600 dark:text-emerald-400" },
        {
          label: "Top Meal Type",
          value: report.summary.top_meal_type ? MEAL_TYPE_LABELS[report.summary.top_meal_type] : "—",
          accent: "text-amber-600 dark:text-amber-400",
        },
        { label: "Top Department", value: report.summary.top_department ?? "—", accent: "text-slate-900 dark:text-white" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Reports</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Filter meal redemptions and export a print-ready PDF report.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={exporting || !report || report.data.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 10.5L12 15m0 0l4.5-4.5M12 15V3" />
          </svg>
          {exporting ? "Preparing..." : "Download PDF"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Start date</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">End date</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Meal type</label>
            <select value={mealType} onChange={(event) => setMealType(event.target.value as "" | MealType)} className={inputClassName}>
              {MEAL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Employee name</label>
            <input type="search" value={name} onChange={(event) => setName(event.target.value)} placeholder="Any name" className={inputClassName} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
            <input type="search" value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Any department" className={inputClassName} />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
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

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className={`mt-2 text-2xl font-bold ${card.accent}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {(["breakfast", "lunch", "dinner"] as MealType[]).map((type) => (
              <div key={type} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <MealTypeBadge type={type} />
                <span className="text-lg font-bold text-slate-900 dark:text-white">{report.summary.by_type[type] ?? 0}</span>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                  {report.data.length === 0 ? (
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
                        <td className="whitespace-nowrap px-6 py-4 text-sm"><MealTypeBadge type={row.meal_type} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
