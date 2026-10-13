import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { admin, getChain } from "@/lib/server";

export async function POST(req: Request) {
  const chain = await getChain();
  if (!chain) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!chain.branches.some(x => x.id === b.branchId)) return NextResponse.json({ error: "Branch not in your chain" }, { status: 403 });
  const db = admin(), rid = b.branchId;
  const done = (error: any, data?: any) => error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true, data });

  if (b.op === "inventory") { const r = await db.from("inventory_items").select("id,name,unit,current_stock,min_stock,cost").eq("restaurant_id", rid).order("name"); return done(r.error, r.data); }
  if (b.op === "suppliers") { const r = await db.from("suppliers").select("id,name").eq("restaurant_id", rid).order("name"); return done(r.error, r.data); }
  if (b.op === "employees") { const r = await db.from("employees").select("id,name,role,status,salary_amount").eq("restaurant_id", rid).order("name"); return done(r.error, r.data); }
  if (b.op === "addItem") {
    if (!b.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    return done((await db.from("inventory_items").insert({ restaurant_id: rid, name: b.name, unit: b.unit || "pcs", current_stock: +b.stock || 0, min_stock: +b.min || 0, cost: +b.cost || 0, item_type: "ready_made" })).error);
  }
  if (b.op === "restock") {
    if (!b.itemId || !(+b.qty > 0)) return NextResponse.json({ error: "Item and quantity required" }, { status: 400 });
    return done((await db.rpc("log_restock", { p_restaurant_id: rid, p_inventory_item_id: b.itemId, p_supplier_id: b.supplierId || null, p_quantity: +b.qty, p_unit_cost: +b.cost || 0 })).error);
  }
  if (b.op === "addEmployee") {
    if (!b.name || !b.role) return NextResponse.json({ error: "Name and role required" }, { status: 400 });
    const row: any = { restaurant_id: rid, name: b.name, role: b.role, status: "active", salary_amount: +b.salary || null };
    if (b.pin) { if (!/^\d{4}$/.test(b.pin)) return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 }); row.pin_hash = await bcrypt.hash(b.pin, 10); }
    return done((await db.from("employees").insert(row)).error);
  }
  return NextResponse.json({ error: "Unknown op" }, { status: 400 });
}
