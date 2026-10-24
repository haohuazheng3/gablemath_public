import { fmt, fmtInt } from "@/lib/format";
import { BULK_MATERIALS, BULK_OPTIONS, bulk } from "../materials";
import { defineTool } from "../types";

export const tonsToYards = defineTool({
  key: "measure/tons-to-cubic-yards",
  name: "Tons to Cubic Yards Converter",
  defaults: { dir: "t2y", qty: 10, mat: "57", custom: false, pcf: 100 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "dir",
          label: "Convert",
          options: [
            { value: "t2y", label: "Tons → cubic yards" },
            { value: "y2t", label: "Cubic yards → tons" },
          ],
        },
        { kind: "number", key: "qty", label: "Tons", suffix: "tons", step: 1, min: 0, decimals: 2, showIf: (v) => v.dir === "t2y", help: "US short tons (2,000 lb) — what quarries and yards in the US weigh by." },
        { kind: "number", key: "qty", label: "Cubic yards", suffix: "yd³", step: 1, min: 0, decimals: 2, showIf: (v) => v.dir === "y2t" },
        { kind: "select", key: "mat", label: "Material", options: BULK_OPTIONS, showIf: (v) => !v.custom },
        { kind: "toggle", key: "custom", label: "Use my supplier's weight", help: "Most yards print a weight per cubic foot or per yard on the ticket or website." },
        { kind: "number", key: "pcf", label: "Weight per cubic foot", suffix: "lb/ft³", step: 1, min: 10, max: 200, decimals: 1, showIf: (v) => !!v.custom },
      ],
    },
  ],
  compute(v) {
    const m = bulk(String(v.mat));
    const tpy = v.custom ? (Number(v.pcf) * 27) / 2000 : m.tonsPerYd;
    const name = v.custom ? "your material" : m.name.toLowerCase();
    const qty = Number(v.qty);
    const t2y = v.dir === "t2y";
    const yd = t2y ? qty / tpy : qty;
    const tons = t2y ? qty : qty * tpy;
    return {
      hero: t2y
        ? { label: `${fmt(qty, 2)} tons of ${name}`, value: fmt(yd, 2), unit: "cubic yards", sub: `${fmt(yd * 27, 1)} cu ft · ${fmt(yd * 0.764555, 2)} m³ · ${fmt(tpy, 2)} tons per yard` }
        : { label: `${fmt(qty, 2)} yd³ of ${name}`, value: fmt(tons, 2), unit: "tons", sub: `${fmtInt(tons * 2000)} lb · ${fmt(tons * 0.907185, 2)} metric tonnes · ${fmt(tpy, 2)} tons per yard` },
      dock: t2y ? `${fmt(yd, 2)} yd³` : `${fmt(tons, 2)} tons`,
      stats: [
        { label: "Tons per cubic yard", value: fmt(tpy, 2), hint: v.custom ? `${fmt(Number(v.pcf), 1)} lb/ft³ × 27 ÷ 2,000` : m.note },
        { label: "Cubic yards per ton", value: fmt(1 / tpy, 2) },
        { label: "Pounds", value: fmtInt(tons * 2000) },
        { label: "Covers at 2 in deep", value: fmtInt(yd * 162), unit: "sq ft", hint: "1 yd³ covers 162 sq ft at 2 in" },
      ],
      tables: [
        {
          title: "Every material at this quantity",
          caption: "Tons and cubic yards by material",
          columns: t2y ? ["Material", "t/yd³", `${fmt(qty, 2)} tons =`] : ["Material", "t/yd³", `${fmt(qty, 2)} yd³ =`],
          rows: BULK_MATERIALS.map((b) => [b.name, fmt(b.tonsPerYd, 2), t2y ? `${fmt(qty / b.tonsPerYd, 2)} yd³` : `${fmt(qty * b.tonsPerYd, 2)} t`]),
          highlight: v.custom ? undefined : BULK_MATERIALS.findIndex((b) => b.id === m.id),
          note: "Loose, as-delivered weights. Wet material weighs more, so a ton of damp sand or soil fills slightly less than the table shows.",
        },
      ],
      summary: t2y ? `${fmt(qty, 2)} tons of ${name} ≈ ${fmt(yd, 2)} cubic yards` : `${fmt(qty, 2)} cubic yards of ${name} ≈ ${fmt(tons, 2)} tons`,
    };
  },
});
