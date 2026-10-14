import Link from "next/link";
import { requireChain, money } from "@/lib/chain";
import { createAdminClient } from "@/lib/supabase/admin";
import { salesSummary, today, addDays, dayList, validYmd } from "@/lib/summary";
import { LineChart, Bars } from "@/components/charts";
import { cardCls, inputCls, labelCls, btnCls, thCls, tdCls, SERIES, STATUS_BADGE } from "@/lib/ui";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ branch?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireChain();
  if (!ctx.branches.length) return <main className="p-8"><h1 className="font-display text-2xl font-semibold mb-2">Dashboard</h1><p className="text-ink-mid text-sm">No branches are linked to your account yet. Ask the platform admin to link your restaurants.</p></main>;

  const to = validYmd(sp.to) ? sp.to! : today();
  let from = validYmd(sp.from) ? sp.from! : addDays(to, -13);
  if (from > to) from = to;
  if (from < addDays(to, -119)) from = addDays(to, -119);
  const branchId = ctx.branches.some((b) => b.id === sp.branch) ? sp.branch! : "all";
  const shown = branchId === "all" ? ctx.branches : ctx.branches.filter((b) => b.id === branchId);
  const ids = shown.map((b) => b.id);
  const days = dayList(from, to);

  const db = createAdminClient();
  const [rows, inv, emp, shifts, recent, buys] = await Promise.all([
    salesSummary(ids, from, to),
    db.from("inventory_items").select("restaurant_id, current_stock, min_stock").in("restaurant_id", ids),
    db.from("employees").select("restaurant_id").in("restaurant_id", ids).eq("status", "active"),
    db.from("staff_shifts").select("restaurant_id").in("restaurant_id", ids).eq("status", "open"),
    db.from("sales").select("restaurant_id, display_id, order_no, order_type, total, created_at").in("restaurant_id", ids).eq("status", "completed").order("created_at", { ascending: false }).limit(6),
    db.from("stock_purchases").select("restaurant_id, total_cost, created_at, inventory_items(name)").in("restaurant_id", ids).order("created_at", { ascending: false }).limit(5),
  ]);

  const per = shown.map((b, i) => {
    const mine = rows.filter((r) => r.restaurant_id === b.id);
    return {
      b, color: SERIES[i % SERIES.length],
      total: mine.reduce((a, r) => a + r.total, 0), orders: mine.reduce((a, r) => a + r.orders, 0),
      daily: days.map((d) => mine.filter((r) => r.day === d).reduce((a, r) => a + r.total, 0)),
      low: (inv.data ?? []).filter((x: any) => x.restaurant_id === b.id && Number(x.current_stock) <= Number(x.min_stock)).length,
      staff: (emp.data ?? []).filter((x: any) => x.restaurant_id === b.id).length,
      open: (shifts.data ?? []).filter((x: any) => x.restaurant_id === b.id).length,
    };
  });
  const grand = per.reduce((a, p) => a + p.total, 0), orders = per.reduce((a, p) => a + p.orders, 0);
  const types = [["dine_in", "Dine in"], ["takeaway", "Takeaway"], ["delivery", "Delivery"]].map(([k, label]) => ({ label, n: rows.filter((r) => r.order_type === k).reduce((a, r) => a + r.orders, 0) }));
  const nameOf = (id: string) => ctx.branches.find((b) => b.id === id)?.name ?? "?";
  const kpis = [
    ["Sales", money(grand)], ["Orders", String(orders)], ["Average order", money(orders ? grand / orders : 0)],
    ["Low stock items", String(per.reduce((a, p) => a + p.low, 0))], ["Staff on shift", String(per.reduce((a, p) => a + p.open, 0))],
  ];
  const q = (f: string, t: string) => `/dashboard?branch=${branchId}&from=${f}&to=${t}`;

  return (
    <main className="p-8">
      <h1 className="font-display text-2xl font-semibold mb-1">Dashboard</h1>
      <p className="text-ink-mid text-sm mb-5">{from} to {to}, {branchId === "all" ? "all branches" : nameOf(branchId)}</p>

      <form className={`${cardCls} mb-5 flex flex-wrap items-end gap-3`}>
        <div><label className={labelCls}>Branch</label><select name="branch" defaultValue={branchId} className={inputCls}><option value="all">All branches</option>{ctx.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div><label className={labelCls}>From</label><input type="date" name="from" defaultValue={from} className={inputCls} /></div>
        <div><label className={labelCls}>To</label><input type="date" name="to" defaultValue={to} className={inputCls} /></div>
        <button className={btnCls}>Apply</button>
        <div className="flex gap-2 text-xs ml-auto">{[["Today", 0], ["7 days", 6], ["30 days", 29], ["90 days", 89]].map(([l, n]) => <Link key={l as string} href={q(addDays(today(), -(n as number)), today())} className="rounded-md border border-line px-2.5 py-1.5 text-ink-mid hover:text-chili-400 hover:border-chili-500">{l}</Link>)}</div>
      </form>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {kpis.map(([l, v]) => <div key={l} className={cardCls}><div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold">{l}</div><div className="font-display text-2xl font-semibold mt-1">{v}</div></div>)}
      </div>

      <div className={`${cardCls} mb-5`}>
        <div className="text-sm font-semibold mb-3">Daily sales</div>
        <LineChart days={days} series={per.map((p) => ({ name: p.b.name, color: p.color, values: p.daily }))} />
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-ink-mid">{per.map((p) => <span key={p.b.id}><b style={{ color: p.color }}>●</b> {p.b.name}</span>)}</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className={cardCls}><div className="text-sm font-semibold mb-3">Branch comparison</div><Bars rows={per.map((p) => ({ label: p.b.name, value: p.total, color: p.color, text: money(p.total) }))} /></div>
        <div className={cardCls}><div className="text-sm font-semibold mb-3">Order types</div><Bars rows={types.map((t) => ({ label: t.label, value: t.n, color: "#D9481F", text: String(t.n) }))} /></div>
      </div>

      <div className={`${cardCls} mb-5 overflow-x-auto`}>
        <div className="text-sm font-semibold mb-3">Branches</div>
        <table className="w-full text-sm"><thead><tr>{["Branch", "Status", "Sales", "Orders", "Low stock", "Staff"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
          <tbody>{per.map((p) => <tr key={p.b.id}>
            <td className={tdCls}><Link href={`/branches/${p.b.id}`} className="font-semibold hover:text-chili-400"><b style={{ color: p.color }}>● </b>{p.b.name}</Link></td>
            <td className={tdCls}><span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${STATUS_BADGE[p.b.status] ?? ""}`}>{p.b.status}</span></td>
            <td className={`${tdCls} font-mono`}>{money(p.total)}</td><td className={tdCls}>{p.orders}</td>
            <td className={`${tdCls} ${p.low ? "text-crimson-400 font-semibold" : ""}`}>{p.low}</td><td className={tdCls}>{p.staff}</td></tr>)}</tbody></table>
      </div>

      <div className={cardCls}>
        <div className="text-sm font-semibold mb-3">Recent activity</div>
        <div className="space-y-1.5 text-sm text-ink-mid">
          {(recent.data ?? []).map((s: any, i) => <div key={"s" + i}>{nameOf(s.restaurant_id)}: order {s.display_id ?? "#" + s.order_no}, {String(s.order_type).replace("_", " ")}, <span className="font-mono">{money(Number(s.total))}</span>, {new Date(s.created_at).toLocaleString()}</div>)}
          {(buys.data ?? []).map((r: any, i) => <div key={"b" + i}>{nameOf(r.restaurant_id)}: restocked {r.inventory_items?.name}, <span className="font-mono">{money(Number(r.total_cost))}</span></div>)}
          {!(recent.data ?? []).length && !(buys.data ?? []).length && <div className="text-ink-faint">Nothing yet.</div>}
        </div>
      </div>
    </main>
  );
}
