import { redirect } from "next/navigation";
import { getChain } from "@/lib/server";
import Manage from "./manage";
export const dynamic = "force-dynamic";
export default async function Page() {
  const chain = await getChain();
  if (!chain) redirect("/login");
  return <Manage branches={chain.branches} />;
}
