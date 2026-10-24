// Live top-down diagrams for the flooring family. Plain SVG driven by props (no hooks), imported only by
// the client calculators. Colors come from CSS variables so they follow light and dark mode.

import { formatFeetInches } from "@/lib/units";
import type { CarpetLayout, CarpetStairsResult, CutPlan, Rect } from "./compute";
import type { Layout } from "./data";

const W = 360;
const H = 210;
const PAD = 22;

function PlankPattern({ id, layout, along, rowPx, plankPx }: { id: string; layout: Layout; along: "x" | "y"; rowPx: number; plankPx: number }) {
  if (layout === "herringbone") {
    const s = Math.max(7, rowPx * 1.6);
    return (
      <pattern id={id} width={s * 2} height={s} patternUnits="userSpaceOnUse" patternTransform={along === "y" ? "rotate(90)" : undefined}>
        <path d={`M0 ${s} L${s} 0 L${s * 2} ${s}`} fill="none" stroke="var(--ink-3)" strokeWidth="0.8" opacity="0.7" />
        <path d={`M${s / 2} ${s} L${s} ${s / 2} M${s * 1.5} ${s} L${s} ${s / 2}`} fill="none" stroke="var(--line-strong)" strokeWidth="0.8" />
      </pattern>
    );
  }
  const angle = layout === "diagonal" ? 45 : along === "y" ? 90 : 0;
  const h = rowPx * 3;
  return (
    <pattern id={id} width={plankPx} height={h} patternUnits="userSpaceOnUse" patternTransform={angle ? `rotate(${angle})` : undefined}>
      {[0, 1, 2].map((i) => (
        <g key={i} stroke="var(--line-strong)" strokeWidth="0.9">
          <line x1="0" y1={(i + 1) * rowPx} x2={plankPx} y2={(i + 1) * rowPx} />
          <line x1={(plankPx * i) / 3} y1={i * rowPx} x2={(plankPx * i) / 3} y2={(i + 1) * rowPx} stroke="var(--ink-3)" opacity="0.55" />
        </g>
      ))}
    </pattern>
  );
}

/** Rooms side by side at one scale, filled with the plank layout in the chosen direction. */
export function FloorPlan({
  uid,
  areas,
  layout,
  along,
  plankWidthIn,
  plankLengthIn,
}: {
  uid: string;
  areas: Rect[];
  layout: Layout;
  /** planks run along each area's length (x) or width (y) */
  along: "x" | "y";
  plankWidthIn?: number;
  plankLengthIn?: number;
}) {
  const shown = areas.filter((a) => a.l > 0 && a.w > 0);
  if (!shown.length) return null;
  const gap = 16;
  const totalL = shown.reduce((s, a) => s + a.l, 0);
  const maxW = Math.max(...shown.map((a) => a.w));
  const scale = Math.min((W - 2 * PAD - gap * (shown.length - 1)) / totalL, (H - 2 * PAD - 12) / maxW);
  const rowPx = Math.max(4, ((plankWidthIn ?? 7) / 12) * scale);
  const plankPx = Math.max(18, ((plankLengthIn ?? 48) / 12) * scale);
  const patternId = `${uid}-planks`;
  const boxes = shown.map((a, i) => {
    const x = PAD + shown.slice(0, i).reduce((s, b) => s + b.l * scale + gap, 0);
    const w = a.l * scale;
    const h = a.w * scale;
    return { a, x, w, h, y: PAD + (maxW * scale - h) / 2 };
  });
  const directionText = layout === "herringbone" ? "herringbone" : layout === "diagonal" ? "planks at 45°" : "plank direction";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[460px]" role="img" aria-label={`Floor plan: ${shown.map((a) => `${formatFeetInches(a.l)} by ${formatFeetInches(a.w)}`).join(", ")}, ${layout} layout`}>
      <defs>
        <PlankPattern id={patternId} layout={layout} along={along} rowPx={rowPx} plankPx={plankPx} />
      </defs>
      {boxes.map(({ a, x, y, w, h }, i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.4" rx="1.5" />
          <rect x={x} y={y} width={w} height={h} fill={`url(#${patternId})`} />
          <text x={x + w / 2} y={y - 6} fontSize="11" fontWeight="600" fill="var(--accent)" textAnchor="middle">
            {formatFeetInches(a.l)}
          </text>
          <text x={x + w + 4} y={y + h / 2} fontSize="11" fontWeight="600" fill="var(--accent)" dominantBaseline="middle" transform={`rotate(90 ${x + w + 4} ${y + h / 2})`} textAnchor="middle">
            {formatFeetInches(a.w)}
          </text>
        </g>
      ))}
      <g transform={`translate(${PAD} ${H - 14})`}>
        {layout === "straight" ? (
          along === "x" ? (
            <path d="M0 0 H34 M28 -4 L34 0 L28 4" fill="none" stroke="var(--ink-2)" strokeWidth="1.4" strokeLinecap="round" />
          ) : (
            <path d="M14 6 V-18 M10 -12 L14 -18 L18 -12" fill="none" stroke="var(--ink-2)" strokeWidth="1.4" strokeLinecap="round" />
          )
        ) : null}
        <text x={layout === "straight" ? 42 : 0} y="4" fontSize="10.5" fill="var(--ink-3)">
          {directionText}
        </text>
      </g>
    </svg>
  );
}

/** A plain square for area-only estimates. */
export function AreaTile({ sqft }: { sqft: number }) {
  return (
    <svg viewBox="0 0 200 120" className="h-auto w-full max-w-[260px]" role="img" aria-label={`${Math.round(sqft)} square feet`}>
      <rect x="50" y="10" width="100" height="100" rx="3" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.4" />
      <text x="100" y="64" fontSize="15" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {Math.round(sqft).toLocaleString("en-US")} ft²
      </text>
    </svg>
  );
}

/**
 * Room with the carpet drops laid side by side: seams dashed, fill overhang hatched, pile arrow.
 * Drawn in run/across coordinates and turned upright when that gives a larger drawing.
 */
export function CarpetPlan({ uid, room, layout }: { uid: string; room: Rect; layout: CarpetLayout }) {
  if (!(room.l > 0 && room.w > 0) || layout.drops === 0) return null;
  const run = layout.runAlong === "length" ? room.l : room.w;
  const across = layout.runAlong === "length" ? room.w : room.l;
  const covered = layout.drops * layout.rollFt;
  const roomW = W - 2 * PAD - 24;
  const roomH = H - 2 * PAD - 14;
  const flatScale = Math.min(roomW / run, roomH / covered);
  const uprightScale = Math.min(roomW / covered, roomH / run);
  const upright = uprightScale > flatScale;
  const scale = Math.max(flatScale, uprightScale);
  const x0 = PAD + 10;
  const y0 = PAD;
  /** (u along the run, v across it) → SVG rect */
  const box = (u: number, v: number, du: number, dv: number) =>
    upright ? { x: x0 + v, y: y0 + u, width: dv, height: du } : { x: x0 + u, y: y0 + v, width: du, height: dv };
  const runPx = run * scale;
  const acrossPx = across * scale;
  const rollPx = layout.rollFt * scale;
  const room_ = box(0, 0, runPx, acrossPx);
  const hatch = `${uid}-over`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[460px]" role="img" aria-label={`${layout.drops} drop${layout.drops === 1 ? "" : "s"} of ${layout.rollFt} ft carpet, ${layout.seams} seam${layout.seams === 1 ? "" : "s"}`}>
      <defs>
        <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--warn)" strokeWidth="1" opacity="0.5" />
        </pattern>
      </defs>
      {Array.from({ length: layout.drops }, (_, i) => {
        const inRoom = Math.min(rollPx, acrossPx - i * rollPx);
        const lane = box(0, i * rollPx, runPx, inRoom);
        const over = box(0, i * rollPx + inRoom, runPx, rollPx - inRoom);
        return (
          <g key={i}>
            <rect {...lane} fill={i % 2 ? "var(--accent-softer)" : "var(--accent-soft)"} />
            {rollPx - inRoom > 0.5 ? <rect {...over} fill={`url(#${hatch})`} stroke="var(--warn)" strokeDasharray="3 3" strokeWidth="0.8" /> : null}
            <text x={lane.x + 6} y={lane.y + 15} fontSize="10.5" fill="var(--ink-2)">
              Drop {i + 1}
            </text>
          </g>
        );
      })}
      {Array.from({ length: layout.seams }, (_, i) => {
        const seam = box(0, (i + 1) * rollPx, runPx, 0);
        return <line key={i} x1={seam.x} y1={seam.y} x2={seam.x + seam.width} y2={seam.y + seam.height} stroke="var(--accent)" strokeWidth="1.6" strokeDasharray="6 4" />;
      })}
      <rect {...room_} fill="none" stroke="var(--ink)" strokeWidth="1.4" />
      <text x={room_.x + room_.width / 2} y={room_.y - 7} fontSize="11" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {formatFeetInches(upright ? across : run)}
      </text>
      <text x={room_.x - 8} y={room_.y + room_.height / 2} fontSize="11" fontWeight="600" fill="var(--accent)" textAnchor="middle" transform={`rotate(-90 ${room_.x - 8} ${room_.y + room_.height / 2})`}>
        {formatFeetInches(upright ? run : across)}
      </text>
      <g transform={`translate(${W - PAD - 52} ${H - 14})`}>
        {upright ? (
          <path d="M8 -18 V2 M4 -4 L8 2 L12 -4" fill="none" stroke="var(--ink-2)" strokeWidth="1.4" strokeLinecap="round" />
        ) : (
          <path d="M-14 0 H8 M2 -4 L8 0 L2 4" fill="none" stroke="var(--ink-2)" strokeWidth="1.4" strokeLinecap="round" />
        )}
        <text x="16" y="2" fontSize="10.5" fill="var(--ink-3)">
          pile
        </text>
      </g>
    </svg>
  );
}

/** Stair pieces packed across the roll, pile running down each step. */
export function StairStrip({ stairs, rollFt, stairWidthIn }: { stairs: CarpetStairsResult; rollFt: number; stairWidthIn: number }) {
  if (stairs.rows === 0) return null;
  const lenFt = stairs.linearFt;
  const scale = Math.min((W - 2 * PAD) / rollFt, (H - 2 * PAD - 6) / lenFt);
  const sw = rollFt * scale;
  const sh = lenFt * scale;
  const x0 = (W - sw) / 2;
  const y0 = PAD;
  const pw = (stairWidthIn / 12) * scale;
  const ph = (stairs.pieceIn / 12) * scale;
  const cellW = Math.min(pw, sw / stairs.across - 4);
  const cells = Array.from({ length: stairs.steps }, (_, i) => ({
    n: i + 1,
    x: x0 + (i % stairs.across) * (sw / stairs.across) + 2,
    y: y0 + Math.floor(i / stairs.across) * ph + 1,
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[460px]" role="img" aria-label={`${stairs.steps} stair pieces, ${stairs.across} across a ${rollFt} ft roll, ${stairs.rows} rows`}>
      <rect x={x0} y={y0} width={sw} height={sh} fill="var(--surface-3)" stroke="var(--ink-3)" strokeWidth="1" />
      {cells.map(({ n, x, y }) => (
        <g key={n}>
          <rect x={x} y={y} width={cellW} height={ph - 2} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1" rx="1.5" />
          <text x={x + cellW / 2} y={y + ph / 2 + 3} fontSize="10" fill="var(--ink-2)" textAnchor="middle">
            {n}
          </text>
        </g>
      ))}
      <text x={x0 + sw / 2} y={y0 - 7} fontSize="11" fontWeight="600" fill="var(--accent)" textAnchor="middle">
        {formatFeetInches(rollFt)} roll
      </text>
      <text x={x0 + sw + 6} y={y0 + sh / 2} fontSize="11" fontWeight="600" fill="var(--accent)">
        {formatFeetInches(lenFt)}
      </text>
    </svg>
  );
}

/** Cut list: each stick of trim with the wall pieces cut from it; the unshaded tail is offcut. */
export function CutList({ plan, stockFt, max = 14 }: { plan: CutPlan; stockFt: number; max?: number }) {
  const sticks = plan.sticks.slice(0, max);
  if (!sticks.length) return null;
  const row = 20;
  const labelW = 26;
  const barW = W - labelW - 8;
  const h = sticks.length * row + 8;
  const scale = barW / stockFt;
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${h}`} className="h-auto w-full max-w-[460px]" role="img" aria-label={`Cut list: ${plan.sticks.length} sticks of ${stockFt} ft`}>
        {sticks.map((pieces, i) => {
          const y = 4 + i * row;
          return (
            <g key={i}>
              <text x="0" y={y + 12} fontSize="10" fill="var(--ink-3)">
                {i + 1}
              </text>
              <rect x={labelW} y={y} width={barW} height={row - 6} rx="3" fill="var(--surface-3)" stroke="var(--line-strong)" />
              {pieces.map((p, j) => {
                const x = labelW + pieces.slice(0, j).reduce((s, q) => s + q * scale, 0);
                const w = p * scale;
                return (
                  <g key={j}>
                    <rect x={x} y={y} width={w} height={row - 6} rx="3" fill={j % 2 ? "var(--accent-softer)" : "var(--accent-soft)"} stroke="var(--accent)" strokeWidth="0.9" />
                    {w > 30 ? (
                      <text x={x + w / 2} y={y + 11} fontSize="9.5" fontWeight="600" fill="var(--ink-2)" textAnchor="middle">
                        {formatFeetInches(p)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {plan.sticks.length > max ? <figcaption className="mt-1 text-[0.76rem] text-ink-3">+ {plan.sticks.length - max} more sticks</figcaption> : null}
    </figure>
  );
}
