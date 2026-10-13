"use client";
import { useEffect, useState } from "react";
async function op(body: any) { const r = await fetch("/api/op", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r.json(); }

export default function Manage({ branches }: { branches: { id: string; name: string }[] }) {
  const [branchId, setBranch] = useState(branches[0]?.id ?? "");
  const [tab, setTab] = useState<"inventory" | "stock" | "employees">("inventory");
  const [items, setItems] = useState<any[]>([]); const [sups, setSups] = useState<any[]>([]); const [emps, setEmps] = useState<any[]>([]);
  const [f, setF] = useState<any>({}); const [msg, setMsg] = useState("");
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function load() {
    if (!branchId) return;
    const [i, s, e] = await Promise.all([op({ op: "inventory", branchId }), op({ op: "suppliers", branchId }), op({ op: "employees", branchId })]);
    setItems(i.data ?? []); setSups(s.data ?? []); setEmps(e.data ?? []);
  }
  useEffect(() => { setF({}); load(); }, [branchId]);
  async function submit(name: string) { const r = await op({ ...f, op: name, branchId }); setMsg(r.error ?? "Saved"); if (r.ok) { setF({}); load(); } }

  if (!branches.length) return <div className="card">No branches linked yet.</div>;
  return (<>
    <div className="row"><select value={branchId} onChange={e => setBranch(e.target.value)}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      {(["inventory", "stock", "employees"] as const).map(t => <button key={t} className={"tab " + (tab === t ? "on" : "")} onClick={() => { setTab(t); setF({}); setMsg(""); }}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
    {msg && <p className="mute">{msg}</p>}
    {tab === "inventory" && <div className="card"><h3>Add inventory item</h3>
      <div className="row"><input placeholder="Name" value={f.name ?? ""} onChange={set("name")} /><input placeholder="Unit (pcs, kg)" value={f.unit ?? ""} onChange={set("unit")} />
        <input placeholder="Stock" type="number" value={f.stock ?? ""} onChange={set("stock")} /><input placeholder="Min stock" type="number" value={f.min ?? ""} onChange={set("min")} />
        <input placeholder="Cost" type="number" value={f.cost ?? ""} onChange={set("cost")} /><button onClick={() => submit("addItem")}>Add</button></div>
      <table><thead><tr><th>Item</th><th>Stock</th><th>Min</th><th>Cost</th></tr></thead><tbody>{items.map(i => <tr key={i.id}><td>{i.name}</td>
        <td className={+i.current_stock <= +i.min_stock ? "low" : ""}>{i.current_stock} {i.unit}</td><td>{i.min_stock}</td><td>{i.cost}</td></tr>)}</tbody></table></div>}
    {tab === "stock" && <div className="card"><h3>Log restock</h3>
      <div className="row"><select value={f.itemId ?? ""} onChange={set("itemId")}><option value="">Item…</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
        <select value={f.supplierId ?? ""} onChange={set("supplierId")}><option value="">Supplier (optional)</option>{sups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input placeholder="Quantity" type="number" value={f.qty ?? ""} onChange={set("qty")} /><input placeholder="Unit cost" type="number" value={f.cost ?? ""} onChange={set("cost")} />
        <button onClick={() => submit("restock")}>Add stock</button></div>
      <p className="mute">Uses the same log_restock function as the branch POS, so stock and accounts stay in sync.</p></div>}
    {tab === "employees" && <div className="card"><h3>Add employee</h3>
      <div className="row"><input placeholder="Full name" value={f.name ?? ""} onChange={set("name")} />
        <select value={f.role ?? ""} onChange={set("role")}><option value="">Role…</option>{["manager", "cashier", "cook", "inventory"].map(r => <option key={r}>{r}</option>)}</select>
        <input placeholder="PIN (4 digits, optional)" maxLength={4} value={f.pin ?? ""} onChange={set("pin")} /><input placeholder="Monthly salary" type="number" value={f.salary ?? ""} onChange={set("salary")} />
        <button onClick={() => submit("addEmployee")}>Add</button></div>
      <table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Salary</th></tr></thead><tbody>{emps.map(e => <tr key={e.id}><td>{e.name}</td><td>{e.role}</td><td>{e.status}</td><td>{e.salary_amount ?? ""}</td></tr>)}</tbody></table></div>}
  </>);
}
