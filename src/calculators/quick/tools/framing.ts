import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { defineTool } from "../types";

// Wall framing per IRC R602.3: studs at 16 or 24 in on center, single bottom plate, double top plate.
// Precut stud lengths are the sizes yards stock for 8, 9 and 10 ft ceilings.
export const PRECUT: Record<number, string> = { 8: "92-5/8 in", 9: "104-5/8 in", 10: "116-5/8 in" };

export interface FramingInput {
  lengthFt: number;
  spacingIn: number;
  corners: number;
  tees: number;
  openings: number;
  openingWidthIn: number;
  wastePct: number;
}

export function frameWall(i: FramingInput) {
  const layout = Math.floor((i.lengthFt * 12) / i.spacingIn) + 1;
  const insideOpenings = Math.max(0, Math.floor(i.openingWidthIn / i.spacingIn)) * i.openings;
  const fullLength = layout + 2 * i.corners + 2 * i.tees + 4 * i.openings - insideOpenings;
  const cripples = insideOpenings * 2; // one above the header and one below a sill per removed layout stud
  const withWaste = ceilQty(fullLength * (1 + i.wastePct / 100));
  return { layout, fullLength, studs: withWaste, cripples, headers: i.openings };
}

export const framing = defineTool({
  key: "lumber/framing-calculator",
  name: "Stud & Wall Framing Calculator",
  unitToggle: true,
  defaults: { len: 24, h: 8, sp: 16, corners: 2, tees: 0, doors: 1, windows: 1, ow: 36, stock: 12, waste: 10 },
  sections: [
    {
      fields: [
        { kind: "length", key: "len", label: "Wall length", help: "Frame each straight wall separately, or add lengths together and count the corners." },
        {
          kind: "segmented",
          key: "h",
          label: "Ceiling height",
          columns: 3,
          options: [
            { value: 8, label: "8 ft", sub: "92-5/8 in studs" },
            { value: 9, label: "9 ft", sub: "104-5/8 in" },
            { value: 10, label: "10 ft", sub: "116-5/8 in" },
          ],
        },
        {
          kind: "segmented",
          key: "sp",
          label: "Stud spacing",
          options: [
            { value: 16, label: "16 in on center" },
            { value: 24, label: "24 in on center" },
          ],
        },
        { kind: "number", key: "doors", label: "Door openings", step: 1, min: 0, max: 20, decimals: 0 },
        { kind: "number", key: "windows", label: "Window openings", step: 1, min: 0, max: 30, decimals: 0 },
      ],
    },
    {
      title: "Corners, plates & waste",
      more: true,
      fields: [
        { kind: "number", key: "corners", label: "Corners at the wall ends", step: 1, min: 0, max: 8, decimals: 0, help: "Each corner adds two studs for a backer to nail drywall to." },
        { kind: "number", key: "tees", label: "Walls meeting this one (T-intersections)", step: 1, min: 0, max: 10, decimals: 0 },
        { kind: "number", key: "ow", label: "Typical rough opening width", suffix: "in", step: 2, min: 18, max: 96, decimals: 0 },
        {
          kind: "segmented",
          key: "stock",
          label: "Plate lumber length",
          columns: 4,
          options: [
            { value: 8, label: "8 ft" },
            { value: 10, label: "10 ft" },
            { value: 12, label: "12 ft" },
            { value: 16, label: "16 ft" },
          ],
        },
        { kind: "number", key: "waste", label: "Add for waste & crooked studs", suffix: "%", step: 5, min: 0, max: 25, decimals: 0 },
      ],
    },
  ],
  compute(v) {
    const lengthFt = Number(v.len);
    const openings = Number(v.doors) + Number(v.windows);
    const r = frameWall({
      lengthFt,
      spacingIn: Number(v.sp),
      corners: Number(v.corners),
      tees: Number(v.tees),
      openings,
      openingWidthIn: Number(v.ow),
      wastePct: Number(v.waste),
    });
    const plateFt = lengthFt * 3;
    const stock = Number(v.stock);
    const platePieces = ceilQty((plateFt * 1.05) / stock);
    const studLen = PRECUT[Number(v.h)] ?? PRECUT[8];
    const rule = ceilQty(lengthFt);
    return {
      hero: {
        label: "You need",
        value: fmtInt(r.studs),
        unit: `${studLen} studs`,
        sub: `${fmtInt(r.layout)} on layout at ${v.sp} in o.c. + corners, ${openings ? `king & jack studs for ${openings} opening${openings === 1 ? "" : "s"}` : "no openings"} + ${fmt(Number(v.waste))}% · ${fmtInt(platePieces)} × ${stock}-ft plates`,
      },
      stats: [
        { label: "Plates", value: fmtInt(platePieces), unit: `× ${stock} ft`, hint: `${fmt(plateFt, 1)} ft: 1 bottom + 2 top` },
        { label: "Headers", value: fmtInt(r.headers), hint: "Size each one from IRC Table R602.7(1)" },
        { label: "Cripples", value: fmtInt(r.cripples), hint: "Short studs above headers and below sills — cut from offcuts" },
        { label: "\"One per foot\" rule", value: fmtInt(rule), hint: `Your count is ${r.studs >= rule ? "above" : "below"} the rule of thumb` },
      ],
      tables: [
        {
          title: "Where the studs go",
          caption: "Stud count breakdown",
          columns: ["Part", "Studs"],
          rows: [
            [`Layout: ${fmt(lengthFt, 2)} ft ÷ ${v.sp} in + 1`, fmtInt(r.layout)],
            [`Corners (${v.corners} × 2)`, fmtInt(2 * Number(v.corners))],
            [`T-intersections (${v.tees} × 2)`, fmtInt(2 * Number(v.tees))],
            [`Openings: 2 king + 2 jack each (${openings})`, fmtInt(4 * openings)],
            ["Layout studs that land inside openings", `−${fmtInt(r.cripples / 2)}`],
            [`Waste ${fmt(Number(v.waste))}%`, `+${fmtInt(r.studs - r.fullLength)}`],
            ["Total full-length studs", fmtInt(r.studs)],
          ],
        },
      ],
      shopping: [
        { id: "studs", name: `studs ${studLen}`, qty: r.studs, unit: "studs" },
        { id: "plates", name: `2×4 plate stock ${stock} ft`, qty: platePieces, unit: "boards" },
      ],
      notes: [
        { tone: "info", text: "Exterior and load-bearing walls need a header over every opening sized to the span and the load above; non-bearing interior walls can use a flat 2×4 header. Check your local code before you cut." },
      ],
      summary: `${r.studs} studs (${studLen}) and ${platePieces} × ${stock}-ft plates for a ${fmt(lengthFt, 1)} ft wall`,
    };
  },
});
