"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireChain, assertBranch } from "@/lib/chain";

export async function saveWarehouseItem(i: { id?: string; name: string; unit: string; category: string; minStock: number; cost: number; quantity: number }) {
  const c = await requireChain();
  const name = i.name.trim();
  if (!name) throw new Error("Name is required");
  const row = { name, unit: i.unit || "pcs", category: i.category.trim() || null, min_stock: Number(i.minStock) || 0, cost: Number(i.cost) || 0, updated_at: new Date().toISOString() };
  const db = createAdminClient();
  const { error } = i.id
    ? await db.from("chain_warehouse_items").update(row).eq("id", i.id).eq("chain_id", c.chainId)
    : await db.from("chain_warehouse_items").insert({ ...row, chain_id: c.chainId, quantity: Number(i.quantity) || 0 });
  if (error) throw new Error(error.code === "23505" ? `${name} is already in the warehouse.` : error.message);
  revalidatePath("/warehouse");
}

export async function deleteWarehouseItem(id: string) {
  const c = await requireChain();
  const { error } = await createAdminClient().from("chain_warehouse_items").delete().eq("id", id).eq("chain_id", c.chainId);
  if (error) throw new Error(error.message);
  revalidatePath("/warehouse");
}

export async function receiveWarehouseStock(i: { itemId: string; qty: number; unitCost: number; note: string }) {
  const c = await requireChain();
  const { error } = await createAdminClient().rpc("chain_warehouse_receive", { p_chain: c.chainId, p_item: i.itemId, p_qty: Number(i.qty), p_unit_cost: Number(i.unitCost) || 0, p_note: i.note || null, p_by: c.email });
  if (error) throw new Error(error.message);
  revalidatePath("/warehouse");
}

export async function transferToBranch(i: { itemId: string; branchId: string; qty: number; note: string }) {
  const c = await requireChain(); assertBranch(c, i.branchId);
  const { error } = await createAdminClient().rpc("chain_transfer_stock", { p_chain: c.chainId, p_item: i.itemId, p_restaurant: i.branchId, p_qty: Number(i.qty), p_note: i.note || null, p_by: c.email });
  if (error) throw new Error(error.message);
  revalidatePath("/warehouse"); revalidatePath("/inventory");
}
