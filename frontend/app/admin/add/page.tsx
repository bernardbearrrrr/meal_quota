import AddEmployeeForm from "../../components/AddEmployeeForm";

export default function AddEmployeePage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Add New Employee</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Register an employee, then open a draft email in your mail client with their barcode link.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <AddEmployeeForm />
      </div>
    </div>
  );
}
