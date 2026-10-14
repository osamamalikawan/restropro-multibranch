import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Branch = { id: string; name: string; status: string; city: string | null };
export type ChainCtx = { userId: string; email: string; chainId: string; chainName: string; branches: Branch[] };

/** The signed-in owner's chain and its linked branches (null if not an owner). Reads go through the service-role
 *  client, so every query in this app must be scoped with ctx.branches / ctx.chainId. */
export async function resolveChain(): Promise<ChainCtx | null> {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const admin = createAdminClient();
  const { data: m } = await admin.from("chain_members").select("chain_id, chains(name)").eq("user_id", auth.user.id).limit(1).maybeSingle();
  if (!m) return null;
  const { data: b } = await admin.from("chain_branches").select("restaurant_id, branch_name, restaurants(name, status, city)").eq("chain_id", m.chain_id);
  const branches: Branch[] = (b ?? []).map((x: any) => ({ id: x.restaurant_id, name: x.branch_name || x.restaurants?.name || "Branch", status: x.restaurants?.status ?? "?", city: x.restaurants?.city ?? null }));
  branches.sort((a, c) => a.name.localeCompare(c.name));
  return { userId: auth.user.id, email: auth.user.email ?? "", chainId: m.chain_id, chainName: (m as any).chains?.name ?? "Chain", branches };
}
export async function requireChain() {
  const c = await resolveChain();
  if (!c) throw new Error("Not signed in");
  return c;
}
export function assertBranch(c: ChainCtx, id: string) {
  if (!c.branches.some((b) => b.id === id)) throw new Error("That branch is not part of your chain");
}
export const pickBranch = (c: ChainCtx, id?: string) => c.branches.find((b) => b.id === id) ?? c.branches[0];
export const money = (n: number) => "Rs " + Math.round(n).toLocaleString();
