"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "../lib/api";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { href: "/scan/logs", label: "Meal Logs", icon: LogsIcon, exact: false },
  { href: "/scan/scanner", label: "Scanner", icon: ScannerIcon, exact: false },
];

function LogsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ScannerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

function ChevronIcon({ className, direction }: { className?: string; direction: "left" | "right" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === "left" ? "M15.75 19.5 8.25 12l7.5-7.5" : "m8.25 4.5 7.5 7.5-7.5 7.5"}
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function LogoMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 ${className}`}>
      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );
}

type OperatorSidebarProps = {
  isCollapsed?: boolean;
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
};

export default function OperatorSidebar({
  isCollapsed = false,
  isMobile = false,
  isMobileOpen = false,
  onToggleCollapse,
  onCloseMobile,
}: OperatorSidebarProps) {
  const pathname = usePathname();
  const showLabels = isMobile || !isCollapsed;

  function handleLogout() {
    void logout();
  }

  const asideClassName = isMobile
    ? `fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 md:hidden ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`
    : `sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 md:flex ${
        isCollapsed ? "w-20" : "w-64"
      }`;

  return (
    <aside className={asideClassName} aria-label="Operator sidebar" aria-hidden={isMobile && !isMobileOpen}>
      <div className={`flex h-16 shrink-0 items-center border-b border-slate-200 dark:border-slate-800 ${showLabels ? "gap-3 px-6" : "justify-center px-3"}`}>
        <LogoMark />
        {showLabels && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Hot Shoppes</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">Kantin</p>
          </div>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <CloseIcon className="h-6 w-6 shrink-0" />
          </button>
        )}
      </div>

      <nav className={`flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain ${isCollapsed && !isMobile ? "p-3" : "p-4"}`}>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onCloseMobile}
              title={showLabels ? undefined : label}
              className={`flex min-w-0 items-center rounded-lg py-2.5 text-sm font-medium transition-colors ${
                showLabels ? "gap-3 px-3" : "justify-center px-0"
              } ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
              {showLabels && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`shrink-0 space-y-1 border-t border-slate-200 dark:border-slate-800 ${isCollapsed && !isMobile ? "p-3" : "p-4"}`}>
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`mb-2 flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
              showLabels ? "gap-3 px-3" : "justify-center px-0"
            }`}
          >
            <ChevronIcon direction={isCollapsed ? "right" : "left"} className="h-6 w-6 shrink-0" />
            {showLabels && <span className="truncate">Collapse</span>}
          </button>
        )}

        <ThemeToggle showLabel={showLabels} className={showLabels ? "" : "justify-center px-0"} />

        <button
          type="button"
          onClick={handleLogout}
          title={showLabels ? undefined : "Logout"}
          className={`flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300 ${
            showLabels ? "gap-3 px-3" : "justify-center px-0"
          }`}
        >
          <LogoutIcon className="h-6 w-6 shrink-0" />
          {showLabels && <span className="truncate">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
