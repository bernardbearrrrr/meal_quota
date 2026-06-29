"use client";

import { useCallback, useState, type ReactNode } from "react";
import ITSidebar from "./ITSidebar";
import RoleGuard from "./RoleGuard";

function MobileLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600">
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Hot Shoppes</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">IT Super Admin</p>
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

export default function ITLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => setIsCollapsed((current) => !current), []);
  const openMobileMenu = useCallback(() => setIsMobileOpen(true), []);
  const closeMobileMenu = useCallback(() => setIsMobileOpen(false), []);

  return (
    <RoleGuard allowedRole="it">
      <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
        <ITSidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapsed} />
        <ITSidebar isMobile isMobileOpen={isMobileOpen} onCloseMobile={closeMobileMenu} />

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
            <button
              type="button"
              onClick={openMobileMenu}
              aria-label="Open IT menu"
              aria-expanded={isMobileOpen}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <HamburgerIcon className="h-6 w-6 shrink-0" />
            </button>
          </header>

          <header className="hidden h-16 shrink-0 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900 md:flex lg:px-8">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">IT Super Admin Console</h1>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
