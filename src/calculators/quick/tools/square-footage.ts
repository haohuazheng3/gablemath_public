import { fmt, fmtMoney } from "@/lib/format";
import { SQFT_PER_SQM } from "@/lib/units";
import { defineTool } from "../types";

const SQFT_PER_ACRE = 43560;

export function shapeArea(shape: string, a: number, b: number, c: number, d: number): number {
  switch (shape) {
    case "circle":
      return Math.PI * (a / 2) ** 2;
    case "triangle":
      return (a * b) / 2;
    case "lshape":
      return a * b + c * d;
    default:
      return a * b;
  }
}

export const squareFootage = defineTool({
  key: "measure/square-footage-calculator",
  name: "Square Footage Calculator",
  unitToggle: true,
  defaults: { shape: "rect", l: 12, w: 12, l2: 6, w2: 8, extra: false, el: 10, ew: 10, waste: 0, price: 0 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "shape",
          label: "Shape",
          columns: 4,
          options: [
            { value: "rect", label: "Rectangle" },
            { value: "lshape", label: "L-shape" },
            { value: "circle", label: "Circle" },
            { value: "triangle", label: "Triangle" },
          ],
        },
        { kind: "length", key: "l", label: "Length", help: "Type feet and inches any way you like: 12'6\", 12 ft 6 in or 12.5.", showIf: (v) => v.shape === "rect" || v.shape === "lshape" },
        { kind: "length", key: "w", label: "Width", showIf: (v) => v.shape === "rect" || v.shape === "lshape" },
        { kind: "length", key: "l2", label: "Second leg length", help: "Split the L into two rectangles that don't overlap.", showIf: (v) => v.shape === "lshape" },
        { kind: "length", key: "w2", label: "Second leg width", showIf: (v) => v.shape === "lshape" },
        { kind: "length", key: "l", label: "Diameter", showIf: (v) => v.shape === "circle" },
        { kind: "length", key: "l", label: "Base", showIf: (v) => v.shape === "triangle" },
        { kind: "length", key: "w", label: "Height (square to the base)", showIf: (v) => v.shape === "triangle" },
        { kind: "toggle", key: "extra", label: "Add another rectangle", help: "A closet, hallway or second room to include in the total." },
        { kind: "length", key: "el", label: "Extra area length", showIf: (v) => !!v.extra },
        { kind: "length", key: "ew", label: "Extra area width", showIf: (v) => !!v.extra },
      ],
    },
    {
      title: "Waste & price",
      more: true,
      fields: [
        { kind: "number", key: "waste", label: "Add for waste", suffix: "%", step: 5, min: 0, max: 30, decimals: 0, help: "Flooring and tile need 5–15% extra for cuts. Leave at 0 for a plain measurement." },
        { kind: "number", key: "price", label: "Price per square foot (optional)", prefix: "$", step: 0.25, min: 0, decimals: 2 },
      ],
    },
  ],
  compute(v) {
    const main = shapeArea(String(v.shape), Number(v.l), Number(v.w), Number(v.l2), Number(v.w2));
    const extra = v.extra ? Number(v.el) * Number(v.ew) : 0;
    const area = main + extra;
    const waste = Number(v.waste) / 100;
    const order = area * (1 + waste);
    const price = Number(v.price);
    const sqm = area / SQFT_PER_SQM;
    return {
      hero: {
        label: "Area",
        value: fmt(area, 1),
        unit: "sq ft",
        sub: `${fmt(area / 9, 2)} sq yd · ${fmt(sqm, 2)} m²${waste ? ` · order ${fmt(order, 0)} sq ft with ${fmt(waste * 100)}% waste` : ""}`,
      },
      stats: [
        { label: "Square yards", value: fmt(area / 9, 2), hint: "Carpet and sod are priced this way" },
        { label: "Square meters", value: fmt(sqm, 2) },
        { label: "Acres", value: fmt(area / SQFT_PER_ACRE, 4), hint: "1 acre = 43,560 sq ft" },
        ...(price > 0
          ? [{ label: "Cost", value: fmtMoney(order * price), hint: `${fmt(order, 0)} sq ft × ${fmtMoney(price, { cents: true })}`, emphasis: true }]
          : [{ label: "Squares (roofing/siding)", value: fmt(area / 100, 2), hint: "1 square = 100 sq ft" }]),
      ],
      tables: extra
        ? [
            {
              caption: "Area breakdown",
              columns: ["Part", "Square feet"],
              rows: [
                ["Main shape", fmt(main, 1)],
                ["Extra rectangle", fmt(extra, 1)],
                ["Total", fmt(area, 1)],
              ],
            },
          ]
        : undefined,
      summary: `${fmt(area, 1)} sq ft (${fmt(area / 9, 2)} sq yd)`,
    };
  },
});
