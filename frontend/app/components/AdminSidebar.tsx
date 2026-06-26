"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearToken } from "../lib/api";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/admin/employees", label: "Manage Employees", icon: UsersIcon, exact: false },
  { href: "/admin/logs", label: "Meal Logs", icon: LogsIcon, exact: false },
  { href: "/admin/reports", label: "Reports", icon: ReportIcon, exact: false },
];

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}


function LogsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}

function ReportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
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
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 ${className}`}>
      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );
}

type AdminSidebarProps = {
  isCollapsed?: boolean;
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
};

export default function AdminSidebar({
  isCollapsed = false,
  isMobile = false,
  isMobileOpen = false,
  onToggleCollapse,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const showLabels = isMobile || !isCollapsed;

  function handleLogout() {
    clearToken();
    window.location.href = "/login";
  }

  const asideClassName = isMobile
    ? `fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 md:hidden ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`
    : `sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 md:flex ${
        isCollapsed ? "w-20" : "w-64"
      }`;

  return (
    <aside className={asideClassName} aria-label="Admin sidebar" aria-hidden={isMobile && !isMobileOpen}>
      <div className={`flex h-16 shrink-0 items-center border-b border-slate-200 dark:border-slate-800 ${showLabels ? "gap-3 px-6" : "justify-center px-3"}`}>
        <LogoMark />
        {showLabels && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">MealQuota</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">Admin</p>
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
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300"
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
