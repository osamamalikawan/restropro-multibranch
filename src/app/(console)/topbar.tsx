"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

export function ChainTopbar({ email }: { email: string }) {
  const [out, setOut] = useState(false);
  const router = useRouter();
  async function logout() { setOut(true); await createClient().auth.signOut(); router.push("/login"); router.refresh(); }
  return (
    <header className="h-16 border-b border-line bg-canvas flex items-center justify-between px-6 shrink-0">
      <div className="font-display font-semibold text-ink-strong">Owner Console</div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <span className="text-sm text-ink-mid hidden sm:inline">{email}</span>
        <button onClick={logout} disabled={out} className="text-xs text-ink-faint hover:text-crimson-400 border border-line rounded-md px-3 py-1.5 disabled:opacity-50">{out ? "…" : "Log out"}</button>
      </div>
    </header>
  );
}
