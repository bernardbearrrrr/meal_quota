"use client";

import { FormEvent, useState } from "react";
import {
  API_BASE_URL,
  authFetch,
  EmployeeRecord,
  parseJsonResponse,
} from "../lib/api";
import { openOutlookDraftEmail } from "../lib/barcodeEmail";
import ConfirmDialog from "./ConfirmDialog";

type CreateEmployeeResponse = {
  message?: string;
  data?: EmployeeRecord;
  errors?: Record<string, string[]>;
};

type AddEmployeeFormProps = {
  onSuccess?: (employee: EmployeeRecord) => void;
  onCancel?: () => void;
  showCancel?: boolean;
};

export default function AddEmployeeForm({
  onSuccess,
  onCancel,
  showCancel = false,
}: AddEmployeeFormProps) {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdEmployee, setCreatedEmployee] = useState<EmployeeRecord | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  async function submitEmployee() {
    setLoading(true);
    setSuccess(null);
    setError(null);
    setCreatedEmployee(null);

    try {
      const response = await authFetch(`${API_BASE_URL}/admin/employees`, {
        method: "POST",
        body: JSON.stringify({ name, department, position, email }),
      });

      if (response.status >= 500) {
        setError("Server error. Please try again later.");
        return;
      }

      const data = await parseJsonResponse<CreateEmployeeResponse>(response);

      if (response.status === 201 && data?.data) {
        setSuccess(data.message ?? "Employee created successfully.");
        setCreatedEmployee(data.data);
        setName("");
        setDepartment("");
        setPosition("");
        setEmail("");
        onSuccess?.(data.data);
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
      setShowSaveConfirm(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowSaveConfirm(true);
  }

  const inputClassName =
    "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-900";

  const draftEmailButtonClassName =
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500";

  return (
    <div>
      {success && (
        <div
          role="alert"
          className="mb-6 flex flex-col items-start justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{success}</p>
          </div>
          {createdEmployee && (
            <button
              type="button"
              onClick={() =>
                openOutlookDraftEmail({
                  email: createdEmployee.email,
                  name: createdEmployee.name,
                  position: createdEmployee.position ?? "",
                  uid: createdEmployee.uid,
                })
              }
              className={draftEmailButtonClassName}
            >
              Draft Email
            </button>
          )}
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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="add-employee-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Full Name
          </label>
          <input
            id="add-employee-name"
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
          <label htmlFor="add-employee-position" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Position
          </label>
          <input
            id="add-employee-position"
            name="position"
            type="text"
            required
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            disabled={loading}
            placeholder="e.g. Software Engineer"
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="add-employee-department" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Department
          </label>
          <input
            id="add-employee-department"
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
          <label htmlFor="add-employee-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email Address
          </label>
          <input
            id="add-employee-email"
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

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end dark:border-slate-800">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          )}
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
              "Save Employee"
            )}
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Confirm Employee Registration"
        description={
          <>
            <p>Please review the following details before proceeding:</p>
            <dl className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Full Name</dt>
                <dd className="font-medium text-right">{name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Position</dt>
                <dd className="font-medium text-right">{position}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Department</dt>
                <dd className="font-medium text-right">{department}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Email</dt>
                <dd className="font-medium text-right">{email}</dd>
              </div>
            </dl>
            <p className="mt-4">Is this information complete and correct?</p>
          </>
        }
        confirmLabel="Confirm & Save"
        cancelLabel="Review Again"
        variant="primary"
        loading={loading}
        onConfirm={() => void submitEmployee()}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </div>
  );
}
