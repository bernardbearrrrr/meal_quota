"use client";

import { useCallback, useEffect, useState } from "react";
import { getITUsers, ITUser, parseJsonResponse, resetUserPassword } from "../lib/api";
import ConfirmDialog from "./ConfirmDialog";

type UsersResponse = {
  data: ITUser[];
};

const ROLE_BADGE: Record<string, string> = {
  it: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  admin: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  kantin: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
};

export default function ITUsersView() {
  const [users, setUsers] = useState<ITUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<ITUser | null>(null);
  const [resetting, setResetting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getITUsers();

      if (response.status >= 500) {
        setError("Server error. Unable to load users.");
        return;
      }

      const data = await parseJsonResponse<UsersResponse>(response);

      if (data) {
        setUsers(data.data);
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleResetPassword(user: ITUser) {
    setResetting(true);

    try {
      const response = await resetUserPassword(user.id);

      if (response.status >= 500) {
        setToast("Server error. Unable to reset password.");
        return;
      }

      const data = await parseJsonResponse<{ message?: string }>(response);
      setToast(data?.message ?? `Password for ${user.name} has been reset.`);
      setResetTarget(null);
    } catch {
      setToast("Unable to connect to the server.");
    } finally {
      setResetting(false);
    }
  }

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

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">User Management</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage system accounts and reset credentials for HRD and Kantin operators.
        </p>
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
                <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</th>
                <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                <th className="whitespace-nowrap px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {user.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${ROLE_BADGE[user.role] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setResetTarget(user)}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H9v1.5H7.5v1.5H4.5a1.5 1.5 0 01-1.5-1.5v-2.621a1.5 1.5 0 01.44-1.06l5.418-5.419c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(resetTarget)}
        title="Reset User Password"
        description={
          <>
            <p>
              Are you sure you want to reset the password for <strong>{resetTarget?.name}</strong> ({resetTarget?.email})?
            </p>
            <p className="mt-3">
              The password will be reset to the default <code className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-700">password123</code>.
              Please share it securely and ask the user to change it after logging in.
            </p>
          </>
        }
        confirmLabel="Yes, Reset Password"
        cancelLabel="Cancel"
        variant="warning"
        loading={resetting}
        onConfirm={() => resetTarget && void handleResetPassword(resetTarget)}
        onCancel={() => setResetTarget(null)}
      />
    </div>
  );
}
