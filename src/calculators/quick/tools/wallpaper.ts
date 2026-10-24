import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { defineTool } from "../types";

// Roll formats: US/Euro double roll 20.5 in × 33 ft (~56 sq ft, York, Graham & Brown);
// older American 27 in × 27 ft double roll; York peel-and-stick 20.5 in × 20 ft (34.2 sq ft).
export const ROLLS = [
  { value: "std", label: "Standard roll — 20.5 in × 33 ft (56 sq ft)", w: 20.5, l: 33 },
  { value: "wide", label: "Older American roll — 27 in × 27 ft (61 sq ft)", w: 27, l: 27 },
  { value: "peel", label: "Peel & stick — 20.5 in × 20 ft (34 sq ft)", w: 20.5, l: 20 },
];
export const TRIM_IN = 4; // 2 in at the ceiling and 2 in at the baseboard

export function wallpaperPlan(perimeterFt: number, heightFt: number, rollW: number, rollLft: number, repeatIn: number, match: string, openingsSqft: number) {
  const raw = heightFt * 12 + TRIM_IN;
  let cut = repeatIn > 0 ? Math.ceil(raw / repeatIn - 1e-9) * repeatIn : raw;
  if (repeatIn > 0 && match === "drop") cut += repeatIn / 2;
  const perRoll = Math.floor((rollLft * 12) / cut + 1e-9);
  const stripArea = (rollW / 12) * heightFt;
  const gross = ceilQty((perimeterFt * 12) / rollW);
  // half credit for doors and windows: strips above and below them still have to be cut from full lengths
  const saved = Math.floor((openingsSqft * 0.5) / stripArea);
  const strips = Math.max(0, gross - saved);
  const rolls = perRoll > 0 ? ceilQty(strips / perRoll) : 0;
  const usable = perRoll * stripArea;
  return { cut, perRoll, strips, rolls, usable };
}

export const wallpaper = defineTool({
  key: "paint/wallpaper-calculator",
  name: "Wallpaper Calculator",
  unitToggle: true,
  defaults: { mode: "room", l: 12, w: 12, wall: 12, h: 8, doors: 1, windows: 1, roll: "std", rep: 21, match: "straight" },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "mode",
          label: "Papering",
          options: [
            { value: "room", label: "Whole room" },
            { value: "wall", label: "One accent wall" },
          ],
        },
        { kind: "length", key: "l", label: "Room length", showIf: (v) => v.mode === "room" },
        { kind: "length", key: "w", label: "Room width", showIf: (v) => v.mode === "room" },
        { kind: "length", key: "wall", label: "Wall width", showIf: (v) => v.mode === "wall" },
        { kind: "length", key: "h", label: "Wall height" },
        { kind: "number", key: "doors", label: "Doors", step: 1, min: 0, max: 10, decimals: 0 },
        { kind: "number", key: "windows", label: "Windows", step: 1, min: 0, max: 20, decimals: 0 },
        { kind: "select", key: "roll", label: "Roll size", options: ROLLS.map((r) => ({ value: r.value, label: r.label })) },
        { kind: "number", key: "rep", label: "Pattern repeat", suffix: "in", step: 1, min: 0, max: 64, decimals: 2, help: "Printed on the label as 'repeat' or 'V-rep'. Use 0 for a random-match paper." },
        {
          kind: "segmented",
          key: "match",
          label: "Match",
          columns: 3,
          options: [
            { value: "straight", label: "Straight" },
            { value: "drop", label: "Half-drop" },
            { value: "random", label: "Random" },
          ],
          showIf: (v) => Number(v.rep) > 0,
        },
      ],
    },
  ],
  compute(v) {
    const perimeter = v.mode === "wall" ? Number(v.wall) : 2 * (Number(v.l) + Number(v.w));
    const H = Number(v.h);
    const roll = ROLLS.find((r) => r.value === v.roll) ?? ROLLS[0];
    const rep = v.match === "random" ? 0 : Number(v.rep);
    const openings = Number(v.doors) * 21 + Number(v.windows) * 15;
    const p = wallpaperPlan(perimeter, H, roll.w, roll.l, rep, String(v.match), openings);
    const net = Math.max(0, perimeter * H - openings);
    const plain = wallpaperPlan(perimeter, H, roll.w, roll.l, 0, "random", openings);
    return {
      hero: {
        label: `${fmtInt(net)} sq ft of wall`,
        value: fmtInt(p.rolls),
        unit: `rolls (${roll.w} in × ${roll.l} ft)`,
        sub: `${p.strips} strips cut ${fmt(p.cut, 1)} in long · ${p.perRoll} strips per roll · ${fmt(p.usable, 1)} usable sq ft per roll`,
      },
      dock: `${fmtInt(p.rolls)} rolls`,
      stats: [
        { label: "Strips per roll", value: fmtInt(p.perRoll), hint: `${roll.l} ft ÷ ${fmt(p.cut, 1)} in cut length` },
        { label: "Strips needed", value: fmtInt(p.strips), hint: "Half credit for doors and windows" },
        { label: "Repeat waste", value: rep ? `${fmtInt(p.rolls - plain.rolls)} roll${p.rolls - plain.rolls === 1 ? "" : "s"}` : "None", hint: rep ? `vs. a random-match paper` : "Random match — no repeat to line up" },
        { label: "Buy one extra?", value: "Yes", hint: "Same batch/lot number, for repairs and miscuts" },
      ],
      tables: [
        {
          title: "How the repeat changes the order",
          caption: "Rolls by pattern repeat",
          columns: ["Repeat", "Cut length", "Strips per roll", "Rolls"],
          rows: [0, 10.25, 18, 21, 25.25].map((r) => {
            const q = wallpaperPlan(perimeter, H, roll.w, roll.l, r, r ? String(v.match === "random" ? "straight" : v.match) : "random", openings);
            return [r ? `${r} in` : "Random", `${fmt(q.cut, 1)} in`, fmtInt(q.perRoll), fmtInt(q.rolls)];
          }),
        },
      ],
      shopping: [{ id: "rolls", name: `wallpaper ${roll.w} in × ${roll.l} ft (same lot)`, qty: p.rolls + 1, unit: "rolls" }],
      notes: [{ tone: "tip", text: "US wallpaper is often priced per single roll but shipped as double rolls. Check whether the price and the 'rolls' in a listing mean single or double before you order." }],
      summary: `${p.rolls} rolls of ${roll.w} in × ${roll.l} ft wallpaper for ${fmtInt(net)} sq ft (${fmt(rep, 2)} in repeat)`,
    };
  },
});
