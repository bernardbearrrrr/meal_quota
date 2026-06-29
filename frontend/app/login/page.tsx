"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginRequest, parseJsonResponse, setRole, setToken, type LoginResponse } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await loginRequest({ email, password });

      const data = await parseJsonResponse<LoginResponse>(response);

      if (response.ok && data?.token && (data.role === "admin" || data.role === "kantin" || data.role === "it")) {
        setToken(data.token);
        setRole(data.role);
        router.push(
          data.role === "admin" ? "/admin" : data.role === "it" ? "/it/users" : "/kantin/dashboard",
        );
        return;
      }

      if (response.status >= 500) {
        setError("Server error. Please try again later.");
        return;
      }

      const validationErrors = data?.errors
        ? Object.values(data.errors).flat().join(" ")
        : null;

      setError(validationErrors ?? data?.message ?? "Invalid email or password.");
    } catch (error) {
      setError(
        error instanceof Error && error.message.includes("NEXT_PUBLIC_API_URL")
          ? "API URL is not configured. Set NEXT_PUBLIC_API_URL in your environment and redeploy."
          : "Unable to connect to the server. Please ensure the API is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClassName =
    "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Hot Shoppes</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to access Hot Shoppes</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p>{error}</p>
            </div>
          )}

          <form method="post" action="#" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                placeholder="you@company.com"
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                placeholder="Enter your password"
                className={inputClassName}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-400"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          HRD admins are routed to the dashboard. Kantin operators are routed to their dashboard.
        </p>
      </div>
    </div>
  );
}
