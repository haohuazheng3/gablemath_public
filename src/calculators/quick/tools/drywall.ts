import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { defineTool } from "../types";

// Joint compound: USG estimates ~two 4.5-gal pails of ready-mixed all-purpose compound per
// 1,000 sq ft of board (USG FAQ 1977). Tape is measured from the sheet layout itself.
export const DRYWALL = {
  doorSqft: 21, // 3 ft × 7 ft
  windowSqft: 15, // 3 ft × 5 ft
  mudGalPer1000: 9,
  pailGal: 4.5,
  wallScrewSpacingIn: 16,
  ceilingScrewSpacingIn: 12,
} as const;

/** Screws for one sheet hung across framing at `framingIn` centers, fastened every `alongIn`. */
export function screwsPerSheet(sheetLenFt: number, framingIn: number, alongIn: number) {
  const members = Math.floor((sheetLenFt * 12) / framingIn) + 1;
  const perMember = Math.floor(48 / alongIn) + 1;
  return members * perMember;
}

export const drywall = defineTool({
  key: "walls/drywall-calculator",
  name: "Drywall Calculator",
  unitToggle: true,
  defaults: { mode: "room", l: 12, w: 12, h: 8, ceil: true, doors: 1, windows: 2, area: 400, sheet: 8, framing: 16, waste: 10 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "mode",
          label: "Measure by",
          options: [
            { value: "room", label: "Room size" },
            { value: "area", label: "Square feet" },
          ],
        },
        { kind: "length", key: "l", label: "Room length", showIf: (v) => v.mode === "room" },
        { kind: "length", key: "w", label: "Room width", showIf: (v) => v.mode === "room" },
        { kind: "length", key: "h", label: "Ceiling height", showIf: (v) => v.mode === "room" },
        { kind: "toggle", key: "ceil", label: "Drywall the ceiling too", showIf: (v) => v.mode === "room" },
        { kind: "number", key: "doors", label: "Doors", step: 1, min: 0, max: 20, decimals: 0, help: "Each takes out about 21 sq ft (3 × 7 ft).", showIf: (v) => v.mode === "room" },
        { kind: "number", key: "windows", label: "Windows", step: 1, min: 0, max: 30, decimals: 0, help: "Each takes out about 15 sq ft (3 × 5 ft).", showIf: (v) => v.mode === "room" },
        { kind: "number", key: "area", label: "Wall and ceiling area", suffix: "sq ft", step: 10, min: 0, decimals: 0, showIf: (v) => v.mode === "area" },
        {
          kind: "segmented",
          key: "sheet",
          label: "Sheet size",
          columns: 4,
          options: [
            { value: 8, label: "4×8", sub: "32 sq ft" },
            { value: 9, label: "4×9", sub: "36 sq ft" },
            { value: 10, label: "4×10", sub: "40 sq ft" },
            { value: 12, label: "4×12", sub: "48 sq ft" },
          ],
        },
      ],
    },
    {
      title: "Framing & waste",
      more: true,
      fields: [
        {
          kind: "segmented",
          key: "framing",
          label: "Stud / joist spacing",
          options: [
            { value: 16, label: "16 in on center" },
            { value: 24, label: "24 in on center" },
          ],
        },
        { kind: "number", key: "waste", label: "Add for waste", suffix: "%", step: 5, min: 0, max: 25, decimals: 0, help: "10% is typical; 15% for rooms with many corners, soffits or a stairwell." },
      ],
    },
  ],
  compute(v) {
    const room = v.mode === "room";
    const L = Number(v.l);
    const W = Number(v.w);
    const H = Number(v.h);
    const walls = room ? 2 * (L + W) * H : 0;
    const ceiling = room && v.ceil ? L * W : 0;
    const openings = room ? Number(v.doors) * DRYWALL.doorSqft + Number(v.windows) * DRYWALL.windowSqft : 0;
    const net = room ? Math.max(0, walls + ceiling - openings) : Number(v.area);
    const sheetLen = Number(v.sheet);
    const sheetSqft = 4 * sheetLen;
    const order = net * (1 + Number(v.waste) / 100);
    const sheets = ceilQty(order / sheetSqft);
    const wallShare = room && walls + ceiling > 0 ? (walls - openings) / (walls + ceiling - openings) : 1;
    const wallSheets = Math.round(sheets * Math.max(0, Math.min(1, wallShare)));
    const ceilSheets = sheets - wallSheets;
    const framing = Number(v.framing);
    const screws =
      wallSheets * screwsPerSheet(sheetLen, framing, DRYWALL.wallScrewSpacingIn) + ceilSheets * screwsPerSheet(sheetLen, framing, DRYWALL.ceilingScrewSpacingIn);
    // tape: each sheet contributes one long and one short seam, plus inside corners of the room
    const corners = room ? 4 * H + (v.ceil ? 2 * (L + W) : 0) : 0;
    const tapeFt = Math.round((net / sheetSqft) * (sheetLen + 4) + corners);
    const mudGal = (net / 1000) * DRYWALL.mudGalPer1000;
    const pails = ceilQty(mudGal / DRYWALL.pailGal);
    return {
      hero: {
        label: "You need",
        value: fmtInt(sheets),
        unit: `sheets of 4×${sheetLen} drywall`,
        sub: `${fmtInt(net)} sq ft to cover + ${fmt(Number(v.waste))}% waste${room ? ` · ${fmtInt(walls - openings)} sq ft of wall${ceiling ? `, ${fmtInt(ceiling)} sq ft of ceiling` : ""}` : ""}`,
      },
      stats: [
        { label: "Joint compound", value: fmtInt(pails), unit: "× 4.5-gal pails", hint: `≈ ${fmt(mudGal, 1)} gal all-purpose, 3 coats` },
        { label: "Paper tape", value: fmtInt(tapeFt), unit: "ft", hint: `${ceilQty(tapeFt / 250)} × 250-ft rolls` },
        { label: "Drywall screws", value: fmtInt(screws), hint: `1-1/4 in coarse thread for 1/2 in board on wood` },
        { label: "Sheets", value: room && ceiling ? `${wallSheets} + ${ceilSheets}` : fmtInt(sheets), hint: room && ceiling ? "walls + ceiling" : `${sheetSqft} sq ft each` },
      ],
      tables: [
        {
          title: "Same job, other sheet sizes",
          caption: "Sheets needed by size",
          columns: ["Sheet", "Sheets", "Seams to tape"],
          rows: [8, 9, 10, 12].map((s) => {
            const n = ceilQty(order / (4 * s));
            return [`4×${s} (${4 * s} sq ft)`, fmtInt(n), `${fmtInt((net / (4 * s)) * (s + 4) + corners)} ft`];
          }),
          highlight: [8, 9, 10, 12].indexOf(sheetLen),
          note: "Longer sheets mean fewer butt joints to feather, but a 4×12 sheet of 1/2 in board weighs roughly 60–80 lb depending on whether it is a lightweight panel — plan on two people.",
        },
      ],
      shopping: [
        { id: "sheets", name: `drywall sheets 4×${sheetLen}`, qty: sheets, unit: "sheets" },
        { id: "mud", name: "all-purpose joint compound (4.5 gal)", qty: pails, unit: "pails" },
        { id: "tape", name: "paper joint tape (250 ft)", qty: ceilQty(tapeFt / 250), unit: "rolls" },
        { id: "screws", name: "1-1/4 in drywall screws", qty: screws, unit: "screws" },
      ],
      notes: [
        { tone: "info", text: "Use 1/2 in board on walls. For ceilings on 24 in framing USG calls for 5/8 in or 1/2 in sag-resistant ceiling board, and a garage ceiling under a bedroom needs 5/8 in Type X (IRC R302.6)." },
      ],
      summary: `${sheets} sheets of 4×${sheetLen} drywall for ${fmtInt(net)} sq ft, ${pails} pails of mud, ${fmtInt(tapeFt)} ft of tape`,
    };
  },
});
