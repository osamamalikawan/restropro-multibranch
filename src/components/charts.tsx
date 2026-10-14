export type Series = { name: string; color: string; values: number[] };

export function LineChart({ days, series }: { days: string[]; series: Series[] }) {
  const W = 760, H = 220, max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = Math.max(1, days.length - 1), x = (i: number) => 36 + (i * (W - 50)) / n, y = (v: number) => H - 24 - (v / max) * (H - 44);
  const step = Math.max(1, Math.ceil(days.length / 8));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Daily sales">
      {[0, 0.5, 1].map((t) => <g key={t}><line x1="36" x2={W - 10} y1={y(max * t)} y2={y(max * t)} stroke="var(--line)" strokeDasharray="3 4" /><text x="32" y={y(max * t) + 3} fontSize="9" fill="var(--ink-faint)" textAnchor="end">{Math.round((max * t) / 1000)}k</text></g>)}
      {series.map((s) => <polyline key={s.name} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />)}
      {days.map((d, i) => i % step === 0 && <text key={d} x={x(i)} y={H - 6} fontSize="9" fill="var(--ink-faint)" textAnchor="middle">{d.slice(5)}</text>)}
    </svg>
  );
}

export function Bars({ rows }: { rows: { label: string; value: number; color: string; text: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs text-ink-mid mb-1"><span>{r.label}</span><span className="font-mono">{r.text}</span></div>
          <div className="h-2.5 rounded-full bg-raised overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} /></div>
        </div>
      ))}
    </div>
  );
}
