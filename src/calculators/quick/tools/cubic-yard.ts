import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { CUFT_PER_CUM } from "@/lib/units";
import { BULK_OPTIONS, bulk } from "../materials";
import { defineTool } from "../types";

export const cubicYard = defineTool({
  key: "measure/cubic-yard-calculator",
  name: "Cubic Yard Calculator",
  unitToggle: true,
  defaults: { shape: "rect", l: 10, w: 10, d: 4, mat: "topsoil", extra: 5 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "shape",
          label: "Shape",
          columns: 3,
          options: [
            { value: "rect", label: "Rectangle" },
            { value: "circle", label: "Circle" },
            { value: "cuft", label: "I know cu ft" },
          ],
        },
        { kind: "length", key: "l", label: "Length", showIf: (v) => v.shape === "rect" },
        { kind: "length", key: "w", label: "Width", showIf: (v) => v.shape === "rect" },
        { kind: "length", key: "l", label: "Diameter", showIf: (v) => v.shape === "circle" },
        { kind: "length", key: "d", label: "Depth", base: "in", help: "Mulch 2–3 in, topsoil for new lawn 4–6 in, gravel driveway 4–8 in, concrete slab 4 in.", showIf: (v) => v.shape !== "cuft" },
        { kind: "number", key: "l", label: "Volume", suffix: "cu ft", step: 1, min: 0, decimals: 1, showIf: (v) => v.shape === "cuft" },
        { kind: "select", key: "mat", label: "Material (for weight)", options: BULK_OPTIONS },
        { kind: "number", key: "extra", label: "Add for settling & grade", suffix: "%", step: 5, min: 0, max: 30, decimals: 0, help: "5–10% covers uneven ground and settling. Use 0 for an exact volume." },
      ],
    },
  ],
  compute(v) {
    const depthFt = Number(v.d) / 12;
    const cuft =
      v.shape === "cuft" ? Number(v.l) : v.shape === "circle" ? Math.PI * (Number(v.l) / 2) ** 2 * depthFt : Number(v.l) * Number(v.w) * depthFt;
    const exact = cuft / 27;
    const yd = exact * (1 + Number(v.extra) / 100);
    const m = bulk(String(v.mat));
    const tons = yd * m.tonsPerYd;
    const half = Math.ceil(yd * 4 - 1e-9) / 4;
    const bags2 = ceilQty((yd * 27) / 2);
    const bagsHalf = ceilQty((yd * 27) / 0.5);
    return {
      hero: {
        label: "Order",
        value: fmt(yd, 2),
        unit: "cubic yards",
        sub: `${fmt(exact, 2)} yd³ exact${Number(v.extra) ? ` + ${fmt(Number(v.extra))}%` : ""} · ${fmt(cuft, 1)} cu ft · ${fmt(cuft / CUFT_PER_CUM, 2)} m³ · about ${fmt(tons, 2)} tons of ${m.name.toLowerCase()}`,
      },
      dock: `${fmt(yd, 2)} yd³`,
      stats: [
        { label: "Round up to", value: fmt(half, 2), unit: "yd³", hint: "Most yards sell in ¼ or ½ yard steps" },
        { label: "Weight", value: fmt(tons, 2), unit: "tons", hint: `${fmtInt(tons * 2000)} lb at ${fmt(m.tonsPerYd, 2)} t/yd³` },
        { label: "2 cu ft bags", value: fmtInt(bags2), hint: "Bagged mulch and soil" },
        { label: "0.5 cu ft bags", value: fmtInt(bagsHalf), hint: "Bagged stone and sand (~50 lb)" },
      ],
      notes: [
        yd > 3
          ? { tone: "tip", text: `At ${fmt(yd, 1)} yd³, bulk delivery almost always beats bags — that would be ${fmtInt(bags2)} two-cubic-foot bags to carry.` }
          : { tone: "tip", text: "Under about 2–3 yards, bags can win once you add the delivery fee — compare both before you order." },
      ],
      summary: `${fmt(yd, 2)} cubic yards (${fmt(cuft, 0)} cu ft), about ${fmt(tons, 1)} tons of ${m.name.toLowerCase()}`,
    };
  },
});
