"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Package, Warehouse, Users, type LucideIcon } from "lucide-react";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/branches", label: "Branches", icon: Building2 },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/employees", label: "Employees", icon: Users },
];

export function ChainSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-line bg-surface p-4 hidden md:flex md:flex-col overflow-y-auto">
      <div className="mb-6 px-2">
        <div className="font-display text-lg font-semibold text-ink-strong">{name}</div>
        <div className="text-[10px] text-ink-faint uppercase tracking-wide">Multi-branch</div>
      </div>
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-wide text-ink-faint font-semibold px-2 mb-2">Manage</div>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm mb-0.5 transition-colors ${active ? "bg-chili-500/15 text-chili-400 font-semibold" : "text-ink-mid hover:bg-hover hover:text-ink-strong"}`}>
              <Icon size={16} className={active ? "opacity-100" : "opacity-70"} />{item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
