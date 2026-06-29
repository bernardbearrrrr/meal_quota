"use client";

import { useCallback, useState, type ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import LiveClock from "./LiveClock";
import RoleGuard from "./RoleGuard";

function MobileLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Hot Shoppes</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">Admin</p>
      </div>
    </div>
  );
}

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => !current);
  }, []);

  const openMobileMenu = useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  return (
    <RoleGuard allowedRole="admin">
      <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
        <AdminSidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapsed} />
        <AdminSidebar isMobile isMobileOpen={isMobileOpen} onCloseMobile={closeMobileMenu} />

        <div
          aria-hidden="true"
          onClick={closeMobileMenu}
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-in-out md:hidden ${
            isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:hidden">
            <MobileLogo />
            <div className="flex min-w-0 items-center gap-2">
              <LiveClock className="max-w-[10rem] shrink text-right sm:max-w-none" />
              <button
              type="button"
              onClick={openMobileMenu}
              aria-label="Open admin menu"
              aria-expanded={isMobileOpen}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <HamburgerIcon className="h-6 w-6 shrink-0" />
            </button>
            </div>
          </header>

          <header className="hidden h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900 md:flex lg:px-8">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">HRD Admin Dashboard</h1>
            <LiveClock className="shrink-0 text-right" />
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
