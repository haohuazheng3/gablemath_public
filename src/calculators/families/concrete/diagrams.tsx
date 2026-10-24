// Live, schematic cross-sections for the concrete calculators. Proportions follow the inputs
// (clamped so extreme values stay legible); every dimension the user must measure is labelled.

import { fmt } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const inch = (n: number) => `${fmt(n, 1)} in`;

function Defs() {
  return (
    <defs>
      <pattern id="gm-cc-concrete" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="var(--line-strong)" strokeWidth="1.2" />
      </pattern>
      <pattern id="gm-cc-soil" width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="3" r="0.9" fill="var(--ink-3)" opacity="0.35" />
        <circle cx="7" cy="8" r="0.9" fill="var(--ink-3)" opacity="0.35" />
      </pattern>
      <pattern id="gm-cc-gravel" width="9" height="9" patternUnits="userSpaceOnUse">
        <circle cx="2.5" cy="2.5" r="1.8" fill="none" stroke="var(--ink-3)" strokeWidth="0.9" />
        <circle cx="7" cy="6.5" r="1.4" fill="none" stroke="var(--ink-3)" strokeWidth="0.9" />
      </pattern>
    </defs>
  );
}

function Concrete({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  if (w <= 0 || h <= 0) return null;
  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill="var(--surface-3)" />
      <rect x={x} y={y} width={w} height={h} fill="url(#gm-cc-concrete)" />
    </>
  );
}

/** Post hole cross-section: soil cap, concrete collar, base layer, post. */
export function PostHoleSection({
  holeDiaIn,
  holeDepthIn,
  embedIn,
  baseIn,
  base,
  capIn,
  postWIn,
  aboveFt,
}: {
  holeDiaIn: number;
  holeDepthIn: number;
  embedIn: number;
  baseIn: number;
  base: "gravel" | "drymix" | "none";
  capIn: number;
  postWIn: number;
  aboveFt: number;
}) {
  const g = 64;
  const depth = Math.max(holeDepthIn, 1);
  const s = 156 / depth;
  const hw = clamp(holeDiaIn * s * 1.6, 54, 150);
  const cx = 112;
  const pw = clamp((hw * postWIn) / Math.max(holeDiaIn, 1), 6, hw - 8);
  const bottom = g + depth * s;
  const baseTop = bottom - (base === "none" ? 0 : baseIn) * s;
  const capBottom = g + Math.min(capIn, embedIn) * s;
  const postBottom = g + embedIn * s;
  const left = cx - hw / 2;
  const labelX = cx + hw / 2 + 12;
  const concreteH = Math.max(0, baseTop - capBottom);

  return (
    <svg viewBox="0 0 300 262" className="h-auto w-full max-w-[360px]" role="img" aria-label={`Post hole ${inch(holeDiaIn)} wide and ${inch(holeDepthIn)} deep, post buried ${inch(embedIn)}`}>
      <Defs />
      <rect x="8" y={g} width="284" height={bottom - g + 14} fill="url(#gm-cc-soil)" />
      <line x1="8" y1={g} x2="292" y2={g} stroke="var(--ink-2)" strokeWidth="1.4" />
      <text x="12" y={g - 6} fontSize="10.5" fill="var(--ink-3)">
        grade
      </text>
      <rect x={left} y={g} width={hw} height={bottom - g} fill="var(--surface)" stroke="var(--ink-3)" strokeWidth="1" />
      {capIn > 0 ? <rect x={left} y={g} width={hw} height={capBottom - g} fill="url(#gm-cc-soil)" /> : null}
      <Concrete x={left} y={capBottom} w={hw} h={concreteH} />
      {base === "gravel" ? <rect x={left} y={baseTop} width={hw} height={bottom - baseTop} fill="url(#gm-cc-gravel)" /> : null}
      {base === "drymix" ? <Concrete x={left} y={baseTop} w={hw} h={bottom - baseTop} /> : null}
      <rect x={cx - pw / 2} y={16} width={pw} height={postBottom - 16} fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.3" />
      <path d={`M${cx - pw / 2 - 3} 26 l${pw / 3 + 1} -5 l${pw / 3 + 1} 7 l${pw / 3 + 4} -5`} fill="none" stroke="var(--ink-3)" strokeWidth="1" />
      <text x={cx + pw / 2 + 6} y="38" fontSize="11" fontWeight="600" fill="var(--ink-2)">
        {formatFeetInches(aboveFt)} above ground
      </text>

      <line x1={labelX - 4} y1={g} x2={labelX - 4} y2={bottom + 12} stroke="var(--accent)" strokeWidth="1" />
      {capIn > 0 ? (
        <text x={labelX + 2} y={(g + capBottom) / 2 + 4} fontSize="10.5" fill="var(--ink-3)">
          {inch(capIn)} soil
        </text>
      ) : null}
      {concreteH > 0 ? (
        <text x={labelX + 2} y={(capBottom + baseTop) / 2 + 4} fontSize="11" fontWeight="600" fill="var(--accent)">
          {inch(Math.max(0, embedIn - capIn))} concrete
        </text>
      ) : null}
      {base !== "none" ? (
        <text x={labelX + 2} y={(baseTop + bottom) / 2 + 4} fontSize="10.5" fill="var(--ink-3)">
          {inch(baseIn)} {base === "gravel" ? "gravel" : "dry mix"}
        </text>
      ) : null}
      <text x={labelX + 2} y={bottom + 17} fontSize="10.5" fontWeight="600" fill="var(--ink-2)">
        {inch(holeDepthIn)} deep
      </text>
      <line x1={left} y1={bottom + 10} x2={left + hw} y2={bottom + 10} stroke="var(--accent)" strokeWidth="1" />
      <text x={cx} y={bottom + 24} fontSize="11" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {inch(holeDiaIn)} hole
      </text>
    </svg>
  );
}

/** Side profile of solid concrete steps, with a new landing or running up to an existing porch. */
export function StepsProfile({ steps, riseIn, runIn, top, landingIn, widthFt }: { steps: number; riseIn: number; runIn: number; top: "landing" | "existing"; landingIn: number; widthFt: number }) {
  const n = Math.max(1, Math.round(steps));
  const landing = top === "landing";
  const runTotal = (n - 1) * runIn + (landing ? landingIn : 0);
  const porch = landing ? 0 : Math.max(runIn * 1.6, 18);
  const height = n * riseIn;
  const s = Math.min(250 / Math.max(runTotal + porch, 1), 120 / Math.max(height, 1));
  const x0 = 26;
  const yb = 172;
  const pts: string[] = [`${x0},${yb}`];
  let x = x0;
  let y = yb;
  for (let i = 1; i < n; i++) {
    y -= riseIn * s;
    pts.push(`${x},${y}`);
    x += runIn * s;
    pts.push(`${x},${y}`);
  }
  if (landing) {
    y -= riseIn * s;
    pts.push(`${x},${y}`);
    x += landingIn * s;
    pts.push(`${x},${y}`);
  }
  pts.push(`${x},${yb}`);
  const firstRiserTop = yb - riseIn * s;

  return (
    <svg viewBox="0 0 320 206" className="h-auto w-full max-w-[400px]" role="img" aria-label={`${n} steps, ${inch(riseIn)} rise, ${inch(runIn)} treads, ${fmt(widthFt, 1)} ft wide`}>
      <Defs />
      <line x1="8" y1={yb} x2="312" y2={yb} stroke="var(--ink-2)" strokeWidth="1.4" />
      {n > 1 || landing ? (
        <>
          <polygon points={pts.join(" ")} fill="var(--surface-3)" />
          <polygon points={pts.join(" ")} fill="url(#gm-cc-concrete)" stroke="var(--ink)" strokeWidth="1.3" />
        </>
      ) : null}
      {!landing ? (
        <>
          <rect x={x} y={yb - height * s} width={porch * s} height={height * s} fill="none" stroke="var(--ink-3)" strokeDasharray="4 3" />
          <text x={x + (porch * s) / 2} y={yb - height * s - 6} fontSize="10.5" fill="var(--ink-3)" textAnchor="middle">
            existing porch
          </text>
        </>
      ) : null}
      <text x={x0 - 6} y={(yb + firstRiserTop) / 2 + 4} fontSize="11" fontWeight="600" fill="var(--accent)" textAnchor="end">
        {fmt(riseIn, 2)}″
      </text>
      {n > 1 ? (
        <text x={x0 + (runIn * s) / 2} y={firstRiserTop - 6} fontSize="11" fontWeight="600" fill="var(--accent)" textAnchor="middle">
          {fmt(runIn, 2)}″
        </text>
      ) : null}
      {landing ? (
        <text x={x - (landingIn * s) / 2} y={yb - height * s - 6} fontSize="11" fontWeight="600" fill="var(--accent)" textAnchor="middle">
          {fmt(landingIn, 1)}″ landing
        </text>
      ) : null}
      <line x1={x + (landing ? 10 : porch * s + 10)} y1={yb} x2={x + (landing ? 10 : porch * s + 10)} y2={yb - height * s} stroke="var(--ink-3)" strokeWidth="1" />
      <text x={Math.min(x + (landing ? 14 : porch * s + 14), 300)} y={yb - (height * s) / 2 + 4} fontSize="10.5" fill="var(--ink-2)">
        {fmt(height, 1)}″
      </text>
      <text x="160" y="198" fontSize="11" fill="var(--ink-3)" textAnchor="middle">
        {n} step-ups · {fmt(widthFt, 1)} ft wide
      </text>
    </svg>
  );
}

/** Round form (Sonotube) in its hole, with an optional footing underneath. */
export function TubeSection({ diaIn, lengthFt, aboveIn, footingIn, footingDiaIn }: { diaIn: number; lengthFt: number; aboveIn: number; footingIn: number; footingDiaIn: number }) {
  const len = Math.max(lengthFt * 12, 1);
  const total = len + footingIn;
  const s = 168 / total;
  const above = clamp(aboveIn, 0, len);
  const top = 30;
  const g = top + above * s;
  const tubeBottom = top + len * s;
  const tw = clamp(diaIn * s * 1.4, 26, 96);
  const holeW = Math.min(tw * 2, 190);
  const cx = 116;
  const fw = footingIn > 0 ? clamp((tw * footingDiaIn) / Math.max(diaIn, 1), tw + 6, 200) : 0;
  const bottom = tubeBottom + footingIn * s;

  return (
    <svg viewBox="0 0 300 248" className="h-auto w-full max-w-[340px]" role="img" aria-label={`${inch(diaIn)} round form, ${formatFeetInches(lengthFt)} of concrete${footingIn > 0 ? ` on a ${inch(footingIn)} footing` : ""}`}>
      <Defs />
      <rect x="8" y={g} width="284" height={bottom - g + 10} fill="url(#gm-cc-soil)" />
      <rect x={cx - holeW / 2} y={g} width={holeW} height={bottom - g} fill="var(--surface)" stroke="var(--ink-3)" strokeDasharray="4 3" />
      <line x1="8" y1={g} x2="292" y2={g} stroke="var(--ink-2)" strokeWidth="1.4" />
      <text x="12" y={g - 6} fontSize="10.5" fill="var(--ink-3)">
        grade
      </text>
      {footingIn > 0 ? <Concrete x={cx - fw / 2} y={tubeBottom} w={fw} h={bottom - tubeBottom} /> : null}
      <Concrete x={cx - tw / 2} y={top} w={tw} h={tubeBottom - top} />
      <rect x={cx - tw / 2} y={top} width={tw} height={tubeBottom - top} fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      <line x1={cx - tw / 2} y1={top - 10} x2={cx + tw / 2} y2={top - 10} stroke="var(--accent)" strokeWidth="1" />
      <text x={cx} y={top - 15} fontSize="11" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {inch(diaIn)} tube
      </text>
      <line x1={cx + holeW / 2 + 10} y1={top} x2={cx + holeW / 2 + 10} y2={tubeBottom} stroke="var(--accent)" strokeWidth="1" />
      <text x={cx + holeW / 2 + 15} y={(top + tubeBottom) / 2 + 4} fontSize="11" fontWeight="600" fill="var(--accent)">
        {formatFeetInches(lengthFt)}
      </text>
      {above > 0 ? (
        <text x={cx + holeW / 2 + 15} y={top + 10} fontSize="10" fill="var(--ink-3)">
          {inch(above)} up
        </text>
      ) : null}
      {footingIn > 0 ? (
        <text x={cx} y={bottom + 16} fontSize="10.5" fill="var(--ink-2)" textAnchor="middle">
          {inch(footingDiaIn)} × {inch(footingIn)} footing
        </text>
      ) : null}
    </svg>
  );
}

/** Continuous footing cross-section with the wall on top and the bars 3 in off the bottom. */
export function FootingSection({ widthIn, thickIn, wallIn, bars }: { widthIn: number; thickIn: number; wallIn: number; bars: number }) {
  const w = Math.max(widthIn, 1);
  const t = Math.max(thickIn, 1);
  const s = Math.min(200 / Math.max(w, wallIn), 74 / t);
  const fw = w * s;
  const fh = t * s;
  const cx = 150;
  const yb = 168;
  const ft = yb - fh;
  const ww = Math.min(wallIn * s, fw);
  const n = Math.max(0, Math.round(bars));
  const barY = yb - 3 * s;
  const proj = wallIn > 0 ? (w - wallIn) / 2 : 0;

  return (
    <svg viewBox="0 0 300 206" className="h-auto w-full max-w-[380px]" role="img" aria-label={`Footing ${inch(widthIn)} wide by ${inch(thickIn)} thick${wallIn > 0 ? ` under an ${inch(wallIn)} wall` : ""}`}>
      <Defs />
      {wallIn > 0 ? (
        <>
          <rect x={cx - ww / 2} y={22} width={ww} height={ft - 22} fill="var(--surface)" stroke="var(--ink-3)" strokeWidth="1" />
          <path d={`M${cx - ww / 2 - 4} 30 l${ww / 3 + 2} -6 l${ww / 3 + 2} 8 l${ww / 3 + 4} -6`} fill="none" stroke="var(--ink-3)" />
          <text x={cx} y={ft - 10} fontSize="10.5" fill="var(--ink-3)" textAnchor="middle">
            {inch(wallIn)} wall
          </text>
        </>
      ) : null}
      <Concrete x={cx - fw / 2} y={ft} w={fw} h={fh} />
      <rect x={cx - fw / 2} y={ft} width={fw} height={fh} fill="none" stroke="var(--ink)" strokeWidth="1.4" />
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={cx - fw / 2 + (fw * (i + 1)) / (n + 1)} cy={barY} r="3.2" fill="var(--ink)" />
      ))}
      <line x1={cx - fw / 2} y1={yb + 12} x2={cx + fw / 2} y2={yb + 12} stroke="var(--accent)" strokeWidth="1" />
      <text x={cx} y={yb + 27} fontSize="11" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {inch(widthIn)} wide{n > 0 ? " · bars 3 in off the bottom" : ""}
      </text>
      <line x1={cx + fw / 2 + 10} y1={ft} x2={cx + fw / 2 + 10} y2={yb} stroke="var(--accent)" strokeWidth="1" />
      <text x={cx + fw / 2 + 15} y={(ft + yb) / 2 + 4} fontSize="11" fontWeight="600" fill="var(--accent)">
        {inch(thickIn)}
      </text>
      {proj > 0 ? (
        <text x={cx - fw / 2 + 2} y={ft - 6} fontSize="10" fill="var(--ink-3)">
          {inch(proj)} ↔
        </text>
      ) : null}
    </svg>
  );
}
