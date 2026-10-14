"use client";
import { useState } from "react";
import { saveEmployee, setEmployeeStatus } from "./actions";
import { inputCls, labelCls, btnCls, ghostCls, cardCls, thCls, tdCls } from "@/lib/ui";

type Emp = { id: string; name: string; role: string; status: string; salary_amount: number | null; joining_date: string | null; hasPin: boolean };
const empty = { id: "", name: "", role: "", pin: "", salary: 0, joiningDate: "" };

export function EmployeesClient({ branchId, employees, roles }: { branchId: string; employees: Emp[]; roles: string[] }) {
  const [form, setForm] = useState<typeof empty | null>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const list = employees.filter((e) => showLeft || e.status !== "left");

  async function run(fn: () => Promise<void>, done?: () => void) {
    setBusy(true); setError("");
    try { await fn(); done?.(); } catch (e: any) { setError(e.message ?? "Something went wrong"); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <label className="text-xs text-ink-mid flex items-center gap-2"><input type="checkbox" checked={showLeft} onChange={(e) => setShowLeft(e.target.checked)} />Show former employees</label>
        <button className={btnCls} onClick={() => { setForm({ ...empty, role: roles[0] ?? "" }); setError(""); }}>+ Add employee</button>
      </div>
      {error && <p className="text-sm text-crimson-400 mb-3">{error}</p>}
      {form && (
        <div className={`${cardCls} mb-4`}>
          <div className="text-sm font-semibold mb-3">{form.id ? "Edit employee" : "Add employee"}</div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2"><label className={labelCls}>Full name</label><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className={labelCls}>Role</label><select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{roles.map((r) => <option key={r}>{r}</option>)}</select></div>
            <div><label className={labelCls}>{form.id ? "New PIN (optional)" : "PIN (4 digits)"}</label><input className={inputCls} maxLength={4} inputMode="numeric" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} /></div>
            <div><label className={labelCls}>Monthly salary</label><input type="number" className={inputCls} value={form.salary} onChange={(e) => setForm({ ...form, salary: +e.target.value })} /></div>
            <div><label className={labelCls}>Joining date</label><input type="date" className={inputCls} value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4"><button className={btnCls} disabled={busy} onClick={() => run(() => saveEmployee({ branchId, ...form, id: form.id || undefined }), () => setForm(null))}>{busy ? "Saving…" : "Save"}</button><button className={ghostCls} onClick={() => setForm(null)}>Cancel</button></div>
        </div>
      )}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead><tr>{["Employee", "Role", "Salary", "Login", "Status", ""].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className={e.status === "left" ? "opacity-60" : ""}>
                <td className={tdCls}><div className="font-semibold">{e.name}</div><div className="text-xs text-ink-faint">{e.joining_date ? `Joined ${e.joining_date}` : ""}</div></td>
                <td className={tdCls}>{e.role}</td><td className={`${tdCls} font-mono`}>{e.salary_amount ?? ""}</td>
                <td className={tdCls}>{e.hasPin ? "PIN set" : "Roster only"}</td>
                <td className={tdCls}><span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${e.status === "active" ? "bg-basil-500/15 text-basil-500" : "bg-ink-faint/15 text-ink-faint"}`}>{e.status}</span></td>
                <td className={`${tdCls} text-right whitespace-nowrap`}>
                  <button className={ghostCls} onClick={() => { setForm({ id: e.id, name: e.name, role: e.role, pin: "", salary: Number(e.salary_amount ?? 0), joiningDate: e.joining_date ?? "" }); setError(""); }}>Edit</button>{" "}
                  {e.status === "left"
                    ? <button className={ghostCls} disabled={busy} onClick={() => run(() => setEmployeeStatus(branchId, e.id, "active"))}>Reactivate</button>
                    : <button className={ghostCls} disabled={busy} onClick={() => { if (window.confirm(`Mark ${e.name} as left? Their login is switched off.`)) run(() => setEmployeeStatus(branchId, e.id, "left")); }}>Mark left</button>}
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-ink-faint">No employees.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
