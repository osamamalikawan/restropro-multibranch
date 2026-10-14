import { requireChain } from "@/lib/chain";
import { createAdminClient } from "@/lib/supabase/admin";
import { WarehouseClient } from "./warehouse-client";

export default async function WarehousePage() {
  const ctx = await requireChain();
  const db = createAdminClient();
  const [items, moves] = await Promise.all([
    db.from("chain_warehouse_items").select("id, name, unit, category, quantity, min_stock, cost").eq("chain_id", ctx.chainId).order("name"),
    db.from("chain_warehouse_movements").select("id, item_name, unit, kind, qty, unit_cost, restaurant_id, note, created_by, created_at").eq("chain_id", ctx.chainId).order("created_at", { ascending: false }).limit(30),
  ]);
  const branchName = Object.fromEntries(ctx.branches.map((b) => [b.id, b.name]));
  const movements = (moves.data ?? []).map((m: any) => ({ ...m, branch: m.restaurant_id ? branchName[m.restaurant_id] ?? "Unlinked branch" : null }));
  return (
    <main className="p-8">
      <h1 className="font-display text-2xl font-semibold mb-1">Central warehouse</h1>
      <p className="text-ink-mid text-sm mb-6">Stock held for the whole chain. Transfers move quantity into a branch&apos;s inventory in one step (the item is created there if it does not exist yet).</p>
      <WarehouseClient items={(items.data ?? []) as any} branches={ctx.branches.map((b) => ({ id: b.id, name: b.name }))} movements={movements as any} />
    </main>
  );
}
