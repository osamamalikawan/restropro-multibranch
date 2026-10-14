"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireChain, assertBranch } from "@/lib/chain";

export async function saveItem(i: { branchId: string; id?: string; name: string; unit: string; category: string; minStock: number; cost: number; stock: number }) {
  const c = await requireChain(); assertBranch(c, i.branchId);
  const name = i.name.trim();
  if (!name) throw new Error("Name is required");
  const row = { name, unit: i.unit || "pcs", category: i.category.trim() || null, min_stock: Number(i.minStock) || 0, cost: Number(i.cost) || 0, updated_at: new Date().toISOString() };
  const db = createAdminClient();
  const { error } = i.id
    ? await db.from("inventory_items").update(row).eq("id", i.id).eq("restaurant_id", i.branchId)
    : await db.from("inventory_items").insert({ ...row, restaurant_id: i.branchId, current_stock: Number(i.stock) || 0, item_type: "ready_made" });
  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
}

export async function deleteItem(branchId: string, id: string) {
  const c = await requireChain(); assertBranch(c, branchId);
  const { error } = await createAdminClient().from("inventory_items").delete().eq("id", id).eq("restaurant_id", branchId);
  if (error) throw new Error(/foreign key|violates/i.test(error.message) ? "This item is used by a recipe or purchase history at the branch, so it can't be deleted." : error.message);
  revalidatePath("/inventory");
}

export async function restockItem(i: { branchId: string; itemId: string; supplierId: string; qty: number; unitCost: number }) {
  const c = await requireChain(); assertBranch(c, i.branchId);
  if (!(Number(i.qty) > 0)) throw new Error("Enter a quantity above zero");
  const { error } = await createAdminClient().rpc("log_restock", { p_restaurant_id: i.branchId, p_inventory_item_id: i.itemId, p_supplier_id: i.supplierId || null, p_quantity: Number(i.qty), p_unit_cost: Number(i.unitCost) || 0 });
  if (error) throw new Error(error.message);
  await createAdminClient().from("stock_purchases").update({ logged_by_name: c.email }).eq("restaurant_id", i.branchId).eq("inventory_item_id", i.itemId).is("logged_by_name", null);
  revalidatePath("/inventory");
}
