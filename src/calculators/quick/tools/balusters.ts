import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { defineTool } from "../types";

// IRC R312.1.3: guard openings must not pass a 4 in sphere (4-3/8 in on the open side of stairs).
export const SPHERE_IN = 4;

/** Fewest balusters that keep every gap at or under `maxGapIn`, spaced evenly between two posts. */
export function spaceBalusters(spanIn: number, widthIn: number, maxGapIn: number) {
  const n = Math.max(0, ceilQty((spanIn - maxGapIn) / (widthIn + maxGapIn)));
  const gap = (spanIn - n * widthIn) / (n + 1);
  return { n, gap, onCenter: gap + widthIn };
}

export const BALUSTER_WIDTHS = [
  { value: "1.5", label: "1-1/2 in square wood (2×2)" },
  { value: "1.25", label: "1-1/4 in turned spindle" },
  { value: "0.75", label: "3/4 in round metal" },
  { value: "0.625", label: "5/8 in square metal" },
];

export const balusters = defineTool({
  key: "lumber/baluster-spacing-calculator",
  name: "Baluster Spacing Calculator",
  unitToggle: true,
  defaults: { span: 72, w: "1.5", gap: 3.5, sections: 4 },
  sections: [
    {
      fields: [
        { kind: "length", key: "span", label: "Space between posts (inside faces)", base: "in", help: "Measure each section between the posts, not post center to post center." },
        { kind: "select", key: "w", label: "Baluster width", options: BALUSTER_WIDTHS },
        {
          kind: "segmented",
          key: "gap",
          label: "Largest gap you'll allow",
          columns: 3,
          options: [
            { value: 3.5, label: "3-1/2 in", sub: "safe margin" },
            { value: 3.75, label: "3-3/4 in" },
            { value: 3.875, label: "3-7/8 in", sub: "tightest" },
          ],
          help: "The code limit is a 4 in sphere. Leave margin for balusters that bow or shrink.",
        },
        { kind: "number", key: "sections", label: "Number of identical sections", step: 1, min: 1, max: 100, decimals: 0 },
      ],
    },
  ],
  compute(v) {
    const span = Number(v.span);
    const w = Number(v.w);
    const r = spaceBalusters(span, w, Number(v.gap));
    const total = r.n * Number(v.sections);
    return {
      hero: { label: `${formatFeetInches(span / 12)} between posts`, value: fmtInt(r.n), unit: "balusters per section", sub: `Gaps of ${fmt(r.gap, 3)} in · ${fmt(r.onCenter, 3)} in on center · ${fmtInt(total)} balusters for ${v.sections} section${Number(v.sections) === 1 ? "" : "s"}` },
      dock: `${r.n} per section`,
      stats: [
        { label: "Actual gap", value: fmt(r.gap, 3), unit: "in", hint: `≈ ${formatFeetInches(r.gap / 12)} — under the 4 in sphere`, emphasis: r.gap >= SPHERE_IN },
        { label: "On-center spacing", value: fmt(r.onCenter, 3), unit: "in", hint: "Mark the rail at this interval" },
        { label: "First baluster center", value: fmt(r.gap + w / 2, 3), unit: "in", hint: "From the inside face of the post" },
        { label: "Total balusters", value: fmtInt(total), hint: "Buy 5–10% extra for splits and miscuts" },
      ],
      tables: [
        {
          title: "Balusters for common railing sections",
          caption: "Balusters per section by width",
          columns: ["Section", ...BALUSTER_WIDTHS.map((b) => b.label.split(" ")[0] + " in")],
          rows: [36, 48, 60, 72, 96].map((s) => [`${s} in (${fmt(s / 12, 1)} ft)`, ...BALUSTER_WIDTHS.map((b) => fmtInt(spaceBalusters(s, Number(b.value), Number(v.gap)).n))]),
        },
      ],
      notes: [
        { tone: "info", text: "Guards are required where a deck, porch or landing is more than 30 in above the ground below (IRC R312.1.1), and must be at least 36 in tall. On the open side of stairs the limit loosens to a 4-3/8 in sphere." },
        { tone: "tip", text: "Cut a scrap block exactly as wide as the gap and use it as a spacer instead of measuring every baluster." },
      ],
      shopping: [{ id: "balusters", name: `balusters ${BALUSTER_WIDTHS.find((b) => b.value === String(v.w))?.label ?? ""}`, qty: ceilQty(total * 1.05), unit: "balusters" }],
      summary: `${r.n} balusters per ${fmt(span, 1)} in section with ${fmt(r.gap, 2)} in gaps (${total} total)`,
    };
  },
});
