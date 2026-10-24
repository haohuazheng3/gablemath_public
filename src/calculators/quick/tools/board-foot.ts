import { fmt, fmtMoney } from "@/lib/format";
import { defineTool } from "../types";

/** Board feet = thickness (in) × width (in) × length (ft) ÷ 12 — one board foot is 144 cubic inches. */
export function boardFeet(tIn: number, wIn: number, lenFt: number): number {
  return (tIn * wIn * lenFt) / 12;
}

/** Doyle log rule: board feet = ((D − 4)² × L) ÷ 16, D = small-end diameter inside bark (in), L = log length (ft). */
export function doyle(diaIn: number, lenFt: number): number {
  return Math.max(0, ((diaIn - 4) ** 2 * lenFt) / 16);
}

/** International ¼-inch rule for a 4-ft section, summed over the log length. */
export function international(diaIn: number, lenFt: number): number {
  let total = 0;
  let d = diaIn;
  const sections = Math.floor(lenFt / 4);
  for (let i = 0; i < sections; i++) {
    total += 0.22 * d * d - 0.71 * d;
    d += 0.5;
  }
  const rest = lenFt - sections * 4;
  if (rest > 0) total += ((0.22 * d * d - 0.71 * d) * rest) / 4;
  return Math.max(0, total * 0.904762);
}

export const COMMON_SIZES: [string, number, number, number][] = [
  ["1×4×8", 1, 4, 8],
  ["1×6×8", 1, 6, 8],
  ["2×4×8", 2, 4, 8],
  ["2×4×10", 2, 4, 10],
  ["2×6×8", 2, 6, 8],
  ["2×8×8", 2, 8, 8],
  ["2×10×12", 2, 10, 12],
  ["4×4×8", 4, 4, 8],
  ["6×6×8", 6, 6, 8],
];

export const boardFoot = defineTool({
  key: "lumber/board-foot-calculator",
  name: "Board Foot Calculator",
  defaults: { mode: "board", t: 1, w: 6, len: 8, qty: 10, pmode: "bf", price: 0, dia: 16, loglen: 16 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "mode",
          label: "Measure",
          options: [
            { value: "board", label: "Boards" },
            { value: "log", label: "Logs" },
          ],
        },
        {
          kind: "select",
          key: "t",
          label: "Thickness",
          showIf: (v) => v.mode === "board",
          options: [
            { value: "0.75", label: "3/4 in (surfaced 1x)" },
            { value: "1", label: "1 in · 4/4 hardwood · nominal 1x" },
            { value: "1.25", label: "1-1/4 in · 5/4" },
            { value: "1.5", label: "1-1/2 in · 6/4" },
            { value: "2", label: "2 in · 8/4 · nominal 2x" },
            { value: "3", label: "3 in · 12/4" },
            { value: "4", label: "4 in · 16/4 · nominal 4x" },
            { value: "6", label: "6 in · nominal 6x" },
          ],
          help: "Lumber yards bill softwood by nominal size (a 2×4 is billed as 2 × 4) and hardwood by rough thickness in quarters.",
        },
        { kind: "number", key: "w", label: "Width", suffix: "in", step: 1, min: 0.5, max: 48, decimals: 2, showIf: (v) => v.mode === "board" },
        { kind: "number", key: "len", label: "Length", suffix: "ft", step: 1, min: 0.5, max: 40, decimals: 2, showIf: (v) => v.mode === "board" },
        { kind: "number", key: "qty", label: "Number of pieces", step: 1, min: 1, max: 9999, decimals: 0 },
        { kind: "number", key: "dia", label: "Small-end diameter (inside bark)", suffix: "in", step: 1, min: 6, max: 60, decimals: 0, showIf: (v) => v.mode === "log" },
        { kind: "number", key: "loglen", label: "Log length", suffix: "ft", step: 2, min: 4, max: 40, decimals: 0, showIf: (v) => v.mode === "log" },
      ],
    },
    {
      title: "Price",
      fields: [
        {
          kind: "segmented",
          key: "pmode",
          label: "Price is per",
          showIf: (v) => v.mode === "board",
          options: [
            { value: "bf", label: "Board foot" },
            { value: "lf", label: "Linear foot" },
            { value: "pc", label: "Piece" },
          ],
        },
        { kind: "number", key: "price", label: "Price (optional)", prefix: "$", step: 0.25, min: 0, decimals: 2, help: "Enter the yard's price to see the total and the same price in the other units." },
      ],
    },
  ],
  compute(v) {
    const qty = Number(v.qty);
    const price = Number(v.price);
    if (v.mode === "log") {
      const d = Number(v.dia);
      const L = Number(v.loglen);
      const each = doyle(d, L);
      const intl = international(d, L);
      return {
        hero: { label: `${qty} log${qty === 1 ? "" : "s"}, ${d} in × ${L} ft`, value: fmt(each * qty, 0), unit: "board feet (Doyle)", sub: `International ¼-in rule: ${fmt(intl * qty, 0)} bd ft — a sawmill with a thin kerf often gets close to this` },
        stats: [
          { label: "Doyle per log", value: fmt(each, 0), unit: "bd ft" },
          { label: "International ¼ per log", value: fmt(intl, 0), unit: "bd ft" },
          ...(price > 0 ? [{ label: "Value at your price", value: fmtMoney(each * qty * price), hint: `Doyle × ${fmtMoney(price, { cents: true })}/bd ft`, emphasis: true }] : []),
        ],
        notes: [{ tone: "info", text: "Doyle underestimates small logs and is still the default for hardwood log sales in much of the South and Midwest. Ask which rule a buyer uses before comparing offers." }],
        summary: `${qty} log(s) ${d} in × ${L} ft ≈ ${fmt(each * qty, 0)} board feet (Doyle)`,
      };
    }
    const t = Number(v.t);
    const w = Number(v.w);
    const len = Number(v.len);
    const each = boardFeet(t, w, len);
    const total = each * qty;
    const linear = len * qty;
    const pricePerBf = v.pmode === "bf" ? price : v.pmode === "lf" ? (price * linear) / total : (price * qty) / total;
    const cost = pricePerBf * total;
    return {
      hero: { label: `${qty} × ${fmt(t, 2)}" × ${fmt(w, 2)}" × ${fmt(len, 2)} ft`, value: fmt(total, 2), unit: "board feet", sub: `${fmt(each, 2)} bd ft per piece · ${fmt(linear, 1)} linear ft · ${fmt(total / 12, 2)} cu ft` },
      stats: [
        { label: "Per piece", value: fmt(each, 2), unit: "bd ft" },
        { label: "Linear feet", value: fmt(linear, 1) },
        ...(price > 0
          ? [
              { label: "Total cost", value: fmtMoney(cost), emphasis: true },
              { label: "Per board foot", value: fmtMoney(pricePerBf, { cents: true }), hint: `${fmtMoney((pricePerBf * total) / linear, { cents: true })}/linear ft · ${fmtMoney(cost / qty, { cents: true })}/piece` },
            ]
          : [{ label: "Cubic meters", value: fmt((total / 12) * 0.0283168, 3), unit: "m³" }]),
      ],
      tables: [
        {
          title: "Common sizes",
          caption: "Board feet for common lumber sizes",
          columns: ["Nominal size", "Board feet", ...(price > 0 && v.pmode === "bf" ? ["At your price"] : [])],
          rows: COMMON_SIZES.map(([n, a, b, c]) => [n, fmt(boardFeet(a, b, c), 2), ...(price > 0 && v.pmode === "bf" ? [fmtMoney(boardFeet(a, b, c) * price, { cents: true })] : [])]),
        },
      ],
      summary: `${qty} pieces ${fmt(t, 2)}×${fmt(w, 2)}×${fmt(len, 2)} ft = ${fmt(total, 2)} board feet${price > 0 ? `, ${fmtMoney(cost)}` : ""}`,
    };
  },
});
