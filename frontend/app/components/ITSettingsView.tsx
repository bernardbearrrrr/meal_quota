"use client";

import { useEffect, useState } from "react";
import {
  getSystemSettings,
  MealWindows,
  parseJsonResponse,
  SystemSettings,
  updateSystemSettings,
} from "../lib/api";

type SettingsResponse = {
  data?: SystemSettings;
  message?: string;
};

const MEALS: { key: keyof MealWindows; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
];

const DEFAULT_WINDOWS: MealWindows = {
  breakfast: { start: "07:00", end: "08:59" },
  lunch: { start: "11:00", end: "14:00" },
  dinner: { start: "17:00", end: "19:00" },
};

export default function ITSettingsView() {
  const [mealWindows, setMealWindows] = useState<MealWindows>(DEFAULT_WINDOWS);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setError(null);

      try {
        const response = await getSystemSettings();

        if (response.status >= 500) {
          setError("Server error. Unable to load settings.");
          return;
        }

        const data = await parseJsonResponse<SettingsResponse>(response);

        if (data?.data) {
          setMaintenanceMode(Boolean(data.data.maintenance_mode));
          setMealWindows({ ...DEFAULT_WINDOWS, ...data.data.meal_windows });
        }
      } catch {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function updateWindow(meal: keyof MealWindows, field: "start" | "end", value: string) {
    setMealWindows((current) => ({
      ...current,
      [meal]: { ...current[meal], [field]: value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const response = await updateSystemSettings({
        maintenance_mode: maintenanceMode,
        meal_windows: mealWindows,
      });

      if (response.status >= 500) {
        setError("Server error. Unable to save settings.");
        return;
      }

      const data = await parseJsonResponse<SettingsResponse>(response);

      if (response.ok) {
        if (data?.data) {
          setMaintenanceMode(Boolean(data.data.maintenance_mode));
          setMealWindows({ ...DEFAULT_WINDOWS, ...data.data.meal_windows });
        }
        setToast(data?.message ?? "System settings updated successfully.");
        return;
      }

      setError(data?.message ?? "Failed to update settings. Please check the time formats.");
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setSaving(false);
    }
  }

  const timeInputClass =
    "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800";

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
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure meal service windows and toggle global maintenance mode.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading settings...
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Meal Service Windows</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Scans within a window are categorised accordingly. Historical logs keep their original meal type.
            </p>

            <div className="mt-5 space-y-4">
              {MEALS.map((meal) => (
                <div key={meal.key} className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[120px_1fr_1fr]">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{meal.label}</span>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Start (HH:mm)</label>
                    <input
                      type="time"
                      value={mealWindows[meal.key]?.start ?? ""}
                      onChange={(event) => updateWindow(meal.key, "start", event.target.value)}
                      disabled={saving}
                      className={timeInputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">End (HH:mm)</label>
                    <input
                      type="time"
                      value={mealWindows[meal.key]?.end ?? ""}
                      onChange={(event) => updateWindow(meal.key, "end", event.target.value)}
                      disabled={saving}
                      className={timeInputClass}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Maintenance Mode</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  When enabled, all non-IT API access is blocked with a maintenance notice. IT and login remain available.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={maintenanceMode}
                onClick={() => setMaintenanceMode((current) => !current)}
                disabled={saving}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900 ${
                  maintenanceMode ? "bg-red-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    maintenanceMode ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {maintenanceMode && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                Maintenance mode is ON. HRD and Kantin users will be locked out until you turn it off.
              </p>
            )}
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-400"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
