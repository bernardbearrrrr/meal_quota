"use client";

import { useEffect } from "react";
import AddEmployeeForm from "./AddEmployeeForm";
import { EmployeeRecord } from "../lib/api";

type AddEmployeeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeCreated: (employee: EmployeeRecord) => void;
};

export default function AddEmployeeModal({
  isOpen,
  onClose,
  onEmployeeCreated,
}: AddEmployeeModalProps) {
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

  if (!isOpen) {
    return null;
  }

  function handleSuccess(employee: EmployeeRecord) {
    onEmployeeCreated(employee);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close add employee modal"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-employee-title"
        className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 id="add-employee-title" className="text-xl font-bold text-slate-900 dark:text-white">
              Add New Employee
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Register an employee and draft their barcode email in Outlook.
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

        <AddEmployeeForm onSuccess={handleSuccess} onCancel={onClose} showCancel />
      </div>
    </div>
  );
}
