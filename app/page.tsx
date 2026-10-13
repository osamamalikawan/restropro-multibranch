import { redirect } from "next/navigation";
import { admin, getChain } from "@/lib/server";
export const dynamic = "force-dynamic";
const COLORS = ["#ff7a1a", "#37b98a", "#5b8def", "#e6484b", "#b06bef", "#e8a93a"];
const fmt = (n: number) => "Rs " + Math.round(n).toLocaleString();

export default async function Dashboard() {
  const chain = await getChain();
  if (!chain) redirect("/login");
  const ids = chain.branches.map(b => b.id);
  if (!ids.length) return <div className="card">No branches linked yet. Ask the super admin to link your restaurants.</div>;
  const db = admin();
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10));
  const [sales, inv, emp, shifts, buys] = await Promise.all([
    db.from("sales").select("restaurant_id,total,order_type,order_no,created_at").in("restaurant_id", ids).neq("status", "cancelled").gte("created_at", days[0]).order("created_at", { ascending: false }).limit(5000),
    db.from("inventory_items").select("restaurant_id,current_stock,min_stock").in("restaurant_id", ids),
    db.from("employees").select("restaurant_id").in("restaurant_id", ids).eq("status", "active"),
    db.from("staff_shifts").select("restaurant_id").in("restaurant_id", ids).eq("status", "open"),
    db.from("stock_purchases").select("restaurant_id,total_cost,created_at,inventory_items(name)").in("restaurant_id", ids).order("created_at", { ascending: false }).limit(6),
  ]);
  const name = (id: string) => chain.branches.find(b => b.id === id)?.name ?? "?";
  const S = sales.data ?? [];
  const per = chain.branches.map((b, i) => {
    const mine = S.filter(s => s.restaurant_id === b.id);
    return { b, color: COLORS[i % 6], total: mine.reduce((a, s) => a + Number(s.total), 0), orders: mine.length,
      daily: days.map(d => mine.filter(s => s.created_at.slice(0, 10) === d).reduce((a, s) => a + Number(s.total), 0)),
      low: (inv.data ?? []).filter(x => x.restaurant_id === b.id && Number(x.current_stock) <= Number(x.min_stock)).length,
      staff: (emp.data ?? []).filter(x => x.restaurant_id === b.id).length, open: (shifts.data ?? []).filter(x => x.restaurant_id === b.id).length };
  });
  const max = Math.max(1, ...per.flatMap(p => p.daily));
  const W = 700, H = 200, x = (i: number) => 30 + (i * (W - 40)) / 13, y = (v: number) => H - 20 - (v / max) * (H - 40);
  const types = ["dine_in", "takeaway", "delivery"].map(t => ({ t, n: S.filter(s => s.order_type === t).length }));
  const tmax = Math.max(1, ...types.map(t => t.n));
  const grand = per.reduce((a, p) => a + p.total, 0);
  const pmax = Math.max(1, ...per.map(q => q.total));
  return (<>
    <div className="grid">
      <div className="card"><div className="mute">Sales, last 14 days</div><div className="big">{fmt(grand)}</div></div>
      <div className="card"><div className="mute">Orders</div><div className="big">{S.length}</div></div>
      <div className="card"><div className="mute">Low stock items</div><div className="big">{per.reduce((a, p) => a + p.low, 0)}</div></div>
      <div className="card"><div className="mute">Staff on shift</div><div className="big">{per.reduce((a, p) => a + p.open, 0)}</div></div>
    </div>
    <div className="card"><h3>Daily sales by branch</h3>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        {per.map(p => <polyline key={p.b.id} fill="none" stroke={p.color} strokeWidth="2.5" points={p.daily.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />)}
        {days.map((d, i) => i % 3 === 0 && <text key={d} x={x(i)} y={H - 4} fontSize="10" fill="#8d869b" textAnchor="middle">{d.slice(5)}</text>)}
      </svg>
      <div className="row">{per.map(p => <span key={p.b.id}><b style={{ color: p.color }}>●</b> {p.b.name}</span>)}</div></div>
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div className="card"><h3>Branch comparison</h3>
        {per.map(p => <div key={p.b.id} style={{ marginBottom: 8 }}><div className="mute">{p.b.name}, {fmt(p.total)}</div>
          <div style={{ background: "#2e2736", borderRadius: 6 }}><div style={{ width: `${(p.total / pmax) * 100}%`, background: p.color, height: 10, borderRadius: 6 }} /></div></div>)}</div>
      <div className="card"><h3>Order types</h3>
        {types.map(t => <div key={t.t} style={{ marginBottom: 8 }}><div className="mute">{t.t.replace("_", " ")}, {t.n}</div>
          <div style={{ background: "#2e2736", borderRadius: 6 }}><div style={{ width: `${(t.n / tmax) * 100}%`, background: "#ff7a1a", height: 10, borderRadius: 6 }} /></div></div>)}</div>
    </div>
    <div className="card"><h3>Branches</h3><table><thead><tr><th>Branch</th><th>Status</th><th>Sales</th><th>Orders</th><th>Low stock</th><th>Staff</th></tr></thead>
      <tbody>{per.map(p => <tr key={p.b.id}><td><b style={{ color: p.color }}>● </b>{p.b.name}</td><td>{p.b.status}</td><td>{fmt(p.total)}</td><td>{p.orders}</td><td className={p.low ? "low" : ""}>{p.low}</td><td>{p.staff}</td></tr>)}</tbody></table></div>
    <div className="card"><h3>Recent activity</h3>
      {S.slice(0, 6).map((s, i) => <div key={"s" + i} className="mute">{name(s.restaurant_id)}: order #{s.order_no} {s.order_type.replace("_", " ")}, {fmt(Number(s.total))}, {new Date(s.created_at).toLocaleString()}</div>)}
      {(buys.data ?? []).map((r: any, i) => <div key={"b" + i} className="mute">{name(r.restaurant_id)}: restocked {r.inventory_items?.name}, {fmt(Number(r.total_cost))}</div>)}</div>
  </>);
}
