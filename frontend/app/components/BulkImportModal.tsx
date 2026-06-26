"use client";

import { useEffect, useRef, useState } from "react";
import {
  bulkImportEmployees,
  BulkImportErrorResponse,
  BulkImportSuccessResponse,
  parseJsonResponse,
} from "../lib/api";

type BulkImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const EXAMPLE_ROWS = [
  {
    name: "Jane Doe",
    department: "Human Resources",
    position: "HR Manager",
    email: "jane.doe@company.com",
  },
  {
    name: "John Smith",
    department: "Engineering",
    position: "Software Engineer",
    email: "john.smith@company.com",
  },
];

export default function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Array<{ row: number; message: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !uploading) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, uploading]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedFile(null);
      setUploading(false);
      setError(null);
      setRowErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
    setRowErrors([]);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("Please select a CSV file to import.");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are accepted.");
      return;
    }

    setUploading(true);
    setError(null);
    setRowErrors([]);

    try {
      const response = await bulkImportEmployees(selectedFile);
      const data = await parseJsonResponse<BulkImportSuccessResponse | BulkImportErrorResponse>(response);

      if (response.ok && data && "data" in data) {
        onSuccess(data.message);
        onClose();
        return;
      }

      if (data && "errors" in data && Array.isArray(data.errors) && data.errors.length > 0) {
        setRowErrors(data.errors);
        setError(data.message ?? "Import failed. No employees were imported.");
        return;
      }

      setError(data?.message ?? "Import failed. Please check your CSV file and try again.");
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close bulk import modal"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => {
          if (!uploading) {
            onClose();
          }
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-import-title"
        className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 id="bulk-import-title" className="text-xl font-bold text-slate-900 dark:text-white">
              Bulk Import CSV
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {step === 1
                ? "Review the required CSV format before uploading your file."
                : "Upload a CSV file to add multiple employees at once."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              step === 1
                ? "bg-indigo-600 text-white"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            }`}
          >
            {step === 1 ? "1" : "✓"}
          </div>
          <div className={`h-0.5 flex-1 ${step === 2 ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"}`} />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              step === 2
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            2
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">CSV Format Requirements</h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <li>First row must contain headers exactly: <code className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-700">name, department, position, email</code></li>
                <li>Header names are case-insensitive (e.g. <code className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-700">Name</code> is valid)</li>
                <li>Each email must be unique and not already registered</li>
                <li>Barcodes are generated automatically — no emails are sent during import</li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      name
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      department
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      position
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      email
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                  {EXAMPLE_ROWS.map((row) => (
                    <tr key={row.email}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-900 dark:text-white">{row.name}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">{row.department}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">{row.position}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">{row.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Next
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label
                htmlFor="bulk-csv-file"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                CSV File
              </label>
              <input
                ref={fileInputRef}
                id="bulk-csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:file:bg-indigo-950/50 dark:file:text-indigo-300"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Selected: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedFile.name}</span>
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                <p className="font-medium">{error}</p>
                {rowErrors.length > 0 && (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {rowErrors.map((rowError) => (
                      <li key={`${rowError.row}-${rowError.message}`}>
                        Row {rowError.row}: {rowError.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError(null);
                  setRowErrors([]);
                }}
                disabled={uploading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={uploading}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleUpload()}
                  disabled={uploading || !selectedFile}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Importing...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      Upload &amp; Import
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
