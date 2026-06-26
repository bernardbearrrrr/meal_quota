import AdminSidebar from "../components/AdminSidebar";
import RoleGuard from "../components/RoleGuard";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RoleGuard allowedRole="admin">
      <div className="flex min-h-screen w-full bg-slate-100 dark:bg-slate-950">
        <AdminSidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900 lg:px-8">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">HRD Admin Dashboard</h1>
          </header>
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
