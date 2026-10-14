import { requireChain, pickBranch } from "@/lib/chain";
import { createAdminClient } from "@/lib/supabase/admin";
import { BranchPicker } from "@/components/branch-picker";
import { EmployeesClient } from "./employees-client";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const ctx = await requireChain();
  const branch = pickBranch(ctx, (await searchParams).branch);
  if (!branch) return <main className="p-8 text-sm text-ink-mid">No branches linked yet.</main>;
  const db = createAdminClient();
  const [emps, roles] = await Promise.all([
    db.from("employees").select("id, name, role, status, salary_amount, joining_date, pin_hash").eq("restaurant_id", branch.id).order("name"),
    db.from("roles").select("name").eq("restaurant_id", branch.id).order("name"),
  ]);
  const employees = (emps.data ?? []).map(({ pin_hash, ...e }: any) => ({ ...e, hasPin: pin_hash != null }));
  return (
    <main className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1"><h1 className="font-display text-2xl font-semibold">Employees</h1><BranchPicker branches={ctx.branches} value={branch.id} /></div>
      <p className="text-ink-mid text-sm mb-6">Staff at {branch.name}. Employees with a PIN can sign in at the branch POS.</p>
      <EmployeesClient key={branch.id} branchId={branch.id} employees={employees as any} roles={(roles.data ?? []).map((r: any) => r.name)} />
    </main>
  );
}
