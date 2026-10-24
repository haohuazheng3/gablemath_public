"use client";

import { formatFeetInches } from "@/lib/units";

/**
 * Live isometric slab/area diagram. Proportions follow the inputs (clamped so very long or very
 * thin shapes stay legible) and each edge is labelled with the real dimension.
 */
export function IsoBlock({
  length,
  width,
  depthIn,
  label = "Slab",
  fill = "var(--surface-3)",
}: {
  length: number; // ft
  width: number; // ft
  depthIn: number; // inches
  label?: string;
  fill?: string;
}) {
  const L = Math.max(length, 0.1);
  const W = Math.max(width, 0.1);
  const maxSide = Math.max(L, W);
  const sx = Math.max(0.28, L / maxSide);
  const sy = Math.max(0.28, W / maxSide);
  const unit = 120;
  const a = sx * unit; // length along x-iso
  const b = sy * unit; // width along y-iso
  const h = Math.min(34, Math.max(7, depthIn * 3.2));
  const cos = Math.cos(Math.PI / 6);
  const sin = Math.sin(Math.PI / 6);
  // origin = front-bottom corner
  const ox = 30 + b * cos;
  const oy = 46 + (a + b) * sin + h;
  const p = (x: number, y: number, z: number) => [ox + x * cos - y * cos, oy - x * sin - y * sin - z] as const;
  const pts = (arr: (readonly [number, number])[]) => arr.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const top = [p(0, 0, h), p(a, 0, h), p(a, b, h), p(0, b, h)];
  const front = [p(0, 0, 0), p(a, 0, 0), p(a, 0, h), p(0, 0, h)];
  const side = [p(0, 0, 0), p(0, b, 0), p(0, b, h), p(0, 0, h)];
  const width_ = ox + a * cos + 30;
  const height_ = oy + 26;
  const lenMid = p(a / 2, 0, 0);
  const widMid = p(0, b / 2, 0);
  const depMid = p(a, 0, h / 2);

  return (
    <svg
      viewBox={`0 0 ${Math.max(260, width_).toFixed(0)} ${height_.toFixed(0)}`}
      className="h-auto w-full max-w-[420px]"
      role="img"
      aria-label={`${label}: ${formatFeetInches(length)} by ${formatFeetInches(width)}, ${depthIn} inches deep`}
    >
      <polygon points={pts(side)} fill={fill} stroke="var(--ink-3)" strokeWidth="1" opacity="0.75" />
      <polygon points={pts(front)} fill={fill} stroke="var(--ink-3)" strokeWidth="1" />
      <polygon points={pts(top)} fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.4" />
      <polygon points={pts(top)} fill="url(#gm-hatch)" opacity="0.5" />
      <defs>
        <pattern id="gm-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--line-strong)" strokeWidth="1" />
        </pattern>
      </defs>
      <text x={lenMid[0] + 6} y={lenMid[1] + 18} fontSize="12" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {formatFeetInches(length)}
      </text>
      <text x={widMid[0] - 8} y={widMid[1] + 18} fontSize="12" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {formatFeetInches(width)}
      </text>
      <text x={depMid[0] + 10} y={depMid[1] + 4} fontSize="11" fontWeight="600" fill="var(--ink-2)">
        {depthIn}&quot;
      </text>
    </svg>
  );
}

/** Top-down circle (round pad, tree ring, column top). */
export function CircleDiagram({ diameter, label }: { diameter: number; label?: string }) {
  return (
    <svg viewBox="0 0 200 160" className="h-auto w-full max-w-[300px]" role="img" aria-label={`${label ?? "Circle"} ${formatFeetInches(diameter)} across`}>
      <ellipse cx="100" cy="80" rx="70" ry="58" fill="var(--surface-3)" stroke="var(--ink)" strokeWidth="1.4" />
      <line x1="30" y1="80" x2="170" y2="80" stroke="var(--accent)" strokeWidth="1.4" strokeDasharray="4 3" />
      <text x="100" y="72" fontSize="12" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {formatFeetInches(diameter)}
      </text>
    </svg>
  );
}
