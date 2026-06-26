"use client";

import { usePathname } from "next/navigation";
import OperatorSidebar from "./OperatorSidebar";
import RoleGuard from "./RoleGuard";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const pageTitle = pathname.startsWith("/scan/logs")
    ? "Meal Logs"
    : pathname.startsWith("/scan/scanner")
      ? "Scanner"
      : "Kantin Dashboard";

  return (
    <RoleGuard allowedRole="operator">
      <div className="flex min-h-screen w-full bg-slate-100 dark:bg-slate-950">
        <OperatorSidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900 lg:px-8">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{pageTitle}</h1>
          </header>
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
