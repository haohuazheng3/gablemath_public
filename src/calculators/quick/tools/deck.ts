import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { defineTool } from "../types";

// Maximum deck joist spans, no cantilever, 40 psf live + 10 psf dead — IRC 2021 Table R507.6.
// Values in feet. Southern pine is the usual pressure-treated species east of the Rockies;
// Douglas fir-larch, hem-fir and SPF share a row.
export const JOIST_SPAN: Record<string, Record<string, Record<number, number>>> = {
  sp: {
    "2x6": { 12: 9 + 11 / 12, 16: 9, 24: 7 + 7 / 12 },
    "2x8": { 12: 13 + 1 / 12, 16: 11 + 10 / 12, 24: 9 + 8 / 12 },
    "2x10": { 12: 16 + 2 / 12, 16: 14, 24: 11 + 5 / 12 },
    "2x12": { 12: 18, 16: 16 + 6 / 12, 24: 13 + 6 / 12 },
  },
  df: {
    "2x6": { 12: 9 + 6 / 12, 16: 8 + 8 / 12, 24: 7 + 2 / 12 },
    "2x8": { 12: 12 + 6 / 12, 16: 11 + 1 / 12, 24: 9 + 1 / 12 },
    "2x10": { 12: 15 + 8 / 12, 16: 13 + 7 / 12, 24: 11 + 1 / 12 },
    "2x12": { 12: 18, 16: 15 + 9 / 12, 24: 12 + 10 / 12 },
  },
};

export const DECK_BOARDS: Record<string, { name: string; widthIn: number; gapIn: number; maxSpacing: number }> = {
  wood54: { name: "5/4×6 pressure-treated", widthIn: 5.5, gapIn: 0.125, maxSpacing: 16 },
  wood26: { name: "2×6 pressure-treated or cedar", widthIn: 5.5, gapIn: 0.125, maxSpacing: 24 },
  comp: { name: "Composite (5.5 in)", widthIn: 5.5, gapIn: 0.1875, maxSpacing: 16 },
};

export const deck = defineTool({
  key: "lumber/deck-calculator",
  name: "Deck Calculator",
  unitToggle: true,
  defaults: { l: 16, d: 12, board: "wood54", stock: 16, sp: 16, joist: "2x10", species: "sp", fast: "screw", waste: 10 },
  sections: [
    {
      fields: [
        { kind: "length", key: "l", label: "Deck length (along the house)" },
        { kind: "length", key: "d", label: "Deck depth (out from the house)", help: "Joists run this direction, from the ledger to the beam." },
        {
          kind: "select",
          key: "board",
          label: "Decking",
          options: Object.entries(DECK_BOARDS).map(([value, b]) => ({ value, label: b.name })),
        },
        {
          kind: "segmented",
          key: "stock",
          label: "Board length",
          columns: 4,
          options: [
            { value: 12, label: "12 ft" },
            { value: 16, label: "16 ft" },
            { value: 20, label: "20 ft" },
          ],
        },
      ],
    },
    {
      title: "Framing & fasteners",
      more: true,
      fields: [
        {
          kind: "segmented",
          key: "sp",
          label: "Joist spacing",
          options: [
            { value: 12, label: "12 in" },
            { value: 16, label: "16 in" },
            { value: 24, label: "24 in" },
          ],
        },
        {
          kind: "segmented",
          key: "joist",
          label: "Joist size",
          columns: 4,
          options: [
            { value: "2x6", label: "2×6" },
            { value: "2x8", label: "2×8" },
            { value: "2x10", label: "2×10" },
            { value: "2x12", label: "2×12" },
          ],
        },
        {
          kind: "segmented",
          key: "species",
          label: "Lumber species",
          options: [
            { value: "sp", label: "Southern pine" },
            { value: "df", label: "Doug fir / hem-fir / SPF" },
          ],
        },
        {
          kind: "segmented",
          key: "fast",
          label: "Board fastening",
          options: [
            { value: "screw", label: "Face screws" },
            { value: "clip", label: "Hidden clips" },
          ],
        },
        { kind: "number", key: "waste", label: "Add for waste", suffix: "%", step: 5, min: 0, max: 25, decimals: 0, help: "10% for a straight layout; 15% for diagonal or picture-frame borders." },
      ],
    },
  ],
  compute(v) {
    const L = Number(v.l);
    const D = Number(v.d);
    const b = DECK_BOARDS[String(v.board)] ?? DECK_BOARDS.wood54;
    const stock = Number(v.stock);
    const sp = Number(v.sp);
    const area = L * D;
    // boards run parallel to the house, across the joists
    const rows = ceilQty((D * 12) / (b.widthIn + b.gapIn));
    const piecesPerRow = ceilQty(L / stock);
    const boards = ceilQty(rows * piecesPerRow * (1 + Number(v.waste) / 100));
    const joists = Math.floor((L * 12) / sp) + 1;
    const span = JOIST_SPAN[String(v.species)]?.[String(v.joist)]?.[sp] ?? 0;
    const spanOk = D <= span + 1e-6;
    const crossings = rows * joists;
    const screws = v.fast === "clip" ? 0 : crossings * 2;
    const clips = v.fast === "clip" ? crossings : 0;
    const joistStock = ceilQty(D / 2) * 2;
    const tooWide = sp > b.maxSpacing;
    return {
      hero: {
        label: `${fmt(L, 1)} × ${fmt(D, 1)} ft deck · ${fmtInt(area)} sq ft`,
        value: fmtInt(boards),
        unit: `${stock}-ft deck boards`,
        sub: `${fmtInt(rows)} rows of ${b.widthIn} in boards with ${fmt(b.gapIn * 16, 0)}/16 in gaps · ${fmtInt(joists)} joists at ${sp} in o.c. · ${screws ? `${fmtInt(screws)} screws` : `${fmtInt(clips)} hidden clips`}`,
      },
      dock: `${fmtInt(boards)} boards`,
      stats: [
        { label: "Joists", value: fmtInt(joists), unit: `× ${String(v.joist).replace("x", "×")} × ${joistStock} ft`, hint: `Plus 2 rim joists of ${fmt(L, 1)} ft` },
        { label: "Joist span check", value: spanOk ? "OK" : "Too long", hint: `IRC max for ${String(v.joist).replace("x", "×")} at ${sp} in: ${formatFeetInches(span)}`, emphasis: !spanOk },
        { label: v.fast === "clip" ? "Hidden clips" : "Deck screws", value: fmtInt(screws || clips), hint: v.fast === "clip" ? "One per board at every joist" : "Two per board at every joist" },
        { label: "Joist hangers", value: fmtInt(joists), hint: "One per joist at the ledger" },
      ],
      notes: [
        ...(spanOk
          ? []
          : [{ tone: "warn" as const, text: `A ${fmt(D, 1)} ft span is over the ${formatFeetInches(span)} IRC limit for ${String(v.joist).replace("x", "×")} joists at ${sp} in. Go up a joist size, tighten the spacing, or add a mid-span beam.` }]),
        ...(tooWide ? [{ tone: "warn" as const, text: `${b.name} decking needs joists no more than ${b.maxSpacing} in apart (12 in for diagonal layouts). Switch the spacing to ${b.maxSpacing} in.` }] : []),
        { tone: "info", text: "Beams, posts and footings are sized separately: posts sit on footings below the frost line, and a deck attached to the house needs a ledger bolted through the rim joist with flashing above it." },
      ],
      shopping: [
        { id: "boards", name: `${b.name} decking ${stock} ft`, qty: boards, unit: "boards" },
        { id: "joists", name: `${String(v.joist).replace("x", "×")} joists ${joistStock} ft`, qty: joists, unit: "joists" },
        { id: "rims", name: `${String(v.joist).replace("x", "×")} rim/ledger stock`, qty: ceilQty((2 * L) / stock), unit: `× ${stock} ft` },
        { id: "hangers", name: `${String(v.joist).replace("x", "×")} joist hangers`, qty: joists, unit: "hangers" },
        ...(screws ? [{ id: "screws", name: "2-1/2 in deck screws", qty: screws, unit: "screws" }] : [{ id: "clips", name: "hidden deck clips", qty: clips, unit: "clips" }]),
      ],
      summary: `${boards} × ${stock}-ft deck boards, ${joists} joists for a ${fmt(L, 1)}×${fmt(D, 1)} ft deck`,
    };
  },
});
