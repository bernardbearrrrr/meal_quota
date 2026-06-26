"use client";

import { useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { EmployeeRecord } from "../lib/api";

type EmployeeDetailModalProps = {
  employee: EmployeeRecord;
  isOpen: boolean;
  onClose: () => void;
  onResend: () => void;
  resendLoading: boolean;
  resendError: string | null;
};

export default function EmployeeDetailModal({
  employee,
  isOpen,
  onClose,
  onResend,
  resendLoading,
  resendError,
}: EmployeeDetailModalProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{employee.department}</p>
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
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    employee.is_active !== false
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {employee.is_active !== false ? "Active" : "Inactive"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">UID Version</dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-white">{employee.uid_version ?? 1}</dd>
            </div>
          </div>
        </dl>

        <section className="mt-6 flex flex-col items-center gap-y-4 rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
          <div className="text-center">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Employee QR Access</h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Scan QR to verify employee credentials</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700">
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
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 10.5L12 15m0 0l4.5-4.5M12 15V3" />
            </svg>
            Download QR
          </button>
        </section>

        {resendError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            {resendError}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onResend}
            disabled={resendLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
          >
            {resendLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Resend Barcode
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
