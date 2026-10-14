import { createAdminClient } from "@/lib/supabase/admin";

export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
export const addDays = (ymd: string, n: number) => { const d = new Date(ymd + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export function dayList(from: string, to: string) { const out: string[] = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; }
export const validYmd = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export type SaleRow = { restaurant_id: string; day: string; order_type: string; orders: number; total: number };
export async function salesSummary(ids: string[], from: string, to: string): Promise<SaleRow[]> {
  if (!ids.length) return [];
  const { data, error } = await createAdminClient().rpc("chain_sales_summary", { p_restaurants: ids, p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ ...r, orders: Number(r.orders), total: Number(r.total) }));
}
