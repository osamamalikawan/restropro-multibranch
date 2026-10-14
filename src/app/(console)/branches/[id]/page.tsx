import Link from "next/link";
import { notFound } from "next/navigation";
import { requireChain, money } from "@/lib/chain";
import { createAdminClient } from "@/lib/supabase/admin";
import { salesSummary, today, addDays, dayList } from "@/lib/summary";
import { LineChart } from "@/components/charts";
import { cardCls, thCls, tdCls, STATUS_BADGE } from "@/lib/ui";

export default async function BranchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireChain();
  const branch = ctx.branches.find((b) => b.id === id);
  if (!branch) notFound();
  const to = today(), from = addDays(to, -29), days = dayList(from, to);
  const db = createAdminClient();
  const [rows, inv, emp, shifts, recent, buys] = await Promise.all([
    salesSummary([id], from, to),
    db.from("inventory_items").select("name, unit, current_stock, min_stock").eq("restaurant_id", id).order("name"),
    db.from("employees").select("name, role, status").eq("restaurant_id", id).eq("status", "active").order("name"),
    db.from("staff_shifts").select("employee_name, clock_in_at").eq("restaurant_id", id).eq("status", "open"),
    db.from("sales").select("display_id, order_no, order_type, total, created_at").eq("restaurant_id", id).eq("status", "completed").order("created_at", { ascending: false }).limit(8),
    db.from("stock_purchases").select("quantity, total_cost, created_at, logged_by_name, inventory_items(name, unit)").eq("restaurant_id", id).order("created_at", { ascending: false }).limit(6),
  ]);
  const sum = (a: string, b: string) => rows.filter((r) => r.day >= a && r.day <= b).reduce((s, r) => s + r.total, 0);
  const low = (inv.data ?? []).filter((x: any) => Number(x.current_stock) <= Number(x.min_stock));
  const kpis = [["Today", money(sum(to, to))], ["Last 7 days", money(sum(addDays(to, -6), to))], ["Last 30 days", money(sum(from, to))], ["Staff on shift", String((shifts.data ?? []).length)]];
  return (
    <main className="p-8">
      <Link href="/branches" className="text-xs text-ink-faint hover:text-chili-400">Back to branches</Link>
      <div className="flex items-center gap-3 mt-1 mb-5"><h1 className="font-display text-2xl font-semibold">{branch.name}</h1>
        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${STATUS_BADGE[branch.status] ?? ""}`}>{branch.status}</span>
        <div className="ml-auto flex gap-2 text-xs">{[["Inventory", "/inventory"], ["Employees", "/employees"]].map(([l, h]) => <Link key={h} href={`${h}?branch=${id}`} className="rounded-md border border-line px-3 py-1.5 text-ink-mid hover:text-chili-400 hover:border-chili-500">{l}</Link>)}</div></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">{kpis.map(([l, v]) => <div key={l} className={cardCls}><div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold">{l}</div><div className="font-display text-2xl font-semibold mt-1">{v}</div></div>)}</div>
      <div className={`${cardCls} mb-5`}><div className="text-sm font-semibold mb-3">Sales, last 30 days</div><LineChart days={days} series={[{ name: branch.name, color: "#D9481F", values: days.map((d) => sum(d, d)) }]} /></div>
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className={cardCls}><div className="text-sm font-semibold mb-3">Low stock ({low.length})</div>
          {low.length ? <table className="w-full text-sm"><thead><tr><th className={thCls}>Item</th><th className={thCls}>Stock</th><th className={thCls}>Min</th></tr></thead><tbody>{low.map((x: any) => <tr key={x.name}><td className={tdCls}>{x.name}</td><td className={`${tdCls} text-crimson-400 font-semibold`}>{x.current_stock} {x.unit}</td><td className={tdCls}>{x.min_stock}</td></tr>)}</tbody></table> : <p className="text-sm text-ink-faint">Everything is above its minimum.</p>}</div>
        <div className={cardCls}><div className="text-sm font-semibold mb-3">On shift now</div>
          {(shifts.data ?? []).length ? (shifts.data ?? []).map((s: any, i) => <div key={i} className="text-sm text-ink-mid py-1">{s.employee_name}, since {new Date(s.clock_in_at).toLocaleTimeString()}</div>) : <p className="text-sm text-ink-faint">Nobody clocked in. {(emp.data ?? []).length} active staff on the roster.</p>}</div>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className={cardCls}><div className="text-sm font-semibold mb-3">Recent orders</div>{(recent.data ?? []).map((s: any, i) => <div key={i} className="flex justify-between text-sm py-1 text-ink-mid"><span>{s.display_id ?? "#" + s.order_no}, {String(s.order_type).replace("_", " ")}</span><span className="font-mono">{money(Number(s.total))}</span></div>)}{!(recent.data ?? []).length && <p className="text-sm text-ink-faint">No orders yet.</p>}</div>
        <div className={cardCls}><div className="text-sm font-semibold mb-3">Recent restocks</div>{(buys.data ?? []).map((r: any, i) => <div key={i} className="flex justify-between text-sm py-1 text-ink-mid"><span>{r.inventory_items?.name} x {r.quantity}{r.logged_by_name ? `, ${r.logged_by_name}` : ""}</span><span className="font-mono">{money(Number(r.total_cost))}</span></div>)}{!(buys.data ?? []).length && <p className="text-sm text-ink-faint">No restocks yet.</p>}</div>
      </div>
    </main>
  );
}
