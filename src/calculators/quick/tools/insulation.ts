import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { defineTool } from "../types";

// ENERGY STAR "Recommended Home Insulation R-Values" (based on 2021 IECC Table R402.1.3):
// attic floor for an uninsulated attic, and floors over unheated space.
export const ZONES = ["1", "2", "3", "4A/4B", "4C", "5", "6", "7", "8"] as const;
export const ATTIC_R: Record<string, number> = { "1": 30, "2": 49, "3": 49, "4A/4B": 60, "4C": 60, "5": 60, "6": 60, "7": 60, "8": 60 };
export const ATTIC_TOPUP_R: Record<string, number> = { "1": 25, "2": 38, "3": 38, "4A/4B": 49, "4C": 49, "5": 49, "6": 49, "7": 49, "8": 49 };
export const FLOOR_R: Record<string, number> = { "1": 13, "2": 13, "3": 19, "4A/4B": 19, "4C": 30, "5": 30, "6": 30, "7": 38, "8": 38 };

// Owens Corning EcoTouch batt sizes (Pub. 10019373) and typical kraft-faced 15×93 pack counts.
interface Batt {
  r: number;
  thickIn: string;
  w16: [number, number]; // width × length (in) for 16 in o.c.
  w24: [number, number];
  perBag16?: number;
}
export const BATTS: Record<number, Batt> = {
  13: { r: 13, thickIn: "3-1/2", w16: [15, 93], w24: [23, 93], perBag16: 11 },
  15: { r: 15, thickIn: "3-1/2", w16: [15, 93], w24: [23, 93], perBag16: 7 },
  19: { r: 19, thickIn: "6-1/4", w16: [15, 93], w24: [23, 93], perBag16: 8 },
  21: { r: 21, thickIn: "5-1/2", w16: [15, 93], w24: [23, 93], perBag16: 7 },
  30: { r: 30, thickIn: "9-1/2", w16: [16, 48], w24: [24, 48] },
  38: { r: 38, thickIn: "12-1/4", w16: [16, 48], w24: [24, 48] },
};

const CAVITY_SHARE: Record<number, number> = { 16: 14.5 / 16, 24: 22.5 / 24 };

export function layersFor(target: number): number[] {
  if (target <= 13) return [13];
  if (target <= 19) return [19];
  if (target <= 30) return [30];
  if (target <= 38) return [38];
  if (target <= 49) return [30, 19];
  return [30, 30];
}

export const insulation = defineTool({
  key: "walls/insulation-calculator",
  name: "Insulation Calculator",
  unitToggle: true,
  defaults: { where: "wall4", len: 120, h: 8, doors: 2, windows: 8, l: 30, w: 40, zone: "4A/4B", sp: 16, hi: false },
  sections: [
    {
      fields: [
        {
          kind: "select",
          key: "where",
          label: "What are you insulating?",
          options: [
            { value: "wall4", label: "Exterior walls — 2×4 studs" },
            { value: "wall6", label: "Exterior walls — 2×6 studs" },
            { value: "attic", label: "Attic floor (batts)" },
            { value: "floor", label: "Floor over a crawlspace or garage" },
          ],
        },
        { kind: "length", key: "len", label: "Total length of exterior walls", help: "Add up every outside wall you are insulating — the house perimeter for a whole-house job.", showIf: (v) => String(v.where).startsWith("wall") },
        { kind: "length", key: "h", label: "Wall height", showIf: (v) => String(v.where).startsWith("wall") },
        { kind: "number", key: "doors", label: "Exterior doors", step: 1, min: 0, max: 20, decimals: 0, showIf: (v) => String(v.where).startsWith("wall") },
        { kind: "number", key: "windows", label: "Windows", step: 1, min: 0, max: 60, decimals: 0, showIf: (v) => String(v.where).startsWith("wall") },
        { kind: "length", key: "l", label: "Length", showIf: (v) => !String(v.where).startsWith("wall") },
        { kind: "length", key: "w", label: "Width", showIf: (v) => !String(v.where).startsWith("wall") },
        {
          kind: "select",
          key: "zone",
          label: "Climate zone",
          options: ZONES.map((z) => ({ value: z, label: `Zone ${z}` })),
          help: "Zone 1–2: Florida, Gulf Coast, south Texas, Hawaii · 3: Southeast, Southwest deserts, coastal California · 4: Mid-Atlantic, lower Midwest, Pacific Northwest (4C) · 5–6: northern states · 7–8: northern Minnesota, Alaska.",
        },
        {
          kind: "segmented",
          key: "sp",
          label: "Stud / joist spacing",
          options: [
            { value: 16, label: "16 in on center" },
            { value: 24, label: "24 in on center" },
          ],
        },
        { kind: "toggle", key: "hi", label: "Use high-density batts", help: "R-15 in 2×4 walls or R-21 in 2×6 walls instead of R-13 / R-19.", showIf: (v) => String(v.where).startsWith("wall") },
      ],
    },
  ],
  compute(v) {
    const where = String(v.where);
    const isWall = where.startsWith("wall");
    const sp = Number(v.sp) === 24 ? 24 : 16;
    const zone = String(v.zone);
    const gross = isWall ? Math.max(0, Number(v.len) * Number(v.h) - Number(v.doors) * 21 - Number(v.windows) * 15) : Number(v.l) * Number(v.w);
    const target = where === "wall4" ? (v.hi ? 15 : 13) : where === "wall6" ? (v.hi ? 21 : 19) : where === "attic" ? ATTIC_R[zone] : FLOOR_R[zone];
    const layers = isWall ? [target] : layersFor(target);
    const rows = layers.map((r, i) => {
      const b = BATTS[r];
      const [bw, bl] = sp === 24 ? b.w24 : b.w16;
      const battSqft = (bw * bl) / 144;
      // first layer fits between framing; a second attic layer runs across the joists and covers everything
      const area = i === 0 ? gross * CAVITY_SHARE[sp] : gross;
      const batts = ceilQty((area * 1.05) / battSqft);
      const bags = sp === 16 && b.perBag16 && bl === 93 ? ceilQty(batts / b.perBag16) : null;
      return { r, b, bw, bl, area, batts, bags, cross: i > 0 };
    });
    const totalR = layers.reduce((s, r) => s + r, 0);
    const first = rows[0];
    return {
      hero: {
        label: `R-${totalR} ${isWall ? "wall cavity" : where === "attic" ? "attic floor" : "floor"}`,
        value: fmtInt(rows.reduce((s, r) => s + r.batts, 0)),
        unit: rows.length > 1 ? "batts in two layers" : `batts of R-${first.r}`,
        sub: `${fmtInt(gross)} sq ft${isWall ? " of wall after doors and windows" : ""} · ${first.bw} × ${first.bl} in batts, ${first.b.thickIn} in thick${first.bags ? ` · about ${fmtInt(first.bags)} bags` : ""}`,
      },
      dock: `${fmtInt(rows.reduce((s, r) => s + r.batts, 0))} batts`,
      stats: [
        { label: "Recommended", value: `R-${isWall ? target : where === "attic" ? ATTIC_R[zone] : FLOOR_R[zone]}`, hint: isWall ? "Limited by stud depth" : `ENERGY STAR, zone ${zone}`, emphasis: true },
        ...(where === "attic" ? [{ label: "If 3–4 in already there", value: `add R-${ATTIC_TOPUP_R[zone]}`, hint: "ENERGY STAR top-up level" }] : []),
        { label: "Area to fill", value: fmtInt(first.area), unit: "sq ft", hint: `${fmt(CAVITY_SHARE[sp] * 100, 0)}% of the surface sits between ${sp}-in framing` },
        ...(first.bags ? [{ label: "Bags", value: fmtInt(first.bags), hint: `${first.b.perBag16} batts per typical 15×93 kraft pack — check the label` }] : []),
      ],
      tables: [
        {
          title: "Your batts",
          caption: "Batt layers",
          columns: ["Layer", "Batt size", "Batts", "Covers"],
          rows: rows.map((r) => [`R-${r.r}${r.cross ? " (across joists, unfaced)" : ""}`, `${r.bw} × ${r.bl} in`, fmtInt(r.batts), `${fmtInt(r.area)} sq ft`]),
          note: "Batt counts include 5% for trimming around wiring, boxes and short bays.",
        },
      ],
      notes: [
        isWall
          ? { tone: "tip", text: "In walls the facing goes toward the heated side in cold climates. Split batts around wiring instead of compressing them — a squashed batt loses R-value." }
          : where === "attic"
            ? { tone: "tip", text: `Blown-in insulation usually beats batts in an existing attic — it fills around joists and wiring with no gaps. Compare with the blown-in calculator before you buy R-${target} in batts.` }
            : { tone: "tip", text: "Under a floor, hold batts tight to the subfloor with wire supports every 16–24 in, facing up toward the heated room." },
      ],
      shopping: rows.map((r) => ({ id: `r${r.r}-${r.cross ? "x" : "a"}`, name: `R-${r.r} batts ${r.bw}×${r.bl} in${r.cross ? " unfaced" : ""}`, qty: r.batts, unit: "batts" })),
      summary: `R-${totalR}: ${rows.map((r) => `${r.batts} × R-${r.r} batts`).join(" + ")} for ${fmtInt(gross)} sq ft`,
    };
  },
});
