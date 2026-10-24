import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { defineTool } from "../types";

// ASTM A615 nominal weights (lb/ft) and diameters (in).
export const BARS: Record<string, { dia: number; lbPerFt: number }> = {
  "3": { dia: 0.375, lbPerFt: 0.376 },
  "4": { dia: 0.5, lbPerFt: 0.668 },
  "5": { dia: 0.625, lbPerFt: 1.043 },
  "6": { dia: 0.75, lbPerFt: 1.502 },
};
export const STICK_FT = 20;
export const LAP_DIAMETERS = 40;
export const EDGE_COVER_IN = 3;

/** Bars needed in one direction: runs of `runFt` spaced `spacingIn` across `acrossFt`, keeping edge cover. */
export function barRun(runFt: number, acrossFt: number, spacingIn: number, lapFt: number) {
  const cover = EDGE_COVER_IN / 12;
  const bars = Math.floor(((acrossFt - 2 * cover) * 12) / spacingIn) + 1;
  const len = Math.max(0, runFt - 2 * cover);
  const splices = len > STICK_FT ? Math.ceil((len - STICK_FT) / (STICK_FT - lapFt)) : 0;
  return { bars, len, splices, feet: bars * (len + splices * lapFt) };
}

export const rebar = defineTool({
  key: "concrete/rebar-calculator",
  name: "Rebar Calculator",
  unitToggle: true,
  defaults: { l: 20, w: 20, bar: "4", sp: 18, waste: 5 },
  sections: [
    {
      fields: [
        { kind: "length", key: "l", label: "Slab length" },
        { kind: "length", key: "w", label: "Slab width" },
        {
          kind: "segmented",
          key: "bar",
          label: "Bar size",
          columns: 4,
          options: [
            { value: "3", label: "#3", sub: "3/8 in" },
            { value: "4", label: "#4", sub: "1/2 in" },
            { value: "5", label: "#5", sub: "5/8 in" },
            { value: "6", label: "#6", sub: "3/4 in" },
          ],
        },
        {
          kind: "segmented",
          key: "sp",
          label: "Grid spacing (each way)",
          columns: 4,
          options: [
            { value: 12, label: "12 in" },
            { value: 16, label: "16 in" },
            { value: 18, label: "18 in" },
            { value: 24, label: "24 in" },
          ],
        },
        { kind: "number", key: "waste", label: "Add for cuts", suffix: "%", step: 5, min: 0, max: 20, decimals: 0 },
      ],
    },
  ],
  compute(v) {
    const bar = BARS[String(v.bar)] ?? BARS["4"];
    const lapFt = (LAP_DIAMETERS * bar.dia) / 12;
    const sp = Number(v.sp);
    const L = Number(v.l);
    const W = Number(v.w);
    const a = barRun(L, W, sp, lapFt);
    const b = barRun(W, L, sp, lapFt);
    const feet = (a.feet + b.feet) * (1 + Number(v.waste) / 100);
    const sticks = ceilQty(feet / STICK_FT);
    const lb = feet * bar.lbPerFt;
    const chairs = ceilQty((L * W) / 9);
    const ties = a.bars * b.bars;
    return {
      hero: { label: `#${v.bar} bars, ${sp} in on center each way`, value: fmtInt(sticks), unit: "20-ft bars", sub: `${fmtInt(feet)} linear ft incl. ${fmt(lapFt * 12, 0)} in laps and ${fmt(Number(v.waste))}% · ${fmtInt(lb)} lb of steel · ${a.bars} × ${b.bars} grid` },
      dock: `${fmtInt(sticks)} bars`,
      stats: [
        { label: "Linear feet", value: fmtInt(feet) },
        { label: "Weight", value: fmtInt(lb), unit: "lb", hint: `${bar.lbPerFt} lb/ft (ASTM A615)` },
        { label: "Lap splice", value: fmt(lapFt * 12, 0), unit: "in", hint: `${LAP_DIAMETERS} bar diameters` },
        { label: "Chairs / dobies", value: fmtInt(chairs), hint: "About one every 3 ft each way" },
        { label: "Tie wire points", value: fmtInt(ties), hint: "Every crossing; many crews tie every other one" },
        { label: "Edge cover", value: `${EDGE_COVER_IN} in`, hint: "Bars stop 3 in short of every edge" },
      ],
      tables: [
        {
          caption: "Bars in each direction",
          columns: ["Direction", "Bars", "Length each", "Splices per bar"],
          rows: [
            [`Along the ${fmt(L, 1)} ft side`, fmtInt(a.bars), `${fmt(a.len, 1)} ft`, fmtInt(a.splices)],
            [`Along the ${fmt(W, 1)} ft side`, fmtInt(b.bars), `${fmt(b.len, 1)} ft`, fmtInt(b.splices)],
          ],
        },
      ],
      shopping: [
        { id: "bars", name: `#${v.bar} rebar 20 ft`, qty: sticks, unit: "bars" },
        { id: "chairs", name: "rebar chairs", qty: chairs, unit: "chairs" },
      ],
      notes: [{ tone: "info", text: "Rebar only works if it ends up in the middle of the slab, not lying on the dirt. Set it on chairs so it sits near mid-depth of a 4 in slab." }],
      summary: `${sticks} × 20-ft #${v.bar} bars (${fmtInt(feet)} ft, ${fmtInt(lb)} lb) for a ${fmt(L, 1)}×${fmt(W, 1)} ft slab at ${sp} in o.c.`,
    };
  },
});
