"use client";
import { useMemo, useState } from "react";
import { saveItem, deleteItem, restockItem } from "./actions";
import { inputCls, labelCls, btnCls, ghostCls, cardCls, thCls, tdCls } from "@/lib/ui";

type Item = { id: string; name: string; unit: string; category: string | null; current_stock: number; min_stock: number; cost: number; item_type: string };
const empty = { id: "", name: "", unit: "pcs", category: "", minStock: 0, cost: 0, stock: 0 };

export function InventoryClient({ branchId, items, suppliers }: { branchId: string; items: Item[]; suppliers: { id: string; name: string }[] }) {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<typeof empty | null>(null);
  const [rs, setRs] = useState<{ itemId: string; name: string; supplierId: string; qty: number; unitCost: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const filtered = useMemo(() => items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())), [items, search]);

  async function run(fn: () => Promise<void>, done?: () => void) {
    setBusy(true); setError("");
    try { await fn(); done?.(); } catch (e: any) { setError(e.message ?? "Something went wrong"); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item…" className="rounded-md border border-line bg-canvas px-3 py-2 text-sm min-w-[220px]" />
        <button className={btnCls} onClick={() => { setForm({ ...empty }); setRs(null); setError(""); }}>+ Add item</button>
      </div>
      {error && <p className="text-sm text-crimson-400 mb-3">{error}</p>}

      {form && (
        <div className={`${cardCls} mb-4`}>
          <div className="text-sm font-semibold mb-3">{form.id ? "Edit item" : "Add item"}</div>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2"><label className={labelCls}>Name</label><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className={labelCls}>Unit</label><select className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{["pcs", "kg", "litre", "box"].map((u) => <option key={u}>{u}</option>)}</select></div>
            <div><label className={labelCls}>Category</label><input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><label className={labelCls}>Min stock</label><input type="number" className={inputCls} value={form.minStock} onChange={(e) => setForm({ ...form, minStock: +e.target.value })} /></div>
            <div><label className={labelCls}>Cost / unit</label><input type="number" className={inputCls} value={form.cost} onChange={(e) => setForm({ ...form, cost: +e.target.value })} /></div>
            {!form.id && <div><label className={labelCls}>Opening stock</label><input type="number" className={inputCls} value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} /></div>}
          </div>
          <div className="flex gap-2 mt-4"><button className={btnCls} disabled={busy} onClick={() => run(() => saveItem({ branchId, ...form, id: form.id || undefined }), () => setForm(null))}>{busy ? "Saving…" : "Save"}</button><button className={ghostCls} onClick={() => setForm(null)}>Cancel</button></div>
          {form.id && <p className="text-xs text-ink-faint mt-2">To change the stock level, use Restock so the purchase is recorded.</p>}
        </div>
      )}

      {rs && (
        <div className={`${cardCls} mb-4`}>
          <div className="text-sm font-semibold mb-3">Restock {rs.name}</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div><label className={labelCls}>Supplier</label><select className={inputCls} value={rs.supplierId} onChange={(e) => setRs({ ...rs, supplierId: e.target.value })}><option value="">None</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className={labelCls}>Quantity</label><input type="number" className={inputCls} value={rs.qty} onChange={(e) => setRs({ ...rs, qty: +e.target.value })} /></div>
            <div><label className={labelCls}>Unit cost</label><input type="number" className={inputCls} value={rs.unitCost} onChange={(e) => setRs({ ...rs, unitCost: +e.target.value })} /></div>
            <div className="flex items-end gap-2"><button className={btnCls} disabled={busy} onClick={() => run(() => restockItem({ branchId, ...rs }), () => setRs(null))}>{busy ? "Saving…" : "Add stock"}</button><button className={ghostCls} onClick={() => setRs(null)}>Cancel</button></div>
          </div>
        </div>
      )}

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead><tr>{["Item", "Stock", "Min", "Cost", ""].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((i) => {
              const low = Number(i.current_stock) <= Number(i.min_stock);
              return (
                <tr key={i.id}>
                  <td className={tdCls}><div className="font-semibold">{i.name}</div><div className="text-xs text-ink-faint">{i.category ?? ""}{i.item_type === "self_made" ? " (self made)" : ""}</div></td>
                  <td className={`${tdCls} ${low ? "text-crimson-400 font-semibold" : ""}`}>{i.current_stock} {i.unit}{low ? " (low)" : ""}</td>
                  <td className={tdCls}>{i.min_stock}</td><td className={`${tdCls} font-mono`}>{i.cost}</td>
                  <td className={`${tdCls} text-right whitespace-nowrap`}>
                    <button className={ghostCls} onClick={() => { setRs({ itemId: i.id, name: i.name, supplierId: "", qty: 0, unitCost: Number(i.cost) }); setForm(null); setError(""); }}>Restock</button>{" "}
                    <button className={ghostCls} onClick={() => { setForm({ id: i.id, name: i.name, unit: i.unit, category: i.category ?? "", minStock: Number(i.min_stock), cost: Number(i.cost), stock: 0 }); setRs(null); setError(""); }}>Edit</button>{" "}
                    <button className={ghostCls} disabled={busy} onClick={() => { if (window.confirm(`Delete ${i.name} from this branch?`)) run(() => deleteItem(branchId, i.id)); }}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-ink-faint">No items.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
