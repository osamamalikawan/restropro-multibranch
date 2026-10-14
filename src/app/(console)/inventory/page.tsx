import { requireChain, pickBranch } from "@/lib/chain";
import { createAdminClient } from "@/lib/supabase/admin";
import { BranchPicker } from "@/components/branch-picker";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const ctx = await requireChain();
  const branch = pickBranch(ctx, (await searchParams).branch);
  if (!branch) return <main className="p-8 text-sm text-ink-mid">No branches linked yet.</main>;
  const db = createAdminClient();
  const [items, sups] = await Promise.all([
    db.from("inventory_items").select("id, name, unit, category, current_stock, min_stock, cost, item_type").eq("restaurant_id", branch.id).order("name"),
    db.from("suppliers").select("id, name").eq("restaurant_id", branch.id).order("name"),
  ]);
  return (
    <main className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1"><h1 className="font-display text-2xl font-semibold">Inventory</h1><BranchPicker branches={ctx.branches} value={branch.id} /></div>
      <p className="text-ink-mid text-sm mb-6">Items and stock at {branch.name}. Restocks use the same function as the branch POS, so accounts stay in sync.</p>
      <InventoryClient key={branch.id} branchId={branch.id} items={(items.data ?? []) as any} suppliers={(sups.data ?? []) as any} />
    </main>
  );
}
