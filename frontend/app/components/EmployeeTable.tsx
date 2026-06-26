"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EmployeeDetailModal from "./EmployeeDetailModal";
import {
  API_BASE_URL,
  authFetch,
  EmployeeRecord,
  EmployeesListResponse,
  parseJsonResponse,
  ResendBarcodeResponse,
} from "../lib/api";

export default function EmployeeTable() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(`${API_BASE_URL}/admin/employees`);

      if (response.status >= 500) {
        setError("Server error. Unable to load employees.");
        return;
      }

      const data = await parseJsonResponse<EmployeesListResponse>(response);

      if (data) {
        setEmployees(data.data);
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return employees;
    }

    return employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query),
    );
  }, [employees, searchQuery]);

  function openEmployeeDetail(employee: EmployeeRecord) {
    setSelectedEmployee(employee);
    setResendError(null);
  }

  function closeEmployeeDetail() {
    setSelectedEmployee(null);
    setResendError(null);
  }

  async function handleResendBarcode() {
    if (!selectedEmployee) {
      return;
    }

    setResendLoading(true);
    setResendError(null);

    try {
      const response = await authFetch(
        `${API_BASE_URL}/admin/employees/${selectedEmployee.id}/resend-barcode`,
        { method: "POST" },
      );

      if (response.status >= 500) {
        setResendError("Server error. Unable to resend barcode.");
        return;
      }

      const data = await parseJsonResponse<ResendBarcodeResponse>(response);

      if (response.ok && data?.data) {
        setEmployees((current) =>
          current.map((employee) => (employee.id === data.data!.id ? data.data! : employee)),
        );
        setSelectedEmployee(data.data);
        setToast(data.message ?? "Barcode email sent successfully.");
        return;
      }

      setResendError(data?.message ?? "Failed to resend barcode. Please try again.");
    } catch {
      setResendError("Unable to connect to the server.");
    } finally {
      setResendLoading(false);
    }
  }

  const searchInputClassName =
    "block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="alert"
          className="fixed right-4 top-4 z-[60] flex max-w-sm items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{toast}</p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Manage Employees</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Search, view details, and resend meal barcodes to employees.
          </p>
        </div>
        <button
          type="button"
          onClick={loadEmployees}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Refresh
        </button>
      </div>

      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name or department..."
          className={searchInputClassName}
        />
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:px-6">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:px-6">
                  Department
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:table-cell sm:px-6">
                  Email
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 lg:table-cell sm:px-6">
                  UID
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:px-6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    {searchQuery ? "No employees match your search." : "No employees registered yet."}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    onClick={() => openEmployeeDetail(employee)}
                    className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-900 dark:text-white sm:px-6">
                      {employee.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600 dark:text-slate-300 sm:px-6">
                      {employee.department}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-slate-600 dark:text-slate-300 md:table-cell sm:px-6">
                      {employee.email}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 lg:table-cell sm:px-6">
                      {employee.uid}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEmployeeDetail(employee);
                        }}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          isOpen={Boolean(selectedEmployee)}
          onClose={closeEmployeeDetail}
          onResend={handleResendBarcode}
          resendLoading={resendLoading}
          resendError={resendError}
        />
      )}
    </div>
  );
}
