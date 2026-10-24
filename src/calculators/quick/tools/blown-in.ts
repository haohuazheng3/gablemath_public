import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { defineTool } from "../types";
import { ATTIC_R, ZONES } from "./insulation";

// Bag-label coverage charts.
// Fiberglass: Owens Corning AttiCat PINK Product Data Sheet, Pub. 10011273-L (May 2026), 27.5 lb bag.
// Cellulose: Greenfiber DIY Attic Installation Instructions DM-6.3-39 Rev A (05-26), 25 lb bag.
interface Row {
  r: number;
  bagsPer1000: number;
  sqftPerBag: number;
  installedIn: number;
}
export const BLOWN: Record<"fiberglass" | "cellulose", { name: string; bagLb: number; rows: Row[]; source: string }> = {
  fiberglass: {
    name: "Fiberglass (AttiCat-type)",
    bagLb: 27.5,
    source: "Owens Corning AttiCat data sheet, May 2026",
    rows: [
      { r: 13, bagsPer1000: 5.9, sqftPerBag: 169.8, installedIn: 5 },
      { r: 19, bagsPer1000: 9, sqftPerBag: 110.7, installedIn: 7 },
      { r: 22, bagsPer1000: 10.5, sqftPerBag: 94.8, installedIn: 8 },
      { r: 26, bagsPer1000: 12.6, sqftPerBag: 79.3, installedIn: 9.5 },
      { r: 30, bagsPer1000: 14.6, sqftPerBag: 68.5, installedIn: 10.75 },
      { r: 38, bagsPer1000: 19, sqftPerBag: 52.6, installedIn: 13.5 },
      { r: 44, bagsPer1000: 22.4, sqftPerBag: 44.6, installedIn: 15.5 },
      { r: 49, bagsPer1000: 25, sqftPerBag: 39.9, installedIn: 17 },
      { r: 60, bagsPer1000: 31.5, sqftPerBag: 31.8, installedIn: 20.5 },
    ],
  },
  cellulose: {
    name: "Cellulose (Greenfiber-type)",
    bagLb: 25,
    source: "Greenfiber DIY attic guide, May 2026",
    rows: [
      { r: 13, bagsPer1000: 15.2, sqftPerBag: 65.8, installedIn: 3.9 },
      { r: 19, bagsPer1000: 22.6, sqftPerBag: 44.2, installedIn: 5.7 },
      { r: 22, bagsPer1000: 26.3, sqftPerBag: 38, installedIn: 6.6 },
      { r: 30, bagsPer1000: 38.6, sqftPerBag: 25.9, installedIn: 8.9 },
      { r: 38, bagsPer1000: 52.6, sqftPerBag: 19, installedIn: 11.2 },
      { r: 44, bagsPer1000: 63.5, sqftPerBag: 15.7, installedIn: 12.9 },
      { r: 49, bagsPer1000: 70.8, sqftPerBag: 14.1, installedIn: 14.3 },
      { r: 60, bagsPer1000: 86, sqftPerBag: 11.6, installedIn: 17.3 },
    ],
  },
};

/** R-value per inch used to estimate what is already in the attic (from the same charts' settled depths). */
export const EXISTING_R_PER_IN: Record<string, number> = { none: 0, fiberglass: 2.5, batts: 3.1, cellulose: 3.5 };

/** Linear interpolation on a chart (extrapolates proportionally below the first row). */
export function chartAt(rows: Row[], r: number): { bagsPer1000: number; installedIn: number } {
  if (r <= 0) return { bagsPer1000: 0, installedIn: 0 };
  const first = rows[0];
  if (r <= first.r) return { bagsPer1000: (first.bagsPer1000 * r) / first.r, installedIn: (first.installedIn * r) / first.r };
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    if (r <= b.r) {
      const t = (r - a.r) / (b.r - a.r);
      return { bagsPer1000: a.bagsPer1000 + t * (b.bagsPer1000 - a.bagsPer1000), installedIn: a.installedIn + t * (b.installedIn - a.installedIn) };
    }
  }
  const last = rows[rows.length - 1];
  return { bagsPer1000: (last.bagsPer1000 * r) / last.r, installedIn: (last.installedIn * r) / last.r };
}

export const blownIn = defineTool({
  key: "walls/blown-in-insulation-calculator",
  name: "Blown-In Insulation Calculator",
  unitToggle: true,
  defaults: { mode: "dims", l: 30, w: 40, area: 1200, zone: "4A/4B", target: 0, mat: "fiberglass", exist: "fiberglass", depth: 4 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "mode",
          label: "Attic size",
          options: [
            { value: "dims", label: "Length × width" },
            { value: "area", label: "Square feet" },
          ],
        },
        { kind: "length", key: "l", label: "Attic length", showIf: (v) => v.mode === "dims" },
        { kind: "length", key: "w", label: "Attic width", showIf: (v) => v.mode === "dims" },
        { kind: "number", key: "area", label: "Attic floor area", suffix: "sq ft", step: 50, min: 0, decimals: 0, help: "Roughly the footprint of the heated rooms below — leave out a garage.", showIf: (v) => v.mode === "area" },
        {
          kind: "segmented",
          key: "mat",
          label: "Insulation",
          options: [
            { value: "fiberglass", label: "Fiberglass", sub: "27.5 lb bag" },
            { value: "cellulose", label: "Cellulose", sub: "25 lb bag" },
          ],
        },
        { kind: "select", key: "zone", label: "Climate zone", options: ZONES.map((z) => ({ value: z, label: `Zone ${z} — R-${ATTIC_R[z]}` })), help: "ENERGY STAR's recommended attic level for your zone." },
        {
          kind: "segmented",
          key: "target",
          label: "Target R-value",
          columns: 5,
          options: [
            { value: 0, label: "Zone" },
            { value: 30, label: "R-30" },
            { value: 38, label: "R-38" },
            { value: 49, label: "R-49" },
            { value: 60, label: "R-60" },
          ],
        },
      ],
    },
    {
      title: "What's already up there",
      fields: [
        {
          kind: "select",
          key: "exist",
          label: "Existing insulation",
          options: [
            { value: "none", label: "None / bare attic" },
            { value: "fiberglass", label: "Loose fiberglass (fluffy, pink/yellow/white)" },
            { value: "batts", label: "Fiberglass batts between joists" },
            { value: "cellulose", label: "Cellulose (gray, shredded paper)" },
          ],
        },
        { kind: "number", key: "depth", label: "Existing depth", suffix: "in", step: 1, min: 0, max: 24, decimals: 1, help: "Measure in a few spots with a ruler and use the typical depth.", showIf: (v) => v.exist !== "none" },
      ],
    },
  ],
  compute(v) {
    const area = v.mode === "dims" ? Number(v.l) * Number(v.w) : Number(v.area);
    const zone = String(v.zone);
    const target = Number(v.target) || ATTIC_R[zone];
    const mat = v.mat === "cellulose" ? "cellulose" : "fiberglass";
    const chart = BLOWN[mat];
    const existR = v.exist === "none" ? 0 : Math.round(Number(v.depth) * (EXISTING_R_PER_IN[String(v.exist)] ?? 0));
    const addR = Math.max(0, target - existR);
    const at = chartAt(chart.rows, addR);
    const bags = ceilQty((area / 1000) * at.bagsPer1000);
    const other = BLOWN[mat === "fiberglass" ? "cellulose" : "fiberglass"];
    const otherAt = chartAt(other.rows, addR);
    return {
      hero: addR
        ? {
            label: `Add R-${addR} to reach R-${target}`,
            value: fmtInt(bags),
            unit: `bags of ${mat}`,
            sub: `${fmtInt(area)} sq ft · blow to ${fmt(at.installedIn, 1)} in on top of what's there · ${fmtInt(bags * chart.bagLb)} lb of insulation`,
          }
        : { label: `Already at R-${existR}`, value: "0", unit: "bags", sub: `Your existing ${fmt(Number(v.depth), 1)} in already meets R-${target}. Seal air leaks instead.` },
      dock: `${fmtInt(bags)} bags`,
      stats: [
        { label: "Existing", value: `≈ R-${existR}`, hint: v.exist === "none" ? "Bare attic" : `${fmt(Number(v.depth), 1)} in × R-${EXISTING_R_PER_IN[String(v.exist)]}/in` },
        { label: "Installed depth", value: fmt(at.installedIn, 1), unit: "in", hint: "Initial depth before settling — mark rulers on trusses" },
        { label: "Bags per 1,000 sq ft", value: fmt(at.bagsPer1000, 1), hint: chart.source },
        { label: `Same job in ${other.name.split(" ")[0].toLowerCase()}`, value: fmtInt(ceilQty((area / 1000) * otherAt.bagsPer1000)), unit: "bags", hint: `${other.bagLb} lb bags, ${fmt(otherAt.installedIn, 1)} in deep` },
      ],
      tables: [
        {
          title: `${chart.name}: bag chart`,
          caption: "Coverage chart",
          columns: ["R-value", "Bags / 1,000 sq ft", "Sq ft per bag", "Installed depth", `Your ${fmtInt(area)} sq ft`],
          rows: chart.rows.map((r) => [`R-${r.r}`, fmt(r.bagsPer1000, 1), fmt(r.sqftPerBag, 1), `${fmt(r.installedIn, 1)} in`, `${ceilQty((area / 1000) * r.bagsPer1000)} bags`]),
          highlight: chart.rows.findIndex((r) => r.r === addR),
          note: "Manufacturers require both the minimum bag count and the minimum installed depth for the rated R-value — don't stretch bags to cover more.",
        },
      ],
      shopping: bags ? [{ id: "bags", name: `blown-in ${mat} insulation (${chart.bagLb} lb)`, qty: bags, unit: "bags" }] : [],
      notes: [
        { tone: "warn", text: "Keep insulation 3 in back from recessed lights that aren't IC-rated and from chimneys and flues, and install baffles so soffit vents stay open." },
        { tone: "tip", text: "Big-box stores lend the blowing machine free with a minimum bag purchase — ask at the rental desk before you buy fewer bags than their threshold." },
      ],
      summary: `${bags} bags of blown-in ${mat} to add R-${addR} over ${fmtInt(area)} sq ft (R-${target} total)`,
    };
  },
});
