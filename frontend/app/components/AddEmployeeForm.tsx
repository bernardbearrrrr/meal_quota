"use client";

import { FormEvent, useState } from "react";
import {
  API_BASE_URL,
  authFetch,
  EmployeeRecord,
  parseJsonResponse,
} from "../lib/api";
import { openBarcodeDraftEmail } from "../lib/barcodeEmail";

type CreateEmployeeResponse = {
  message?: string;
  data?: EmployeeRecord;
  errors?: Record<string, string[]>;
};

export default function AddEmployeeForm() {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await authFetch(`${API_BASE_URL}/admin/employees`, {
        method: "POST",
        body: JSON.stringify({ name, department, email }),
      });

      if (response.status >= 500) {
        setError("Server error. Please try again later.");
        return;
      }

      const data = await parseJsonResponse<CreateEmployeeResponse>(response);

      if (response.status === 201 && data?.data) {
        setSuccess(data.message ?? "Employee created successfully.");
        setName("");
        setDepartment("");
        setEmail("");
        openBarcodeDraftEmail(data.data.email, data.data.name, data.data.uid);
        return;
      }

      const validationErrors = data?.errors
        ? Object.values(data.errors).flat().join(" ")
        : null;

      setError(validationErrors ?? data?.message ?? "Failed to create employee. Please try again.");
    } catch {
      setError("Unable to connect to the server. Please check the API URL configuration.");
    } finally {
      setLoading(false);
    }
  }

  const inputClassName =
    "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-900";

  return (
    <div>
      {success && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{success}</p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={loading}
            placeholder="e.g. Jane Doe"
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Department
          </label>
          <input
            id="department"
            name="department"
            type="text"
            required
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            disabled={loading}
            placeholder="e.g. Engineering"
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            placeholder="e.g. jane.doe@company.com"
            className={inputClassName}
          />
        </div>

        <div className="flex items-center justify-end border-t border-slate-100 pt-6 dark:border-slate-800">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-400 dark:focus:ring-offset-slate-900"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              "Save & Draft Email"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
