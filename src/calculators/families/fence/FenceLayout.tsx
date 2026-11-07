import { fmt } from "@/lib/format";
import { FT_PER_M, formatFeetInches } from "@/lib/units";
import type { Layout, PostKind } from "./compute";

/** Sides turn at right angles: down, right, up, left — a 3-sided layout reads as a backyard "U". */
const TURNS: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];
const W = 340;
const MAX_H = 230;
const MARK = 6;

const KIND_ORDER: PostKind[] = ["line", "corner", "end", "gate"];

/**
 * Live top-down sketch of the fence: every side, post and gate, drawn to scale. Shapes (not just
 * colors) tell post types apart, and the legend repeats the counts in text.
 */
export function FenceLayout({ layout, metric, names }: { layout: Layout; metric: boolean; names: Record<PostKind, string> }) {
  const runs = layout.runs;
  if (!runs.length) return null;
  const dirs = runs.length === 1 ? [[1, 0] as [number, number]] : runs.map((_, i) => TURNS[i % 4]);

  const starts: [number, number][] = [];
  let x = 0;
  let y = 0;
  runs.forEach((r, i) => {
    starts.push([x, y]);
    x += dirs[i][0] * r.length;
    y += dirs[i][1] * r.length;
  });
  const xs = [...starts.map((p) => p[0]), x];
  const ys = [...starts.map((p) => p[1]), y];
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const bw = Math.max(...xs) - minX;
  const bh = Math.max(...ys) - minY;
  const scale = Math.min(bw > 0 ? W / bw : Infinity, bh > 0 ? MAX_H / bh : Infinity, 40);
  // room for length labels beside the lines and for gate swings that open outside the sketch
  const maxLeaf = Math.max(0, ...runs.flatMap((r) => r.gates.map((g) => (g.double ? g.width / 2 : g.width) * scale)));
  const padX = Math.max(52, maxLeaf + 6);
  const padY = Math.max(30, maxLeaf + 6);
  const vbW = bw * scale + padX * 2;
  const vbH = bh * scale + padY * 2;

  const at = (i: number, d: number): [number, number] => [
    padX + (starts[i][0] + dirs[i][0] * d - minX) * scale,
    padY + (starts[i][1] + dirs[i][1] * d - minY) * scale,
  ];
  const len = (ft: number) => (metric ? `${fmt(ft / FT_PER_M, 1)} m` : formatFeetInches(ft));
  const p = (pt: [number, number]) => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`;
  const gates = runs.reduce((s, r) => s + r.gates.length, 0);

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${vbW.toFixed(0)} ${vbH.toFixed(0)}`}
        className="mx-auto h-auto w-full max-w-[460px]"
        role="img"
        aria-label={`Top-down fence layout: ${runs.length} side${runs.length > 1 ? "s" : ""}, ${len(layout.totalFt)} total, ${layout.posts} posts, ${gates} gate${gates === 1 ? "" : "s"}`}
      >
        {runs.map((r, i) => {
          const [dx, dy] = dirs[i];
          const n: [number, number] = [dy, -dx]; // inward side of the yard
          const a = at(i, 0);
          const b = at(i, r.length);
          const mid = at(i, r.length / 2);
          const anchor = -n[0] > 0 ? "start" : -n[0] < 0 ? "end" : "middle";
          const lx = mid[0] - n[0] * 10;
          const ly = n[1] < 0 ? mid[1] + 17 : n[1] > 0 ? mid[1] - 8 : mid[1] + 4;
          return (
            <g key={i}>
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--ink-2)" strokeWidth={3} strokeLinecap="square" />
              {r.gates.map((g, j) => {
                const g0 = at(i, g.start);
                const g1 = at(i, g.start + g.width);
                const wPx = g.width * scale;
                const leaf = g.double ? wPx / 2 : wPx;
                const tip = (o: [number, number], k: number): [number, number] => [o[0] + n[0] * leaf * k, o[1] + n[1] * leaf * k];
                const along = (o: [number, number], k: number): [number, number] => [o[0] + dx * leaf * k, o[1] + dy * leaf * k];
                const arcs = g.double
                  ? `M${p(g0)} L${p(tip(g0, 1))} A${leaf} ${leaf} 0 0 1 ${p(along(g0, 1))} M${p(g1)} L${p(tip(g1, 1))} A${leaf} ${leaf} 0 0 0 ${p(along(g1, -1))}`
                  : `M${p(g0)} L${p(tip(g0, 1))} A${leaf} ${leaf} 0 0 1 ${p(g1)}`;
                return (
                  <g key={j}>
                    <line x1={g0[0]} y1={g0[1]} x2={g1[0]} y2={g1[1]} stroke="var(--surface-2)" strokeWidth={5} />
                    <path d={arcs} fill="none" stroke="var(--accent)" strokeWidth={1.2} strokeDasharray="3 2.5" />
                  </g>
                );
              })}
              <text x={lx} y={ly} fontSize="11" fontWeight="600" fill="var(--accent)" textAnchor={anchor}>
                {len(r.length)}
              </text>
            </g>
          );
        })}
        {runs.map((r, i) =>
          r.posts.map((post, j) => {
            const [cx, cy] = at(i, post.d);
            const key = `${i}-${j}`;
            if (post.kind === "end") return <circle key={key} cx={cx} cy={cy} r={MARK / 2 + 0.6} fill="var(--ink)" />;
            const fill = post.kind === "corner" ? "var(--ink)" : post.kind === "gate" ? "var(--accent)" : "var(--surface)";
            return <rect key={key} x={cx - MARK / 2} y={cy - MARK / 2} width={MARK} height={MARK} fill={fill} stroke="var(--ink-2)" strokeWidth={1} />;
          }),
        )}
      </svg>
      <figcaption className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[0.76rem] text-ink-3">
        {KIND_ORDER.filter((k) => layout.counts[k] > 0).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <Marker kind={k} />
            <span className="num font-semibold text-ink-2">{layout.counts[k]}</span> {names[k]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function Marker({ kind }: { kind: PostKind }) {
  return (
    <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
      {kind === "end" ? (
        <circle cx="5" cy="5" r="4.2" fill="var(--ink)" />
      ) : (
        <rect x="1" y="1" width="8" height="8" fill={kind === "corner" ? "var(--ink)" : kind === "gate" ? "var(--accent)" : "var(--surface)"} stroke="var(--ink-2)" strokeWidth="1.2" />
      )}
    </svg>
  );
}
