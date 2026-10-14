"use client";
import { useRouter, usePathname } from "next/navigation";

export function BranchPicker({ branches, value }: { branches: { id: string; name: string }[]; value: string }) {
  const router = useRouter();
  const path = usePathname();
  return (
    <select value={value} onChange={(e) => router.push(`${path}?branch=${e.target.value}`)} className="rounded-md border border-line bg-canvas px-3 py-2 text-sm">
      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
  );
}
