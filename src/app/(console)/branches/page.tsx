import Link from "next/link";
import { requireChain, money } from "@/lib/chain";
import { createAdminClient } from "@/lib/supabase/admin";
import { salesSummary, today } from "@/lib/summary";
import { cardCls, STATUS_BADGE } from "@/lib/ui";

export default async function BranchesPage() {
  const ctx = await requireChain();
  const ids = ctx.branches.map((b) => b.id), t = today();
  const db = createAdminClient();
  const [rows, inv, last] = await Promise.all([
    salesSummary(ids, t, t),
    db.from("inventory_items").select("restaurant_id, current_stock, min_stock").in("restaurant_id", ids),
    db.from("sales").select("restaurant_id, created_at").in("restaurant_id", ids).order("created_at", { ascending: false }).limit(200),
  ]);
  return (
    <main className="p-8">
      <h1 className="font-display text-2xl font-semibold mb-1">Branches</h1>
      <p className="text-ink-mid text-sm mb-6">Today at a glance. Open a branch for its full picture.</p>
      {!ids.length && <p className="text-sm text-ink-mid">No branches linked yet.</p>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ctx.branches.map((b) => {
          const mine = rows.filter((r) => r.restaurant_id === b.id);
          const low = (inv.data ?? []).filter((x: any) => x.restaurant_id === b.id && Number(x.current_stock) <= Number(x.min_stock)).length;
          const lastSale = (last.data ?? []).find((x: any) => x.restaurant_id === b.id);
          return (
            <Link key={b.id} href={`/branches/${b.id}`} className={`${cardCls} hover:border-chili-500 transition-colors block`}>
              <div className="flex items-start justify-between mb-3">
                <div><div className="font-display text-lg font-semibold">{b.name}</div><div className="text-xs text-ink-faint">{b.city ?? ""}</div></div>
                <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${STATUS_BADGE[b.status] ?? ""}`}>{b.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><div className="text-[10px] uppercase text-ink-faint">Sales today</div><div className="font-mono font-semibold">{money(mine.reduce((a, r) => a + r.total, 0))}</div></div>
                <div><div className="text-[10px] uppercase text-ink-faint">Orders</div><div className="font-semibold">{mine.reduce((a, r) => a + r.orders, 0)}</div></div>
                <div><div className="text-[10px] uppercase text-ink-faint">Low stock</div><div className={`font-semibold ${low ? "text-crimson-400" : ""}`}>{low}</div></div>
              </div>
              <div className="text-xs text-ink-faint mt-3">Last order: {lastSale ? new Date(lastSale.created_at).toLocaleString() : "none yet"}</div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
