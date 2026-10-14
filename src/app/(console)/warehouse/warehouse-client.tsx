"use client";
import { useState } from "react";
import { saveWarehouseItem, deleteWarehouseItem, receiveWarehouseStock, transferToBranch } from "./actions";
import { inputCls, labelCls, btnCls, ghostCls, cardCls, thCls, tdCls } from "@/lib/ui";

type Item = { id: string; name: string; unit: string; category: string | null; quantity: number; min_stock: number; cost: number };
type Move = { id: string; item_name: string; unit: string | null; kind: string; qty: number; unit_cost: number | null; branch: string | null; note: string | null; created_by: string | null; created_at: string };
const empty = { id: "", name: "", unit: "pcs", category: "", minStock: 0, cost: 0, quantity: 0 };

export function WarehouseClient({ items, branches, movements }: { items: Item[]; branches: { id: string; name: string }[]; movements: Move[] }) {
  const [form, setForm] = useState<typeof empty | null>(null);
  const [panel, setPanel] = useState<{ kind: "receive" | "transfer"; itemId: string; name: string; unit: string; qty: number; unitCost: number; branchId: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<void>, done?: () => void) {
    setBusy(true); setError("");
    try { await fn(); done?.(); } catch (e: any) { setError(e.message ?? "Something went wrong"); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4"><button className={btnCls} onClick={() => { setForm({ ...empty }); setPanel(null); setError(""); }}>+ Add warehouse item</button></div>
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
            {!form.id && <div><label className={labelCls}>Opening quantity</label><input type="number" className={inputCls} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} /></div>}
          </div>
          <div className="flex gap-2 mt-4"><button className={btnCls} disabled={busy} onClick={() => run(() => saveWarehouseItem({ ...form, id: form.id || undefined }), () => setForm(null))}>{busy ? "Saving…" : "Save"}</button><button className={ghostCls} onClick={() => setForm(null)}>Cancel</button></div>
        </div>
      )}

      {panel && (
        <div className={`${cardCls} mb-4`}>
          <div className="text-sm font-semibold mb-3">{panel.kind === "receive" ? `Receive stock: ${panel.name}` : `Transfer ${panel.name} to a branch`}</div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {panel.kind === "transfer" && <div><label className={labelCls}>Branch</label><select className={inputCls} value={panel.branchId} onChange={(e) => setPanel({ ...panel, branchId: e.target.value })}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
            <div><label className={labelCls}>Quantity ({panel.unit})</label><input type="number" className={inputCls} value={panel.qty} onChange={(e) => setPanel({ ...panel, qty: +e.target.value })} /></div>
            {panel.kind === "receive" && <div><label className={labelCls}>Unit cost</label><input type="number" className={inputCls} value={panel.unitCost} onChange={(e) => setPanel({ ...panel, unitCost: +e.target.value })} /></div>}
            <div><label className={labelCls}>Note</label><input className={inputCls} value={panel.note} onChange={(e) => setPanel({ ...panel, note: e.target.value })} /></div>
            <div className="flex items-end gap-2">
              <button className={btnCls} disabled={busy} onClick={() => run(() => panel.kind === "receive" ? receiveWarehouseStock({ itemId: panel.itemId, qty: panel.qty, unitCost: panel.unitCost, note: panel.note }) : transferToBranch({ itemId: panel.itemId, branchId: panel.branchId, qty: panel.qty, note: panel.note }), () => setPanel(null))}>{busy ? "Saving…" : panel.kind === "receive" ? "Add to warehouse" : "Transfer"}</button>
              <button className={ghostCls} onClick={() => setPanel(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className={`${cardCls} overflow-x-auto mb-5`}>
        <table className="w-full text-sm">
          <thead><tr>{["Item", "In warehouse", "Min", "Cost", ""].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
          <tbody>
            {items.map((i) => {
              const low = Number(i.quantity) <= Number(i.min_stock) && Number(i.min_stock) > 0;
              return (
                <tr key={i.id}>
                  <td className={tdCls}><div className="font-semibold">{i.name}</div><div className="text-xs text-ink-faint">{i.category ?? ""}</div></td>
                  <td className={`${tdCls} ${low ? "text-crimson-400 font-semibold" : ""}`}>{i.quantity} {i.unit}{low ? " (low)" : ""}</td><td className={tdCls}>{i.min_stock}</td><td className={`${tdCls} font-mono`}>{i.cost}</td>
                  <td className={`${tdCls} text-right whitespace-nowrap`}>
                    <button className={ghostCls} onClick={() => { setPanel({ kind: "receive", itemId: i.id, name: i.name, unit: i.unit, qty: 0, unitCost: Number(i.cost), branchId: branches[0]?.id ?? "", note: "" }); setForm(null); setError(""); }}>Receive</button>{" "}
                    <button className={ghostCls} disabled={!branches.length} onClick={() => { setPanel({ kind: "transfer", itemId: i.id, name: i.name, unit: i.unit, qty: 0, unitCost: 0, branchId: branches[0]?.id ?? "", note: "" }); setForm(null); setError(""); }}>Transfer</button>{" "}
                    <button className={ghostCls} onClick={() => { setForm({ id: i.id, name: i.name, unit: i.unit, category: i.category ?? "", minStock: Number(i.min_stock), cost: Number(i.cost), quantity: 0 }); setPanel(null); setError(""); }}>Edit</button>{" "}
                    <button className={ghostCls} disabled={busy} onClick={() => { if (window.confirm(`Delete ${i.name} from the warehouse?`)) run(() => deleteWarehouseItem(i.id)); }}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {!items.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-ink-faint">The warehouse is empty. Add an item to start.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className={cardCls}>
        <div className="text-sm font-semibold mb-3">Recent movements</div>
        <div className="space-y-1.5 text-sm text-ink-mid">
          {movements.map((m) => <div key={m.id}>{new Date(m.created_at).toLocaleString()}: {m.kind === "receive" ? "received" : "sent"} {m.qty} {m.unit} of {m.item_name}{m.branch ? ` to ${m.branch}` : ""}{m.note ? `, ${m.note}` : ""}{m.created_by ? ` (${m.created_by})` : ""}</div>)}
          {!movements.length && <div className="text-ink-faint">No movements yet.</div>}
        </div>
      </div>
    </div>
  );
}
