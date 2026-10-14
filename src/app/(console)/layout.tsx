import { redirect } from "next/navigation";
import { resolveChain } from "@/lib/chain";
import { ChainSidebar } from "./sidebar";
import { ChainTopbar } from "./topbar";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveChain();
  if (!ctx) redirect("/login");
  return (
    <div className="min-h-screen bg-canvas text-ink-strong flex">
      <ChainSidebar name={ctx.chainName} />
      <div className="flex-1 flex flex-col min-w-0">
        <ChainTopbar email={ctx.email} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
