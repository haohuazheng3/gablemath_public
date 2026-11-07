import { formatFeetInches } from "@/lib/units";
import { fmt } from "@/lib/format";

/** Edge styles shared by the plan drawing and its legend (line pattern + color, never color alone). */
export const EDGE_STYLE = {
  eaves: { stroke: "var(--accent)", width: 3.2, dash: undefined },
  rakes: { stroke: "var(--ok)", width: 3, dash: "7 4" },
  ridge: { stroke: "var(--ink)", width: 2.6, dash: undefined },
  hips: { stroke: "var(--warn)", width: 2.4, dash: "2 3" },
  valleys: { stroke: "var(--bad)", width: 2.4, dash: "9 3 2 3" },
} as const;

export type EdgeKey = keyof typeof EDGE_STYLE;

export function EdgeSwatch({ edge }: { edge: EdgeKey }) {
  const s = EDGE_STYLE[edge];
  return (
    <svg aria-hidden viewBox="0 0 28 8" className="h-2 w-7 shrink-0">
      <line x1="1" y1="4" x2="27" y2="4" stroke={s.stroke} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap="round" />
    </svg>
  );
}

const pts = (arr: [number, number][]) => arr.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

function Edge({ edge, x1, y1, x2, y2 }: { edge: EdgeKey; x1: number; y1: number; x2: number; y2: number }) {
  const s = EDGE_STYLE[edge];
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={s.stroke} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap="round" />;
}

/**
 * Top-down roof plan drawn to proportion (long side horizontal). Edges carry the same styles as
 * the legend so the user can see which lengths feed starter, ridge cap and drip edge.
 */
export function RoofPlan({
  lengthFt,
  widthFt,
  overhangFt,
  style,
}: {
  /** incl. overhangs */
  lengthFt: number;
  widthFt: number;
  overhangFt: number;
  style: "gable" | "hip" | "complex";
}) {
  const L = Math.max(lengthFt, 0.1);
  const W = Math.max(widthFt, 0.1);
  const areaW = 250;
  const areaH = 132;
  const s = Math.min(areaW / L, areaH / W);
  const w = Math.max(L * s, 40);
  const h = Math.max(W * s, 30);
  const x0 = 18 + (areaW - w) / 2;
  const y0 = 12 + (areaH - h) / 2;
  const x1 = x0 + w;
  const y1 = y0 + h;
  const ym = y0 + h / 2;
  const inset = Math.min(h / 2, w / 2);
  const oh = Math.min(overhangFt * s, h / 4);
  const hip = style !== "gable";

  return (
    <svg
      viewBox="0 0 300 176"
      className="h-auto w-full max-w-[440px]"
      role="img"
      aria-label={`${hip ? "Hip" : "Gable"} roof plan, ${formatFeetInches(lengthFt)} by ${formatFeetInches(widthFt)} including overhangs`}
    >
      {hip ? (
        <>
          <polygon points={pts([[x0, y0], [x1, y0], [x1 - inset, ym], [x0 + inset, ym]])} fill="var(--surface-3)" />
          <polygon points={pts([[x0, y1], [x1, y1], [x1 - inset, ym], [x0 + inset, ym]])} fill="var(--surface-3)" />
          <polygon points={pts([[x0, y0], [x0 + inset, ym], [x0, y1]])} fill="var(--surface)" />
          <polygon points={pts([[x1, y0], [x1 - inset, ym], [x1, y1]])} fill="var(--surface)" />
        </>
      ) : (
        <>
          <rect x={x0} y={y0} width={w} height={h / 2} fill="var(--surface-3)" />
          <rect x={x0} y={ym} width={w} height={h / 2} fill="var(--surface)" />
        </>
      )}
      {oh > 1 ? (
        <rect x={x0 + oh} y={y0 + oh} width={w - 2 * oh} height={h - 2 * oh} fill="none" stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="3 3" />
      ) : null}

      <Edge edge="eaves" x1={x0} y1={y0} x2={x1} y2={y0} />
      <Edge edge="eaves" x1={x0} y1={y1} x2={x1} y2={y1} />
      {hip ? (
        <>
          <Edge edge="eaves" x1={x0} y1={y0} x2={x0} y2={y1} />
          <Edge edge="eaves" x1={x1} y1={y0} x2={x1} y2={y1} />
          <Edge edge="hips" x1={x0} y1={y0} x2={x0 + inset} y2={ym} />
          <Edge edge="hips" x1={x0} y1={y1} x2={x0 + inset} y2={ym} />
          <Edge edge="hips" x1={x1} y1={y0} x2={x1 - inset} y2={ym} />
          <Edge edge="hips" x1={x1} y1={y1} x2={x1 - inset} y2={ym} />
          {w - 2 * inset > 0.5 ? <Edge edge="ridge" x1={x0 + inset} y1={ym} x2={x1 - inset} y2={ym} /> : null}
        </>
      ) : (
        <>
          <Edge edge="rakes" x1={x0} y1={y0} x2={x0} y2={y1} />
          <Edge edge="rakes" x1={x1} y1={y0} x2={x1} y2={y1} />
          <Edge edge="ridge" x1={x0} y1={ym} x2={x1} y2={ym} />
        </>
      )}

      <text x={(x0 + x1) / 2} y={y1 + 17} fontSize="11.5" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {formatFeetInches(lengthFt)}
      </text>
      <text x={x1 + 12} y={ym} fontSize="11.5" fontWeight="600" fill="var(--accent)" textAnchor="middle" transform={`rotate(90 ${x1 + 12} ${ym})`}>
        {formatFeetInches(widthFt)}
      </text>
      {oh > 1 ? (
        <text x={(x0 + x1) / 2} y={y1 - oh - 5} fontSize="9.5" fill="var(--ink-3)" textAnchor="middle">
          walls
        </text>
      ) : null}
    </svg>
  );
}

/** Rise-over-run triangle with the angle marked. */
export function PitchTriangle({ rise, angleDeg }: { rise: number; angleDeg: number }) {
  const r = Math.max(rise, 0);
  const s = Math.min(200 / 12, r > 0 ? 130 / r : Infinity);
  const run = 12 * s;
  const h = r * s;
  const x0 = 34;
  const yb = 160;
  const xr = x0 + run;
  const yt = yb - h;
  const arcR = Math.min(46, run * 0.45);
  const a = (angleDeg * Math.PI) / 180;
  return (
    <svg viewBox="0 0 300 184" className="h-auto w-full max-w-[380px]" role="img" aria-label={`Roof pitch ${fmt(r, 2)} in 12, ${fmt(angleDeg, 1)} degrees`}>
      <polygon points={pts([[x0, yb], [xr, yb], [xr, yt]])} fill="var(--surface-3)" />
      <line x1={x0} y1={yb} x2={xr} y2={yb} stroke="var(--ink-3)" strokeWidth="1.4" />
      <line x1={xr} y1={yb} x2={xr} y2={yt} stroke="var(--ink-3)" strokeWidth="1.4" strokeDasharray="4 3" />
      <line x1={x0 - 14 * Math.cos(a)} y1={yb + 14 * Math.sin(a)} x2={xr + 8 * Math.cos(a)} y2={yt - 8 * Math.sin(a)} stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
      <path d={`M ${x0 + arcR} ${yb} A ${arcR} ${arcR} 0 0 0 ${x0 + arcR * Math.cos(a)} ${yb - arcR * Math.sin(a)}`} fill="none" stroke="var(--ink-2)" strokeWidth="1.2" />
      <text x={x0 + arcR + 6} y={yb - 6} fontSize="11" fontWeight="600" fill="var(--ink-2)">
        {fmt(angleDeg, 1)}°
      </text>
      <text x={(x0 + xr) / 2} y={yb + 18} fontSize="12" fontWeight="600" fill="var(--ink-2)" textAnchor="middle">
        12 in run
      </text>
      <text x={xr + 8} y={(yb + yt) / 2 + 4} fontSize="12" fontWeight="600" fill="var(--accent)">
        {fmt(r, 2)} in
      </text>
    </svg>
  );
}

/** Plan of a metal roof with panel seams at the coverage width. */
export function MetalPlan({
  lengthFt,
  widthFt,
  shed,
  panelsPerSide,
  coverageIn,
  panelLabel,
}: {
  lengthFt: number;
  widthFt: number;
  shed: boolean;
  panelsPerSide: number;
  coverageIn: number;
  panelLabel: string;
}) {
  const L = Math.max(lengthFt, 0.1);
  const W = Math.max(widthFt, 0.1);
  const areaW = 250;
  const areaH = 120;
  const s = Math.min(areaW / L, areaH / W);
  const w = Math.max(L * s, 40);
  const h = Math.max(W * s, 30);
  const x0 = 18 + (areaW - w) / 2;
  const y0 = 12 + (areaH - h) / 2;
  const ym = y0 + h / 2;
  const seam = (coverageIn / 12) * s;
  const every = Math.max(1, Math.ceil(3 / Math.max(seam, 0.01)));
  const seams: number[] = [];
  for (let i = every; i < panelsPerSide; i += every) seams.push(x0 + i * seam);
  return (
    <svg viewBox="0 0 300 172" className="h-auto w-full max-w-[440px]" role="img" aria-label={`Metal roof plan: ${panelLabel}`}>
      <rect x={x0} y={y0} width={w} height={h} fill="var(--surface-3)" stroke="var(--ink-3)" strokeWidth="1" />
      {seams.map((x) => (
        <line key={x} x1={x} y1={y0} x2={x} y2={y0 + h} stroke="var(--line-strong)" strokeWidth="1" />
      ))}
      {shed ? (
        <path d={`M ${x0 + w / 2} ${y0 + 10} v ${Math.max(h - 24, 6)} m -5 -7 l 5 7 l 5 -7`} fill="none" stroke="var(--ink-2)" strokeWidth="1.4" />
      ) : (
        <line x1={x0} y1={ym} x2={x0 + w} y2={ym} stroke="var(--ink)" strokeWidth="2.6" />
      )}
      <text x={x0 + w / 2} y={y0 + h + 17} fontSize="11.5" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {formatFeetInches(lengthFt)}
      </text>
      <text x={x0 + w + 12} y={ym} fontSize="11.5" fontWeight="600" fill="var(--accent)" textAnchor="middle" transform={`rotate(90 ${x0 + w + 12} ${ym})`}>
        {formatFeetInches(widthFt)}
      </text>
      <text x={x0 + w / 2} y={y0 + h + 32} fontSize="10.5" fill="var(--ink-2)" textAnchor="middle">
        {panelLabel}
      </text>
    </svg>
  );
}
