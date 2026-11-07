import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { defineTool } from "../types";

export const pitchFactor = (rise: number) => Math.sqrt(1 + (rise / 12) ** 2);

// Thickness guidance from APA span ratings (APA Engineered Wood Construction Guide, Form E30).
export const SHEATHING_ADVICE: Record<string, Record<number, string>> = {
  roof: { 16: "7/16 in OSB or 15/32 in plywood (span rating 24/16 or better)", 24: "7/16 in OSB rated 24/16 with panel clips, or 19/32 in for a stiffer deck" },
  wall: { 16: "7/16 in OSB or 15/32 in plywood (wall-24 rated)", 24: "7/16 in OSB or 15/32 in plywood rated 24/16" },
  floor: { 16: "19/32 in tongue-and-groove (Sturd-I-Floor 16 or 20 o.c.)", 24: "23/32 in tongue-and-groove (Sturd-I-Floor 24 o.c.)" },
};

export const plywood = defineTool({
  key: "lumber/plywood-calculator",
  name: "Plywood & Sheathing Calculator",
  unitToggle: true,
  defaults: { use: "roof", l: 40, w: 28, pitch: 6, oh: 1, gables: true, h: 8, doors: 2, windows: 8, sp: 24, waste: 10 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "use",
          label: "Sheathing for",
          columns: 3,
          options: [
            { value: "roof", label: "Roof" },
            { value: "wall", label: "Walls" },
            { value: "floor", label: "Floor / subfloor" },
          ],
        },
        { kind: "length", key: "l", label: "House length (along the ridge)", showIf: (v) => v.use === "roof" },
        { kind: "length", key: "w", label: "House width (eave to eave)", showIf: (v) => v.use === "roof" },
        {
          kind: "select",
          key: "pitch",
          label: "Roof pitch",
          showIf: (v) => v.use === "roof",
          options: [3, 4, 5, 6, 7, 8, 9, 10, 12].map((p) => ({ value: String(p), label: `${p}/12` })),
        },
        { kind: "length", key: "oh", label: "Overhang at eaves and rakes", showIf: (v) => v.use === "roof" },
        { kind: "length", key: "l", label: "Total wall length (perimeter)", showIf: (v) => v.use === "wall" },
        { kind: "length", key: "h", label: "Wall height", showIf: (v) => v.use === "wall" },
        { kind: "toggle", key: "gables", label: "Include the two gable triangles", showIf: (v) => v.use === "wall" },
        { kind: "length", key: "w", label: "House width (for the gables)", showIf: (v) => v.use === "wall" && !!v.gables },
        { kind: "number", key: "doors", label: "Doors", step: 1, min: 0, max: 20, decimals: 0, showIf: (v) => v.use === "wall" },
        { kind: "number", key: "windows", label: "Windows", step: 1, min: 0, max: 60, decimals: 0, showIf: (v) => v.use === "wall" },
        { kind: "length", key: "l", label: "Floor length", showIf: (v) => v.use === "floor" },
        { kind: "length", key: "w", label: "Floor width", showIf: (v) => v.use === "floor" },
        {
          kind: "segmented",
          key: "sp",
          label: "Rafter / stud / joist spacing",
          options: [
            { value: 16, label: "16 in o.c." },
            { value: 24, label: "24 in o.c." },
          ],
        },
        { kind: "number", key: "waste", label: "Add for waste", suffix: "%", step: 5, min: 0, max: 25, decimals: 0, help: "10% for a simple gable roof or box; 15% for hips, valleys and dormers." },
      ],
    },
  ],
  compute(v) {
    const use = String(v.use);
    const L = Number(v.l);
    const W = Number(v.w);
    const sp = Number(v.sp) === 16 ? 16 : 24;
    const rise = Number(v.pitch);
    const oh = Number(v.oh);
    let area = 0;
    let detail = "";
    if (use === "roof") {
      const plan = (L + 2 * oh) * (W + 2 * oh);
      area = plan * pitchFactor(rise);
      detail = `${fmtInt(plan)} sq ft footprint with overhangs × ${fmt(pitchFactor(rise), 3)} for a ${rise}/12 pitch`;
    } else if (use === "wall") {
      const gable = v.gables ? 2 * ((W / 2) * ((W / 2) * (rise / 12))) : 0;
      area = Math.max(0, L * Number(v.h) + gable - Number(v.doors) * 21 - Number(v.windows) * 15);
      detail = `${fmtInt(L * Number(v.h))} sq ft of wall${gable ? ` + ${fmtInt(gable)} sq ft of gables (${rise}/12)` : ""} − openings`;
    } else {
      area = L * W;
      detail = `${fmt(L, 1)} × ${fmt(W, 1)} ft`;
    }
    const sheets = ceilQty((area * (1 + Number(v.waste) / 100)) / 32);
    const clips = use === "roof" && sp === 24 ? sheets * 4 : 0;
    const supports = 96 / sp + 1;
    const nails = use === "floor" ? 0 : sheets * (2 * 9 + (supports - 2) * 5);
    return {
      hero: { label: "You need", value: fmtInt(sheets), unit: "4×8 sheets", sub: `${fmtInt(area)} sq ft to cover · ${detail} · + ${fmt(Number(v.waste))}% waste` },
      dock: `${fmtInt(sheets)} sheets`,
      stats: [
        { label: "Area", value: fmtInt(area), unit: "sq ft", hint: use === "roof" ? `${fmt(area / 100, 1)} roofing squares` : undefined },
        { label: "Thickness", value: use === "floor" ? (sp === 16 ? "19/32 in" : "23/32 in") : "7/16 in", hint: SHEATHING_ADVICE[use][sp] },
        ...(clips ? [{ label: "Panel clips (H-clips)", value: fmtInt(clips), hint: "One between each pair of rafters on the unsupported edge" }] : []),
        ...(nails ? [{ label: "8d nails", value: fmtInt(nails), hint: `6 in on panel ends, 12 in on intermediate ${use === "roof" ? "rafters" : "studs"} (IRC Table R602.3(1))` }] : []),
        ...(use === "floor" ? [{ label: "Subfloor adhesive", value: fmtInt(ceilQty(sheets / 2)), unit: "tubes (28 oz)", hint: "About one large tube per two sheets, glued and screwed" }] : []),
      ],
      tables:
        use === "roof"
          ? [
              {
                title: "Roof pitch multipliers",
                caption: "Roof area factor by pitch",
                columns: ["Pitch", "Multiplier", "Your roof"],
                rows: [3, 4, 5, 6, 7, 8, 9, 10, 12].map((p) => [`${p}/12`, fmt(pitchFactor(p), 3), `${fmtInt(ceilQty((((L + 2 * oh) * (W + 2 * oh) * pitchFactor(p)) * (1 + Number(v.waste) / 100)) / 32))} sheets`]),
                highlight: [3, 4, 5, 6, 7, 8, 9, 10, 12].indexOf(rise),
              },
            ]
          : undefined,
      shopping: [
        { id: "sheets", name: `${use === "floor" ? (sp === 16 ? "19/32" : "23/32") + " in T&G subfloor" : "7/16 in OSB sheathing"} 4×8`, qty: sheets, unit: "sheets" },
        ...(clips ? [{ id: "clips", name: "7/16 in panel clips", qty: clips, unit: "clips" }] : []),
      ],
      notes: [
        { tone: "tip", text: use === "roof" ? "Leave a 1/8 in gap at every panel edge and end so the deck can swell without buckling, and stagger the end joints by at least two rafters." : "Leave a 1/8 in gap at panel ends and edges unless the manufacturer says otherwise — swelling panels ripple the finish." },
      ],
      summary: `${sheets} sheets of 4×8 ${use} sheathing for ${fmtInt(area)} sq ft`,
    };
  },
});
