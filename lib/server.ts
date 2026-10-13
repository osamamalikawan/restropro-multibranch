import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

export async function authClient() {
  const c = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => c.getAll(), setAll: (l) => { try { l.forEach(({ name, value, options }) => c.set(name, value, options)); } catch {} } },
  });
}

export type Branch = { id: string; name: string; status: string };
/** The logged-in owner's chain + linked branches. Every query in this app is scoped to these ids. */
export async function getChain() {
  const { data: { user } } = await (await authClient()).auth.getUser();
  if (!user) return null;
  const db = admin();
  const { data: m } = await db.from("chain_members").select("chain_id, role, chains(name)").eq("user_id", user.id).limit(1).maybeSingle();
  if (!m) return null;
  const { data: b } = await db.from("chain_branches").select("restaurant_id, branch_name, restaurants(name, status)").eq("chain_id", m.chain_id);
  const branches: Branch[] = (b ?? []).map((x: any) => ({ id: x.restaurant_id, name: x.branch_name || x.restaurants?.name, status: x.restaurants?.status }));
  return { user, chainId: m.chain_id as string, name: (m as any).chains?.name as string, branches };
}
