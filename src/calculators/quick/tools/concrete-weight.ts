import { fmt, fmtInt } from "@/lib/format";
import { LB_PER_KG } from "@/lib/units";
import { defineTool } from "../types";

// Unit weights (lb/ft³). QUIKRETE Concrete Mix 1101 data sheet: 140 lb/ft³ cured; normal-weight
// concrete runs 140–150 lb/ft³; reinforced concrete is commonly taken as 150; structural
// lightweight concrete 90–115 (ACI 213R).
export const DENSITIES = [
  { id: "normal", label: "Normal concrete (145 lb/ft³)", pcf: 145 },
  { id: "bagged", label: "Bagged concrete mix, cured (140 lb/ft³)", pcf: 140 },
  { id: "reinforced", label: "Reinforced concrete (150 lb/ft³)", pcf: 150 },
  { id: "light", label: "Lightweight structural (115 lb/ft³)", pcf: 115 },
];

export const concreteWeight = defineTool({
  key: "concrete/concrete-weight-calculator",
  name: "Concrete Weight Calculator",
  unitToggle: true,
  defaults: { shape: "slab", l: 10, w: 10, t: 4, dia: 1, yd: 1, dens: "normal", custom: false, pcf: 145 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "shape",
          label: "Shape",
          columns: 3,
          options: [
            { value: "slab", label: "Slab / block" },
            { value: "cyl", label: "Cylinder" },
            { value: "yd", label: "Cubic yards" },
          ],
        },
        { kind: "length", key: "l", label: "Length", showIf: (v) => v.shape === "slab" },
        { kind: "length", key: "w", label: "Width", showIf: (v) => v.shape === "slab" },
        { kind: "length", key: "t", label: "Thickness", base: "in", showIf: (v) => v.shape === "slab" },
        { kind: "length", key: "dia", label: "Diameter", showIf: (v) => v.shape === "cyl" },
        { kind: "length", key: "l", label: "Height", showIf: (v) => v.shape === "cyl" },
        { kind: "number", key: "yd", label: "Volume", suffix: "yd³", step: 0.5, min: 0, decimals: 2, showIf: (v) => v.shape === "yd" },
        { kind: "select", key: "dens", label: "Concrete type", options: DENSITIES.map((d) => ({ value: d.id, label: d.label })), showIf: (v) => !v.custom },
        { kind: "toggle", key: "custom", label: "Enter my own unit weight" },
        { kind: "number", key: "pcf", label: "Unit weight", suffix: "lb/ft³", step: 1, min: 60, max: 300, decimals: 0, showIf: (v) => !!v.custom },
      ],
    },
  ],
  compute(v) {
    const pcf = v.custom ? Number(v.pcf) : (DENSITIES.find((d) => d.id === v.dens) ?? DENSITIES[0]).pcf;
    const cuft =
      v.shape === "yd" ? Number(v.yd) * 27 : v.shape === "cyl" ? Math.PI * (Number(v.dia) / 2) ** 2 * Number(v.l) : Number(v.l) * Number(v.w) * (Number(v.t) / 12);
    const lb = cuft * pcf;
    const perSqft = v.shape === "slab" ? (Number(v.t) / 12) * pcf : null;
    return {
      hero: { label: `${fmt(cuft, 2)} cu ft (${fmt(cuft / 27, 2)} yd³) at ${pcf} lb/ft³`, value: fmtInt(lb), unit: "lb", sub: `${fmt(lb / 2000, 2)} US tons · ${fmtInt(lb / LB_PER_KG)} kg · ${fmt(lb / LB_PER_KG / 1000, 2)} metric tonnes` },
      stats: [
        { label: "Per cubic yard", value: fmtInt(pcf * 27), unit: "lb", hint: `${fmt((pcf * 27) / 2000, 2)} tons` },
        { label: "Per cubic foot", value: fmtInt(pcf), unit: "lb" },
        ...(perSqft ? [{ label: "Per sq ft of slab", value: fmt(perSqft, 1), unit: "lb", hint: `at ${fmt(Number(v.t), 2)} in thick` }] : []),
        { label: "80 lb bags to make it", value: fmtInt(Math.ceil(cuft / 0.6 - 1e-9)), hint: "0.60 cu ft yield per 80 lb bag" },
      ],
      tables: [
        {
          title: "Slab weight by thickness",
          caption: "Concrete slab weight per square foot",
          columns: ["Thickness", "lb per sq ft", "10×10 ft slab", "Per cubic yard"],
          rows: [3.5, 4, 5, 6, 8].map((t) => [`${t} in`, fmt((t / 12) * pcf, 1), `${fmtInt((t / 12) * pcf * 100)} lb`, `${fmtInt(pcf * 27)} lb`]),
        },
      ],
      notes: [{ tone: "info", text: "Fresh concrete weighs about the same as cured — it loses only a little water as it hardens. Steel rebar adds roughly 1–3%, which is why reinforced concrete is usually taken as 150 lb/ft³." }],
      summary: `${fmt(cuft, 2)} cu ft of concrete ≈ ${fmtInt(lb)} lb (${fmt(lb / 2000, 2)} tons) at ${pcf} lb/ft³`,
    };
  },
});
