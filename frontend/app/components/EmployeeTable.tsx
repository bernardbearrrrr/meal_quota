"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import AddEmployeeModal from "./AddEmployeeModal";
import BulkImportModal from "./BulkImportModal";
import EditEmployeeModal from "./EditEmployeeModal";
import EmployeeDetailModal from "./EmployeeDetailModal";
import TablePagination from "./TablePagination";
import {
  API_BASE_URL,
  authFetch,
  buildQuery,
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
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [quotaFilter, setQuotaFilter] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [debouncedDepartment, setDebouncedDepartment] = useState("");
  const [debouncedQuota, setDebouncedQuota] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(nameFilter.trim());
      setDebouncedDepartment(departmentFilter.trim());
      setDebouncedQuota(quotaFilter.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [nameFilter, departmentFilter, quotaFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedName, debouncedDepartment, debouncedQuota, perPage]);

  const refreshData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const query = buildQuery({
        page: currentPage,
        per_page: perPage,
        name: debouncedName,
        department: debouncedDepartment,
        quota: debouncedQuota,
      });

      const response = await authFetch(`${API_BASE_URL}/admin/employees${query}`);

      if (response.status >= 500) {
        setError("Server error. Unable to load employees.");
        return;
      }

      const data = await parseJsonResponse<EmployeesListResponse>(response);

      if (data) {
        const normalized = data.data.map(normalizeEmployee);
        setEmployees(normalized);
        setPagination({
          current_page: data.meta.current_page ?? 1,
          last_page: data.meta.last_page ?? 1,
          per_page: data.meta.per_page ?? perPage,
          total: data.meta.total,
        });
        setSelectedEmployee((current) =>
          current ? normalized.find((item) => item.id === current.id) ?? current : current,
        );
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, debouncedName, debouncedDepartment, debouncedQuota]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  // Live data: silently refresh the employee list every 3 seconds.
  useAutoRefresh(refreshData);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const hasActiveFilter = Boolean(debouncedName || debouncedDepartment || debouncedQuota);

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
    setToast(`${normalized.name} has been added. Click Draft Email to send their barcode.`);
    void refreshData();
  }

  function handleBulkImportSuccess(message: string) {
    setToast(message);
    void refreshData();
  }

  function handleEditEmployee(employee: EmployeeRecord) {
    setSelectedEmployee(null);
    setEditingEmployee(employee);
  }

  function handleEmployeeUpdated(updated: EmployeeRecord) {
    applyEmployeeUpdate(updated);
    setEditingEmployee(null);
    setToast(`${updated.name}'s details have been updated.`);
    void refreshData();
  }

  function handleStatusUpdated(updated: EmployeeRecord, message: string) {
    applyEmployeeUpdate(updated);
    setToast(message);
    void refreshData();
  }

  function handleBarcodeReset(updated: EmployeeRecord, message: string) {
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
            onClick={() => setIsBulkImportOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Bulk Import CSV
          </button>
          <button
            type="button"
            onClick={() => void refreshData()}
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
                  Employee ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:px-6">
                  Employee
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:table-cell sm:px-6">
                  Role
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:table-cell sm:px-6">
                  Employment Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:px-6">
                  Quota
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:px-6">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:px-6">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    {hasActiveFilter ? "No employees match your filters." : "No employees registered yet."}
                  </td>
                </tr>
              ) : (
                employees.map((employee) => {
                  const isInactive = employee.status === "inactive";

                  return (
                  <tr
                    key={employee.id}
                    onClick={() => openEmployeeDetail(employee)}
                    className={`cursor-pointer transition-colors ${
                      isInactive
                        ? "bg-slate-100/80 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800/70"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                      <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
                        {employee.employee_id || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <div className={`text-sm font-medium ${isInactive ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
                        {employee.name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {employee.email}
                      </div>
                    </td>
                    <td className="hidden px-4 py-4 sm:table-cell sm:px-6">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {employee.position || "—"}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {employee.department}
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 md:table-cell sm:px-6">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        employee.type === "intern"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                      }`}>
                        {employee.type ?? "associate"}
                      </span>
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
                    <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditEmployee(employee);
                        }}
                        aria-label={`Edit ${employee.name}`}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={pagination.current_page}
          lastPage={pagination.last_page}
          total={pagination.total}
          perPage={perPage}
          shownCount={employees.length}
          loading={loading}
          onPageChange={setCurrentPage}
          onPerPageChange={setPerPage}
        />
      </div>

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onEmployeeCreated={handleEmployeeCreated}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={handleBulkImportSuccess}
      />

      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          isOpen={Boolean(selectedEmployee)}
          onClose={closeEmployeeDetail}
          onQuotaUpdated={handleQuotaUpdated}
          onStatusUpdated={handleStatusUpdated}
          onBarcodeReset={handleBarcodeReset}
          onEdit={handleEditEmployee}
          refreshData={refreshData}
        />
      )}

      <EditEmployeeModal
        employee={editingEmployee}
        isOpen={Boolean(editingEmployee)}
        onClose={() => setEditingEmployee(null)}
        onEmployeeUpdated={handleEmployeeUpdated}
      />
    </div>
  );
}
