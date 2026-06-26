"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AddEmployeeModal from "./AddEmployeeModal";
import EmployeeDetailModal from "./EmployeeDetailModal";
import {
  API_BASE_URL,
  authFetch,
  EmployeeRecord,
  EmployeesListResponse,
  parseJsonResponse,
} from "../lib/api";

function normalizeEmployee(employee: EmployeeRecord): EmployeeRecord {
  const status =
    employee.status === "active" || employee.status === "inactive"
      ? employee.status
      : employee.is_active === false
        ? "inactive"
        : "active";

  return { ...employee, status };
}

export default function EmployeeTable() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [quotaFilter, setQuotaFilter] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
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
        const normalized = data.data.map(normalizeEmployee);
        setEmployees(normalized);
        setSelectedEmployee((current) =>
          current ? normalized.find((item) => item.id === current.id) ?? current : null,
        );
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredEmployees = useMemo(() => {
    const name = nameFilter.trim().toLowerCase();
    const department = departmentFilter.trim().toLowerCase();
    const quota = quotaFilter.trim();

    return employees.filter((employee) => {
      const matchesName = !name || employee.name.toLowerCase().includes(name);
      const matchesDepartment = !department || employee.department.toLowerCase().includes(department);
      const matchesQuota = !quota || String(employee.quota_today ?? 1) === quota;

      return matchesName && matchesDepartment && matchesQuota;
    });
  }, [employees, nameFilter, departmentFilter, quotaFilter]);

  const hasActiveFilter = Boolean(nameFilter || departmentFilter || quotaFilter);

  function openEmployeeDetail(employee: EmployeeRecord) {
    setSelectedEmployee(employee);
  }

  function closeEmployeeDetail() {
    setSelectedEmployee(null);
  }

  function applyEmployeeUpdate(updated: EmployeeRecord) {
    const normalized = normalizeEmployee(updated);
    setEmployees((current) =>
      current.map((employee) => (employee.id === normalized.id ? normalized : employee)),
    );
    setSelectedEmployee(normalized);
  }

  function handleQuotaUpdated(updated: EmployeeRecord, message: string) {
    applyEmployeeUpdate(updated);
    setToast(message);
  }

  function handleEmployeeCreated(employee: EmployeeRecord) {
    const normalized = normalizeEmployee(employee);
    setEmployees((current) => [normalized, ...current].sort((a, b) => a.name.localeCompare(b.name)));
    setToast(`${normalized.name} has been added. Click Draft Email to send their barcode.`);
  }

  function handleStatusUpdated(updated: EmployeeRecord, message: string) {
    applyEmployeeUpdate(updated);
    setToast(message);
    void refreshData();
  }

  const filterInputClassName =
    "block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="alert"
          className="fixed right-4 top-4 z-60 flex max-w-sm items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
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
            Add employees, manage quotas, and draft barcode emails — all in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Employee
          </button>
          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
            placeholder="Search by name..."
            className={filterInputClassName}
            aria-label="Search by name"
          />
        </div>

        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
          <input
            type="search"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            placeholder="Search by department..."
            className={filterInputClassName}
            aria-label="Search by department"
          />
        </div>

        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          <input
            type="number"
            min={0}
            value={quotaFilter}
            onChange={(event) => setQuotaFilter(event.target.value)}
            placeholder="Filter by quota..."
            className={filterInputClassName}
            aria-label="Filter by quota"
          />
        </div>
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
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:table-cell sm:px-6">
                  Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:px-6">
                  Department
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:table-cell sm:px-6">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:px-6">
                  Quota
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:px-6">
                  Status
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
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    {hasActiveFilter ? "No employees match your filters." : "No employees registered yet."}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const isInactive = employee.status === "inactive";

                  return (
                  <tr
                    key={employee.id}
                    onClick={() => openEmployeeDetail(employee)}
                    className={`cursor-pointer transition-colors ${
                      isInactive
                        ? "bg-slate-100/80 text-slate-400 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-500 dark:hover:bg-slate-800/70"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <td className={`whitespace-nowrap px-4 py-4 text-sm font-medium sm:px-6 ${isInactive ? "text-slate-500 dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                      {employee.name}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-sm sm:table-cell sm:px-6">
                      {employee.position || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm sm:px-6">
                      {employee.department}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-sm md:table-cell sm:px-6">
                      {employee.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm sm:px-6">
                      <span className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isInactive
                          ? "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                      }`}>
                        {employee.quota_today ?? 1}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm sm:px-6">
                      {employee.status === "active" ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                          Resigned
                        </span>
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 font-mono text-xs lg:table-cell sm:px-6">
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onEmployeeCreated={handleEmployeeCreated}
      />

      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          isOpen={Boolean(selectedEmployee)}
          onClose={closeEmployeeDetail}
          onQuotaUpdated={handleQuotaUpdated}
          onStatusUpdated={handleStatusUpdated}
          refreshData={refreshData}
        />
      )}
    </div>
  );
}
