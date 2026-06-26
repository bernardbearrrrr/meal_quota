"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  API_BASE_URL,
  authFetch,
  EmployeeRecord,
  parseJsonResponse,
} from "../lib/api";
import { openOutlookDraftEmail } from "../lib/barcodeEmail";
import ConfirmDialog from "./ConfirmDialog";

type EmployeeDetailModalProps = {
  employee: EmployeeRecord;
  isOpen: boolean;
  onClose: () => void;
  onQuotaUpdated?: (employee: EmployeeRecord, message: string) => void;
  onStatusUpdated?: (employee: EmployeeRecord, message: string) => void;
  refreshData: () => Promise<void>;
};

type QuotaUpdateResponse = {
  message?: string;
  data?: EmployeeRecord;
  errors?: Record<string, string[]>;
};

type StatusUpdateResponse = {
  message?: string;
  data?: EmployeeRecord;
};

export default function EmployeeDetailModal({
  employee,
  isOpen,
  onClose,
  onQuotaUpdated,
  onStatusUpdated,
  refreshData,
}: EmployeeDetailModalProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [quotaInput, setQuotaInput] = useState<string>(String(employee.quota_today ?? 1));
  const [quotaSaving, setQuotaSaving] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const isInactive = employee.status === "inactive";

  useEffect(() => {
    setQuotaInput(String(employee.quota_today ?? 1));
    setQuotaError(null);
  }, [employee.id, employee.quota_today]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  async function handleSaveQuota() {
    const parsed = Number(quotaInput);

    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 50) {
      setQuotaError("Quota must be a whole number between 0 and 50.");
      return;
    }

    setQuotaSaving(true);
    setQuotaError(null);

    try {
      const response = await authFetch(`${API_BASE_URL}/admin/employees/${employee.id}/quota`, {
        method: "PATCH",
        body: JSON.stringify({ quota_today: parsed }),
      });

      if (response.status >= 500) {
        setQuotaError("Server error. Unable to update quota.");
        return;
      }

      const data = await parseJsonResponse<QuotaUpdateResponse>(response);

      if (response.ok && data?.data) {
        onQuotaUpdated?.(data.data, data.message ?? "Daily quota updated.");
        return;
      }

      const validationError = data?.errors ? Object.values(data.errors).flat()[0] : null;
      setQuotaError(validationError ?? data?.message ?? "Failed to update quota.");
    } catch {
      setQuotaError("Unable to connect to the server.");
    } finally {
      setQuotaSaving(false);
    }
  }

  async function handleResign(id: number) {
    if (employee.status !== "active") {
      return;
    }

    setStatusSaving(true);

    try {
      const response = await authFetch(`${API_BASE_URL}/admin/employees/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "inactive" }),
      });

      if (response.status >= 500) {
        return;
      }

      const data = await parseJsonResponse<StatusUpdateResponse>(response);

      if (response.ok && data?.data) {
        setShowResignConfirm(false);
        onStatusUpdated?.(data.data, data.message ?? `${employee.name} has been marked as resigned.`);
        await refreshData();
        return;
      }
    } catch {
      // Parent handles connection errors via toast
    } finally {
      setStatusSaving(false);
    }
  }

  function handleDownloadQr() {
    const canvas = qrCanvasRef.current;

    if (!canvas) {
      return;
    }

    const link = document.createElement("a");
    const safeName = employee.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    link.download = `${safeName || "employee"}-qr-access.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-detail-title"
        className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-200 ease-out dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 id="employee-detail-title" className="text-xl font-bold text-slate-900 dark:text-white">
              {employee.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {employee.position ? `${employee.position} · ${employee.department}` : employee.department}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Position</dt>
            <dd className="mt-1 text-sm text-slate-900 dark:text-white">{employee.position || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Department</dt>
            <dd className="mt-1 text-sm text-slate-900 dark:text-white">{employee.department}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="mt-1 text-sm text-slate-900 dark:text-white">{employee.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Barcode UID</dt>
            <dd className="mt-1 font-mono text-sm text-indigo-600 dark:text-indigo-400">{employee.uid}</dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</dt>
              <dd className="mt-1">
                {isInactive ? (
                  <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    Resigned
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Active
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">UID Version</dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-white">{employee.uid_version ?? 1}</dd>
            </div>
          </div>
        </dl>

        <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Set Daily Quota</h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Applies to today only. Resets to 1 automatically tomorrow.
              </p>
            </div>
            <span className="inline-flex min-w-10 justify-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              {employee.quota_today ?? 1}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="number"
              min={0}
              max={50}
              value={quotaInput}
              onChange={(event) => setQuotaInput(event.target.value)}
              disabled={quotaSaving}
              className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800 sm:max-w-40"
              aria-label="Daily quota for today"
            />
            <button
              type="button"
              onClick={handleSaveQuota}
              disabled={quotaSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
            >
              {quotaSaving ? "Saving..." : "Update Quota"}
            </button>
          </div>

          {quotaError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{quotaError}</p>
          )}
        </section>

        <section className={`mt-6 flex flex-col items-center gap-y-4 rounded-lg border p-5 shadow-sm ${
          isInactive
            ? "border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800/60"
            : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40"
        }`}>
          <div className="text-center">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Employee QR Access</h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isInactive
                ? "Barcode disabled — employee has resigned."
                : "Scan QR to verify employee credentials"}
            </p>
          </div>

          <div className={`rounded-lg border bg-white p-3 shadow-sm dark:border-slate-700 ${isInactive ? "opacity-40" : ""}`}>
            <QRCodeCanvas
              ref={qrCanvasRef}
              value={employee.uid}
              size={160}
              level="H"
              includeMargin
            />
          </div>

          <button
            type="button"
            onClick={handleDownloadQr}
            disabled={isInactive}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 10.5L12 15m0 0l4.5-4.5M12 15V3" />
            </svg>
            Download QR
          </button>
        </section>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Employment Status</h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {isInactive
                  ? "This employee has resigned. Barcode access is permanently disabled."
                  : "Mark an employee as resigned to disable their meal barcode without deleting records."}
              </p>
            </div>
            {employee.status === "active" ? (
              <button
                type="button"
                onClick={() => setShowResignConfirm(true)}
                disabled={statusSaving}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V9M12 9v.75m-6 0h12" />
                </svg>
                Mark as Resigned
              </button>
            ) : (
              <span className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Resigned
              </span>
            )}
          </div>
        </div>

        <ConfirmDialog
          isOpen={showResignConfirm}
          title="Confirm Employee Resignation"
          description={
            <>
              <p>
                Are you sure you want to mark <strong>{employee.name}</strong> as resigned?
              </p>
              <p className="mt-3">
                This will immediately disable their meal barcode and prevent further quota access.
                Employee records will be retained for reporting purposes.
              </p>
            </>
          }
          confirmLabel="Confirm Resignation"
          cancelLabel="Keep Active"
          variant="danger"
          loading={statusSaving}
          onConfirm={() => void handleResign(employee.id)}
          onCancel={() => setShowResignConfirm(false)}
        />

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
          {employee.status === "active" && (
            <button
              type="button"
              onClick={() =>
                openOutlookDraftEmail({
                  email: employee.email,
                  name: employee.name,
                  position: employee.position ?? "",
                  uid: employee.uid,
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              Draft Email
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
