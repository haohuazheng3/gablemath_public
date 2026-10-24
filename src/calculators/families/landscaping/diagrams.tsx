"use client";

// Live landscaping diagrams: a tree-ring plan view and a layer cross-section. Theme-aware (CSS vars only).

import { useId } from "react";
import { fmt } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";

function safeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

/** Plan view of a mulch ring: mulch annulus, bare gap at the trunk, trunk. */
export function RingDiagram({ ringFt, trunkIn, gapIn }: { ringFt: number; trunkIn: number; gapIn: number }) {
  const id = safeId(useId());
  const cx = 110;
  const cy = 88;
  const R = 74;
  const outerFt = Math.max(ringFt / 2, 0.1);
  const trunkFt = Math.max(0, trunkIn) / 24;
  const gapFt = trunkFt + gapIn / 12;
  const rt = Math.max(3, Math.min(R - 10, (trunkFt / outerFt) * R));
  const rg = Math.max(rt + 3, Math.min(R - 4, (gapFt / outerFt) * R));
  return (
    <svg
      viewBox="0 0 220 186"
      className="h-auto w-full max-w-[300px]"
      role="img"
      aria-label={`Tree ring ${formatFeetInches(ringFt)} across around a ${fmt(trunkIn)} inch trunk, with a ${gapIn} inch bare gap at the bark`}
    >
      <defs>
        <pattern id={`${id}-h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--line-strong)" strokeWidth="1.4" />
        </pattern>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="var(--surface-3)" stroke="var(--ink)" strokeWidth="1.4" />
      <circle cx={cx} cy={cy} r={R} fill={`url(#${id}-h)`} />
      <circle cx={cx} cy={cy} r={rg} fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="3 2" />
      <circle cx={cx} cy={cy} r={rt} fill="var(--ink-3)" />
      <line x1={cx - R} y1={cy + R + 10} x2={cx + R} y2={cy + R + 10} stroke="var(--accent)" strokeWidth="1.2" />
      <line x1={cx - R} y1={cy + R + 5} x2={cx - R} y2={cy + R + 15} stroke="var(--accent)" strokeWidth="1.2" />
      <line x1={cx + R} y1={cy + R + 5} x2={cx + R} y2={cy + R + 15} stroke="var(--accent)" strokeWidth="1.2" />
      <text x={cx} y={cy + R + 24} fontSize="12" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {formatFeetInches(ringFt)} ring
      </text>
      <text x={cx + rg + 4} y={cy - rg - 2} fontSize="10.5" fontWeight="600" fill="var(--ink-2)">
        {gapIn}&quot; gap
      </text>
    </svg>
  );
}

export interface DiagramLayer {
  label: string;
  depthIn: number;
  kind: "paver" | "sand" | "stone" | "fines" | "mulch" | "soil";
}

/** Cross-section of stacked layers drawn to scale (thin layers get a minimum height to stay legible). */
export function LayersDiagram({ layers, caption }: { layers: DiagramLayer[]; caption: string }) {
  const id = safeId(useId());
  const visible = layers.filter((l) => l.depthIn > 0);
  const total = visible.reduce((s, l) => s + l.depthIn, 0) || 1;
  const scale = Math.min(12, 140 / total);
  const x = 28;
  const w = 160;
  const rows = visible.reduce<(DiagramLayer & { y: number; h: number })[]>((acc, l) => {
    const prev = acc[acc.length - 1];
    acc.push({ ...l, y: prev ? prev.y + prev.h : 14, h: Math.max(14, l.depthIn * scale) });
    return acc;
  }, []);
  const last = rows[rows.length - 1];
  const y = last ? last.y + last.h : 14;
  const subgradeH = 22;
  const height = y + subgradeH + 14;
  const fill = (k: DiagramLayer["kind"]) =>
    k === "paver" ? "var(--surface)" : k === "sand" ? `url(#${id}-sand)` : k === "stone" ? `url(#${id}-stone)` : k === "fines" ? `url(#${id}-fines)` : k === "mulch" ? `url(#${id}-mulch)` : `url(#${id}-soil)`;

  return (
    <svg viewBox={`0 0 340 ${height}`} className="h-auto w-full max-w-[420px]" role="img" aria-label={caption}>
      <defs>
        <pattern id={`${id}-sand`} width="5" height="5" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill="var(--surface-2)" />
          <circle cx="1.5" cy="1.5" r="0.7" fill="var(--ink-3)" />
        </pattern>
        <pattern id={`${id}-stone`} width="12" height="10" patternUnits="userSpaceOnUse">
          <rect width="12" height="10" fill="var(--surface-3)" />
          <circle cx="3" cy="3" r="2.4" fill="none" stroke="var(--ink-3)" strokeWidth="0.9" />
          <circle cx="9" cy="7.5" r="2" fill="none" stroke="var(--ink-3)" strokeWidth="0.9" />
        </pattern>
        <pattern id={`${id}-fines`} width="8" height="7" patternUnits="userSpaceOnUse">
          <rect width="8" height="7" fill="var(--surface-3)" />
          <circle cx="2" cy="2" r="1.6" fill="none" stroke="var(--ink-3)" strokeWidth="0.8" />
          <circle cx="6" cy="5" r="0.8" fill="var(--ink-3)" />
        </pattern>
        <pattern id={`${id}-mulch`} width="10" height="6" patternUnits="userSpaceOnUse">
          <rect width="10" height="6" fill="var(--surface-3)" />
          <line x1="1" y1="4" x2="6" y2="2" stroke="var(--ink-3)" strokeWidth="1" />
        </pattern>
        <pattern id={`${id}-soil`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="var(--surface-2)" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--line-strong)" strokeWidth="1.2" />
        </pattern>
      </defs>
      {rows.map((r) => (
        <g key={`${r.label}-${r.y}`}>
          <rect x={x} y={r.y} width={w} height={r.h} fill={fill(r.kind)} stroke="var(--ink-3)" strokeWidth="0.8" />
          {r.kind === "paver"
            ? Array.from({ length: 5 }, (_, i) => <line key={i} x1={x + (w / 6) * (i + 1)} y1={r.y} x2={x + (w / 6) * (i + 1)} y2={r.y + r.h} stroke="var(--ink-3)" strokeWidth="0.8" />)
            : null}
          <text x={x + w + 10} y={r.y + r.h / 2 - 1} fontSize="11" fontWeight="600" fill="var(--ink)">
            {r.label}
          </text>
          <text x={x + w + 10} y={r.y + r.h / 2 + 11} fontSize="10" fill="var(--ink-3)">
            {fmt(r.depthIn, 2)} in
          </text>
        </g>
      ))}
      <rect x={x} y={y} width={w} height={subgradeH} fill={`url(#${id}-soil)`} />
      <line x1={x} y1={y} x2={x + w} y2={y} stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="4 3" />
      <text x={x + w + 10} y={y + 15} fontSize="10.5" fill="var(--ink-3)">
        Firm subgrade
      </text>
      <line x1={x - 8} y1={14} x2={x - 8} y2={y} stroke="var(--accent)" strokeWidth="1.2" />
      <text x={x - 11} y={(14 + y) / 2} fontSize="10.5" fontWeight="600" fill="var(--accent)" textAnchor="middle" transform={`rotate(-90 ${x - 11} ${(14 + y) / 2})`}>
        {fmt(total, 2)} in
      </text>
    </svg>
  );
}
