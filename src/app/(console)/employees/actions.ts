"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireChain, assertBranch } from "@/lib/chain";

export async function saveEmployee(i: { branchId: string; id?: string; name: string; role: string; pin: string; salary: number; joiningDate: string }) {
  const c = await requireChain(); assertBranch(c, i.branchId);
  const name = i.name.trim();
  if (!name || !i.role) throw new Error("Name and role are required");
  const db = createAdminClient();
  const { data: role } = await db.from("roles").select("name").eq("restaurant_id", i.branchId).eq("name", i.role).maybeSingle();
  if (!role) throw new Error("That role does not exist at this branch");
  const row: Record<string, any> = { name, role: role.name, salary_amount: Number(i.salary) || null, joining_date: i.joiningDate || null, is_rider: /rider/i.test(role.name), updated_at: new Date().toISOString() };
  if (i.pin) {
    if (!/^\d{4}$/.test(i.pin)) throw new Error("PIN must be exactly 4 digits");
    row.pin_hash = await bcrypt.hash(i.pin, 10);
  }
  if (i.id) {
    if (row.pin_hash) { const { data: cur } = await db.from("employees").select("session_version").eq("id", i.id).eq("restaurant_id", i.branchId).single(); row.session_version = (cur?.session_version ?? 1) + 1; }
    const { error } = await db.from("employees").update(row).eq("id", i.id).eq("restaurant_id", i.branchId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("employees").insert({ ...row, restaurant_id: i.branchId, status: "active" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/employees");
}

export async function setEmployeeStatus(branchId: string, id: string, status: "active" | "left") {
  const c = await requireChain(); assertBranch(c, branchId);
  const db = createAdminClient();
  const { data: cur } = await db.from("employees").select("session_version").eq("id", id).eq("restaurant_id", branchId).single();
  const patch = status === "left"
    ? { status: "left", left_date: new Date().toISOString().slice(0, 10), pin_hash: null, session_version: (cur?.session_version ?? 1) + 1, updated_at: new Date().toISOString() }
    : { status: "active", left_date: null, updated_at: new Date().toISOString() };
  const { error } = await db.from("employees").update(patch).eq("id", id).eq("restaurant_id", branchId);
  if (error) throw new Error(error.message);
  revalidatePath("/employees");
}
