// Family-specific SVG: cumulative cash flow (break-even) chart. Server- and client-safe (no hooks).

import { fmt } from "@/lib/format";

function money(n: number): string {
  const a = Math.abs(n);
  const s = a >= 1000 ? `$${fmt(a / 1000, a >= 10000 ? 0 : 1)}k` : `$${fmt(a, 0)}`;
  return n < 0 ? `−${s}` : s;
}

export function BreakEvenChart({ start, points, payback }: { start: number; points: { year: number; cumulative: number }[]; payback: number | null }) {
  const W = 560;
  const H = 230;
  const pad = { l: 52, r: 14, t: 16, b: 30 };
  const all = [{ year: 0, cumulative: start }, ...points];
  const n = Math.max(1, points.length);
  const ys = all.map((p) => p.cumulative);
  let lo = Math.min(0, ...ys);
  let hi = Math.max(0, ...ys);
  if (hi - lo < 1) {
    hi += 1;
    lo -= 1;
  }
  const x = (yr: number) => pad.l + (yr / n) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const line = all.map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)},${y(p.cumulative).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const ticks = [0, 5, 10, 15, 20, 25].filter((t) => t <= n);
  const end = all[all.length - 1];
  const summary =
    payback != null
      ? `Cumulative cash flow starts at ${money(start)}, breaks even in year ${fmt(payback, 1)} and ends at ${money(end.cumulative)} after ${n} years.`
      : `Cumulative cash flow starts at ${money(start)} and is still ${money(end.cumulative)} after ${n} years — no break-even.`;
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={summary}>
        <path d={area} fill="var(--accent-soft)" opacity="0.6" />
        {[hi, 0, lo].filter((v, i, a) => a.indexOf(v) === i).map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--ink-3)" : "var(--line)"} strokeWidth={v === 0 ? 1.2 : 1} strokeDasharray={v === 0 ? "0" : "3 4"} />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">
              {money(v)}
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
            {t === 0 ? "Install" : `Yr ${t}`}
          </text>
        ))}
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
        {payback != null && payback <= n ? (
          <g>
            <line x1={x(payback)} x2={x(payback)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx={x(payback)} cy={y(0)} r="5" fill="var(--bg)" stroke="var(--ink)" strokeWidth="2" />
            <text x={Math.min(x(payback) + 8, W - 120)} y={pad.t + 12} fontSize="12" fontWeight="600" fill="var(--ink)">
              Break-even ≈ year {fmt(payback, 1)}
            </text>
          </g>
        ) : (
          <text x={pad.l + 8} y={pad.t + 12} fontSize="12" fontWeight="600" fill="var(--ink)">
            No break-even within {n} years
          </text>
        )}
      </svg>
      <figcaption className="mt-1 text-[0.78rem] text-ink-3">{summary}</figcaption>
    </figure>
  );
}
