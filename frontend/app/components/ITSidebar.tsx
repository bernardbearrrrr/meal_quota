"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "../lib/api";
import Spinner from "./Spinner";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { href: "/it/users", label: "User Management", icon: UsersIcon },
  { href: "/it/settings", label: "System Settings", icon: SettingsIcon },
  { href: "/it/logs", label: "Error Logs", icon: LogsIcon },
];

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 ${className}`}>
      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
      </svg>
    </div>
  );
}

type ITSidebarProps = {
  isCollapsed?: boolean;
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
};

export default function ITSidebar({
  isCollapsed = false,
  isMobile = false,
  isMobileOpen = false,
  onToggleCollapse,
  onCloseMobile,
}: ITSidebarProps) {
  const pathname = usePathname();
  const showLabels = isMobile || !isCollapsed;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
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
    <aside className={asideClassName} aria-label="IT sidebar" aria-hidden={isMobile && !isMobileOpen}>
      <div className={`flex h-16 shrink-0 items-center border-b border-slate-200 dark:border-slate-800 ${showLabels ? "gap-3 px-6" : "justify-center px-3"}`}>
        <LogoMark />
        {showLabels && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Hot Shoppes</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">IT Super Admin</p>
          </div>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={isMobile ? onCloseMobile : undefined}
              title={!showLabels ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                showLabels ? "" : "justify-center"
              } ${
                isActive
                  ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {showLabels && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-slate-200 px-3 py-4 dark:border-slate-800">
        <div className={`flex ${showLabels ? "justify-start px-3" : "justify-center"}`}>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title={!showLabels ? "Sign Out" : undefined}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40 ${
            showLabels ? "" : "justify-center"
          }`}
        >
          {isLoggingOut ? <Spinner className="h-5 w-5 shrink-0" /> : <LogoutIcon className="h-5 w-5 shrink-0" />}
          {showLabels && <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>}
        </button>
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white ${
              showLabels ? "" : "justify-center"
            }`}
          >
            <ChevronIcon className="h-5 w-5 shrink-0" direction={isCollapsed ? "right" : "left"} />
            {showLabels && <span>Collapse</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
