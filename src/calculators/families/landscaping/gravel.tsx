import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeGravel, coveragePerTon, type GravelResult } from "./compute";
import { AGGREGATES, DEFAULT_DELIVERY, DEFAULT_PAYLOAD_LB, GRAVEL_USES, LANDSCAPING_CHECKED, SOURCES, STONE_BAG_CUFT, TRUCK, aggregate, type GravelId } from "./data";
import { tonsText } from "./display";
import GravelCalculator from "./GravelCalculator";
import { GRAVEL_DEFAULTS, gravelInputFrom, materialPatch, projectPatch, type GravelValues } from "./gravel-model";

const SLUG = "gravel-calculator";
const BASE = `/landscaping/${SLUG}`;

/* ───────── programmatic presets ───────── */

type Spec = { slug: string; group: string; label: string; h1: string; title: string; values: Partial<GravelValues>; note: string };

const area = (l: number, w: number) => ({ shape: "rect", l1: l, w1: w });
const single = (use: string, m: GravelId, d: number) => ({ ...projectPatch(use), layers: 1, ...materialPatch(1, m), d1: d, c1: !!aggregate(m).compaction && use !== "cover" && use !== "play" });

const SPECS: Spec[] = [
  {
    slug: "10x20-driveway-4-inch",
    group: "Driveways",
    label: "10×20 driveway, 4 in",
    h1: "How much gravel for a 10×20 driveway, 4 inches deep?",
    title: "Gravel for a 10x20 Driveway (4 in): Tons & Yards",
    values: { ...area(10, 20), ...single("drive", "crusher", 4) },
    note: "10×20 is a single parking pad or a short apron off the street — 4 in of compacted crusher run suits a firm, well-drained subgrade.",
  },
  {
    slug: "12x50-driveway-4-inch",
    group: "Driveways",
    label: "12×50 driveway, 4 in",
    h1: "How many tons of gravel for a 12×50 driveway at 4 inches?",
    title: "Tons of Gravel for a 12x50 Driveway at 4 Inches",
    values: { ...area(12, 50), ...single("drive", "crusher", 4) },
    note: "12 ft is a comfortable single-lane width; 50 ft reaches a garage set back from the street.",
  },
  {
    slug: "10x50-driveway",
    group: "Driveways",
    label: "10×50 new driveway (2 layers)",
    h1: "How much gravel for a new 10×50 driveway?",
    title: "Gravel for a New 10x50 Driveway: Base + Top Layer",
    values: { ...area(10, 50), ...projectPatch("drive") },
    note: "A 10 ft lane is the narrow end for cars; build it on woven fabric so the base stone doesn't push into soft soil.",
  },
  {
    slug: "12x100-driveway",
    group: "Driveways",
    label: "12×100 new driveway (2 layers)",
    h1: "How much gravel for a 100-foot driveway, 12 feet wide?",
    title: "Gravel for a 100 ft Driveway (12 ft Wide): Tons",
    values: { ...area(12, 100), ...projectPatch("drive") },
    note: "A 100 ft run is a full truck-and-a-half job: order both stones from one yard and stage deliveries so the base can be compacted first.",
  },
  {
    slug: "12x50-driveway-top-up",
    group: "Driveways",
    label: "12×50 driveway top-up, 2 in",
    h1: "How much gravel to top up a 12×50 driveway?",
    title: "Gravel to Resurface a 12x50 Driveway (2 in Top-Up)",
    values: { ...area(12, 50), ...projectPatch("refresh") },
    note: "Fill potholes first, then spread the top-up and roll or tamp it so traffic doesn't scatter it.",
  },
  {
    slug: "10x10-patio-base",
    group: "Patios, pads & sheds",
    label: "10×10 patio base, 4 in",
    h1: "How much gravel for a 10×10 patio base?",
    title: "Gravel for a 10x10 Patio Base (4 in Compacted)",
    values: { ...area(10, 10), ...single("pad", "crusher", 4) },
    note: "A 10×10 patio seats two chairs and a small table; extend the base 6 in past each edge (an 11×11 ft footprint).",
  },
  {
    slug: "10x12-shed-base",
    group: "Patios, pads & sheds",
    label: "10×12 shed base, 4 in",
    h1: "How much gravel for a 10×12 shed base?",
    title: "Gravel for a 10x12 Shed Base: Tons, Yards & Bags",
    values: { ...area(10, 12), ...single("pad", "crusher", 4) },
    note: "10×12 is the most common shed footprint; frame the pad with treated timbers so the stone stays put.",
  },
  {
    slug: "12x24-pad-4-inch",
    group: "Patios, pads & sheds",
    label: "12×24 pad, 4 in",
    h1: "How much gravel for a 12×24 pad, 4 inches deep?",
    title: "Gravel for a 12x24 Pad at 4 Inches: Tons & Cost",
    values: { ...area(12, 24), ...single("pad", "crusher", 4) },
    note: "12×24 fits a large garage-style shed, a camper pad or a one-car parking spot.",
  },
  {
    slug: "20x20-4-inch",
    group: "Patios, pads & sheds",
    label: "20×20 area, 4 in #57",
    h1: "How much gravel for a 20×20 area?",
    title: "How Much Gravel for a 20x20 Area (4 in of #57)",
    values: { ...area(20, 20), ...single("cover", "57", 4) },
    note: "400 sq ft at 4 in is the classic two-car parking area or a large drainage bed.",
  },
  {
    slug: "pea-gravel-10x10-2-inch",
    group: "Pea gravel & decorative rock",
    label: "Pea gravel, 10×10 at 2 in",
    h1: "How much pea gravel for a 10×10 area?",
    title: "Pea Gravel for a 10x10 Area: Bags, Tons & Cost",
    values: { ...area(10, 10), ...single("cover", "pea", 2) },
    note: "At 2 in pea gravel covers fabric in a garden bed; for a seating area most people go to 3 in.",
  },
  {
    slug: "pea-gravel-12x12-3-inch",
    group: "Pea gravel & decorative rock",
    label: "Pea gravel patio, 12×12 at 3 in",
    h1: "How much pea gravel for a 12×12 patio, 3 inches deep?",
    title: "Pea Gravel for a 12x12 Patio (3 in): Bags & Tons",
    values: { ...area(12, 12), ...single("cover", "pea", 3) },
    note: "A pea gravel patio needs firm edging all round, and a compacted base underneath if chairs will sink.",
  },
  {
    slug: "pea-gravel-play-area-10x10",
    group: "Pea gravel & decorative rock",
    label: "Pea gravel play area, 10×10",
    h1: "How much pea gravel for a 10×10 play area?",
    title: "Pea Gravel for a 10x10 Play Area (CPSC 12 in Fill)",
    values: { ...area(10, 10), ...single("play", "pea", 12) },
    note: "CPSC rates 9 in of pea gravel for falls up to 5 ft — fine for low play sets, not for tall towers.",
  },
  {
    slug: "river-rock-100-sq-ft",
    group: "Pea gravel & decorative rock",
    label: "River rock, 100 sq ft at 3 in",
    h1: "How much river rock for 100 square feet?",
    title: "River Rock for 100 Square Feet: Tons & Cost",
    values: { shape: "sqft", a1: 100, ...single("cover", "river", 3) },
    note: "River rock of 1–3 in needs about 3 in to cover the fabric without gaps.",
  },
  {
    slug: "dg-10x20-patio-3-inch",
    group: "Pea gravel & decorative rock",
    label: "DG patio, 10×20 at 3 in",
    h1: "How much decomposed granite for a 10×20 patio?",
    title: "Decomposed Granite for a 10x20 Patio (3 in)",
    values: { ...area(10, 20), ...single("path", "dg", 3), c1: true },
    note: "DG patios are compacted in thin lifts and lightly wetted; 3 in sits mid-range of the 2–4 in Roseville lists.",
  },
];

const PER_YARD: { id: GravelId; slug: string; h1: string; title: string }[] = [
  { id: "57", slug: "57-stone-per-cubic-yard", h1: "How many tons of #57 stone are in a cubic yard?", title: "Tons of #57 Stone per Cubic Yard (Weight Chart)" },
  { id: "crusher", slug: "crusher-run-per-cubic-yard", h1: "How much does a yard of crusher run weigh?", title: "How Much Does a Yard of Crusher Run Weigh?" },
  { id: "pea", slug: "pea-gravel-per-cubic-yard", h1: "How many tons of pea gravel are in a cubic yard?", title: "Tons of Pea Gravel per Cubic Yard" },
  { id: "river", slug: "river-rock-per-cubic-yard", h1: "How much does a yard of river rock weigh?", title: "How Much Does a Yard of River Rock Weigh?" },
  { id: "concrete", slug: "crushed-concrete-per-cubic-yard", h1: "How much does a yard of crushed concrete weigh?", title: "Crushed Concrete Weight per Cubic Yard" },
  { id: "screenings", slug: "screenings-per-cubic-yard", h1: "How many tons of limestone screenings are in a yard?", title: "Limestone Screenings: Tons per Cubic Yard" },
  { id: "dg", slug: "decomposed-granite-per-cubic-yard", h1: "How much does a yard of decomposed granite weigh?", title: "Decomposed Granite Weight per Cubic Yard" },
];

const NOTES = new Map(SPECS.map((s) => [s.slug, s.note]));
const NOUN: Record<string, string> = { drive: "driveway", pad: "pad", play: "play area", path: "area", cover: "area" };

function compute(v: GravelValues): GravelResult {
  return computeGravel(gravelInputFrom(v));
}

export const GRAVEL_PRESETS: Preset<GravelValues>[] = [
  ...SPECS.map((s) => {
    const values: GravelValues = { ...GRAVEL_DEFAULTS, ...s.values };
    const r = compute(values);
    const parts = r.layers.map((l) => `${tonsText(l.tons, false)} of ${aggregate(l.layer.material).short}`).join(" + ");
    return {
      slug: s.slug,
      values,
      group: s.group,
      label: s.label,
      h1: s.h1,
      metaTitle: s.title,
      metaDescription: `${s.label}: ${fmt(r.layers.reduce((x, l) => x + l.q.cuydFinished, 0), 2)} cu yd in place — order ${parts} with 10% extra. Bags, bulk cost and truck loads.`,
    };
  }),
  ...PER_YARD.map((p) => {
    const m = aggregate(p.id);
    const values: GravelValues = { ...GRAVEL_DEFAULTS, ...projectPatch("cover"), ...materialPatch(1, p.id), shape: "vol", vol: 1, vu: "yd" };
    return {
      slug: p.slug,
      values,
      group: "Weight per cubic yard",
      label: `${m.short[0].toUpperCase()}${m.short.slice(1)} per cubic yard`,
      h1: p.h1,
      metaTitle: p.title,
      metaDescription: `A cubic yard of ${m.short} weighs about ${fmt(m.tonsPerYd)} tons (${fmtInt(m.tonsPerYd * 2000)} lb) loose; published factors run ${fmt(m.range[0])}–${fmt(m.range[1])} t. Coverage per ton and bags per yard.`,
    };
  }),
];

function perYardAnswer(v: GravelValues): PresetAnswer {
  const m = aggregate(v.m1);
  const den = m.tonsPerYd;
  const lbPerBag = (den * 2000 * STONE_BAG_CUFT) / 27;
  const tonsPerSingleAxle = TRUCK.singleAxleTons / den;
  const compacted = m.compaction ? den * m.compaction : undefined;
  const perYd = m.sellBy === "ton" ? m.price * den : m.price;
  return {
    headline: `A cubic yard of ${m.short} weighs about ${fmt(den)} tons (${fmtInt(den * 2000)} lb) loose, as it comes off the truck — published factors run ${fmt(m.range[0])}–${fmt(m.range[1])} tons.`,
    bullets: [
      `Where the number comes from: ${m.densityNote}.`,
      `One ton is ${fmt(1 / den, 2)} cu yd (${fmt(27 / den, 1)} cu ft) and covers about ${fmtInt(coveragePerTon(2, den))} sq ft at 2 in, ${fmtInt(coveragePerTon(3, den))} at 3 in or ${fmtInt(coveragePerTon(4, den))} at 4 in.`,
      `In bags: 54 bags of 0.5 cu ft make a cubic yard; each weighs about ${fmtInt(lbPerBag)} lb.`,
      compacted
        ? `Compacted in place it is heavier: about ${fmt(compacted, 2)} tons per cubic yard, because you need ${fmt(m.compaction ?? 1)} yd³ of loose ${m.short} for every compacted yard.`
        : `${m.short[0].toUpperCase()}${m.short.slice(1)} is clean stone — it settles slightly but does not compact by volume like base gravel.`,
      `A single-axle dump truck (about ${TRUCK.singleAxleTons} tons) carries roughly ${fmt(tonsPerSingleAxle, 1)} cu yd; a tandem (up to ${TRUCK.tandemTons} tons) about ${fmt(TRUCK.tandemTons / den, 1)} cu yd.`,
      `Price check: ${m.priceNote}. At the default ${m.sellBy === "ton" ? `${fmtMoney(m.price)}/ton that is about ${fmtMoney(perYd)} per cubic yard` : `${fmtMoney(m.price)}/yd³ that is about ${fmtMoney(m.price / den)} per ton`}.`,
    ],
    table: {
      caption: `${m.name}: coverage of one cubic yard and one ton`,
      columns: ["Depth", "Sq ft per cu yd", "Sq ft per ton", "Tons per 100 sq ft"],
      rows: [1, 2, 3, 4, 6].map((d) => [`${d} in`, fmtInt(324 / d), fmtInt(coveragePerTon(d, den)), fmt((100 * d * den) / 324, 2)]),
    },
    notes: [
      `Weight converts yards to tons: tons = cubic yards × ${fmt(den)}. A cubic yard is 27 cubic feet; spread 1 in deep it covers 324 sq ft, so coverage at any depth is 324 ÷ inches, and per ton it is 324 ÷ (inches × ${fmt(den)}).`,
      `Quarry tables disagree because stone type, gradation and moisture change the weight, and because some list compacted rather than loose weights — Martin Marietta's "base" figures (1.90–1.95 t) are compacted-in-place values. If your yard prints a factor on its ticket or website, enter it in the calculator; it beats any average.`,
      m.bestFor,
    ],
  };
}

function areaAnswer(v: GravelValues): PresetAnswer {
  const r = compute(v);
  const layers = r.layers;
  const main = layers[0];
  const m = aggregate(main.layer.material);
  const dims = v.shape === "sqft" ? `${fmtInt(v.a1)} sq ft` : `${fmt(v.l1)}×${fmt(v.w1)} ft`;
  const key = JSON.stringify(v);
  const slug = GRAVEL_PRESETS.find((p) => JSON.stringify(p.values) === key)?.slug;
  const note = slug ? NOTES.get(slug) : undefined;
  const totalBulk = layers.reduce((s, l) => s + (l.buy.bulkDelivered ?? 0), 0);
  const trips = Math.ceil(r.totalWeightLb / DEFAULT_PAYLOAD_LB);
  const truckText = (l: GravelResult["layers"][number]) => `${l.truck.loads} ${l.truck.truck} load${l.truck.loads > 1 ? "s" : ""}`;

  if (layers.length > 1) {
    const [top, base] = layers;
    const mt = aggregate(top.layer.material);
    const mb = aggregate(base.layer.material);
    return {
      headline: `A new ${dims} ${v.use === "drive" ? "driveway" : "walkway"} built as ${fmt(base.layer.depthIn)} in of ${mb.short} under ${fmt(top.layer.depthIn)} in of compacted ${mt.short} takes about ${fmt(r.totalTons, 1)} tons of stone: ${fmt(base.tons, 1)} t of ${mb.short} and ${fmt(top.tons, 1)} t of ${mt.short}, with 10% extra.`,
      bullets: [
        `Base: ${fmtInt(r.areaSqFt)} sq ft × ${fmt(base.layer.depthIn)} in = ${fmt(base.q.cuydFinished, 2)} cu yd; with 10% extra order ${fmt(base.q.cuydOrder, 2)} cu yd ≈ ${fmt(base.tons, 1)} tons of ${mb.short}.`,
        `Top: ${fmt(top.q.cuydFinished, 2)} cu yd compacted needs ${fmt(top.q.cuydOrder, 2)} cu yd loose (${fmt(top.factor)}× for compaction, plus 10%) ≈ ${fmt(top.tons, 1)} tons of ${mt.short}. Spread about ${fmt(top.looseDepthIn, 1)} in and compact in ${top.lifts} lifts.`,
        `Trucks: ${truckText(base)} of ${mb.short} and ${truckText(top)} of ${mt.short} — separate stones travel as separate loads.`,
        `Bulk cost at the default prices: about ${fmtMoney(totalBulk)} delivered (${fmtMoney(base.buy.bulkDelivered ?? 0)} + ${fmtMoney(top.buy.bulkDelivered ?? 0)}, $${DEFAULT_DELIVERY} per load).`,
        `Lay ${fmtInt(r.areaSqFt)} sq ft of woven geotextile first, and crown the finished surface 1/2–3/4 in per foot (Penn State).`,
        ...(note ? [note] : []),
      ],
      table: {
        caption: `Layer by layer for a ${dims} ${v.use === "drive" ? "driveway" : "walkway"}`,
        columns: ["Layer", "Depth", "Order (cu yd)", "Tons", "0.5 cu ft bags", "Bulk delivered"],
        rows: [base, top].map((l) => [
          aggregate(l.layer.material).short,
          `${fmt(l.layer.depthIn)} in${l.factor > 1 ? " compacted" : ""}`,
          fmt(l.q.cuydOrder, 2),
          fmt(l.tons, 1),
          fmtInt(l.buy.bags),
          fmtMoney(l.buy.bulkDelivered ?? 0),
        ]),
      },
      notes: [
        `The base layer of clean ${mb.short} drains and spreads the load; the top layer of ${mt.short} has fines that lock together under compaction into a hard driving surface. Penn State's road specification places 8 in loose to finish at 6 in, which is where the ${fmt(top.factor)}× compaction factor comes from.`,
        `At ${tonsText(r.totalTons, false)} this job ${r.totalTons > TRUCK.tandemTons ? "needs more than one tandem load" : r.totalTons > TRUCK.singleAxleTons ? "fits on tandem trucks rather than a single-axle" : "is small enough for single-axle loads"}; ask the yard to dump the base stone first, then return with the crusher run once the base is spread and rolled.`,
      ],
    };
  }

  const compacted = main.factor > 1;
  const depths = [2, 3, 4, 6].includes(main.layer.depthIn) ? [2, 3, 4, 6] : [2, 3, 4, 6, main.layer.depthIn].sort((a, b) => a - b);
  const breakEvenTons = main.buy.breakEvenYd != null ? main.buy.breakEvenYd * main.layer.tonsPerYd : undefined;
  return {
    headline: `${v.use === "refresh" ? `Topping up a ${dims} driveway with ${fmt(main.layer.depthIn)} in of ${m.short}` : `A ${dims} ${NOUN[v.use] ?? "area"} at ${fmt(main.layer.depthIn)} in${compacted ? " compacted" : ""}`} needs ${fmt(main.q.cuydFinished, 2)} cubic yards in place — order about ${tonsText(main.tons, false)} of ${m.short} (${fmt(main.q.cuydOrder, 2)} cu yd loose) including 10% extra${compacted ? " and compaction" : ""}.`,
    bullets: [
      `Volume: ${fmtInt(r.areaSqFt)} sq ft × ${fmt(main.layer.depthIn)} in ÷ 12 = ${fmt(main.q.cuftFinished, 1)} cu ft = ${fmt(main.q.cuydFinished, 2)} cu yd.`,
      ...(compacted
        ? [`Compaction: ${m.short} goes down loose about ${fmt(main.looseDepthIn, 1)} in deep and tamps to ${fmt(main.layer.depthIn)} in, so order ${fmt(main.factor)}× the volume; compact in ${main.lifts === 1 ? "a single lift" : `${main.lifts} lifts`} of no more than 3 in.`]
        : []),
      `Weight: at ${fmt(main.layer.tonsPerYd)} t per loose cu yd that is ${tonsText(main.tons, false)}; quarry factors for ${m.short} put it anywhere from ${fmt(main.tonsLow, 1)} to ${fmt(main.tonsHigh, 1)} tons.`,
      `Bags: ${fmtInt(main.buy.bags)} bags of 0.5 cu ft${main.buy.bagCost != null ? ` (about ${fmtMoney(main.buy.bagCost)})` : ""} versus about ${fmtMoney(main.buy.bulkDelivered ?? 0)} for bulk delivered.`,
      `Hauling: ${truckText(main)} from the yard, or ${trips} trips in a half-ton pickup (${fmtInt(DEFAULT_PAYLOAD_LB)} lb payload) — a yard of stone weighs ${fmtInt(main.layer.tonsPerYd * 2000)} lb.`,
      ...(note ? [note] : []),
    ],
    table: {
      caption: `${dims} of ${m.short} at other depths`,
      columns: ["Depth", "Order (cu yd)", "Tons", "0.5 cu ft bags", "Bulk delivered"],
      rows: depths.map((d) => {
        const x = compute({ ...v, d1: d });
        const l = x.layers[0];
        return [`${fmt(d)} in${compacted ? " compacted" : ""}`, fmt(l.q.cuydOrder, 2), fmt(l.tons, 1), fmtInt(l.buy.bags), fmtMoney(l.buy.bulkDelivered ?? 0)];
      }),
    },
    notes: [
      `${fmtInt(r.areaSqFt)} sq ft × ${fmt(main.layer.depthIn / 12, 3)} ft = ${fmt(main.q.cuftFinished, 1)} cu ft, ÷ 27 = ${fmt(main.q.cuydFinished, 2)} cu yd.${compacted ? ` × ${fmt(main.factor)} for compaction` : ""} × 1.10 extra = ${fmt(main.q.cuydOrder, 2)} cu yd, × ${fmt(main.layer.tonsPerYd)} t/yd³ = ${fmt(main.tons, 2)} tons.`,
      breakEvenTons != null
        ? `With bags at ${fmtMoney(main.layer.bagPrice)} and bulk at ${fmtMoney(main.layer.price)} per ${main.layer.unit === "yd" ? "cu yd" : "ton"} plus $${DEFAULT_DELIVERY} delivery, bulk beats bags from about ${fmt(breakEvenTons, 2)} tons. At ${tonsText(main.tons, false)} ${main.tons > breakEvenTons ? "bulk is clearly the cheaper way to buy — bags only make sense if a truck can't reach the spot" : "bags are competitive, and they save you a delivery appointment"}.`
        : `There is no dated bag price for ${m.short}, so only bulk is priced here — add a bag price in the calculator if your store stocks it. ${main.tons <= TRUCK.singleAxleTons ? "At this size one single-axle load covers it; ask the yard about its delivery minimum." : "Plan on a tandem load."}`,
    ],
  };
}

function presetAnswer(v: GravelValues): PresetAnswer {
  return v.shape === "vol" ? perYardAnswer(v) : areaAnswer(v);
}

/* ───────── long-form guide ───────── */

function Content() {
  const ex = compute({ ...GRAVEL_DEFAULTS, ...area(20, 20), ...single("cover", "57", 4), extra: 0 });
  const exL = ex.layers[0];
  const pad = compute({ ...GRAVEL_DEFAULTS, ...area(10, 12), ...single("pad", "crusher", 4) }).layers[0];
  return (
    <>
      <h2>How to calculate gravel</h2>
      <p>
        Gravel is sold by volume (cubic yards) or by weight (tons), so every job starts with <strong>length × width × depth</strong>. Measure in
        feet, divide the depth in inches by 12, multiply, and divide the cubic feet by 27 for cubic yards. Multiply cubic yards by the
        material&apos;s weight per yard to get tons.
      </p>
      <p>
        <strong>Worked example — a 20 × 20 ft area, 4 in of #57 stone:</strong> 400 sq ft × (4 ÷ 12) = {fmt(exL.q.cuftFinished, 1)} cu ft ÷ 27 ={" "}
        {fmt(exL.q.cuydFinished, 2)} cu yd. At 1.35 tons per cubic yard that is <strong>{fmt(exL.tons, 1)} tons</strong>; order about{" "}
        {fmt(exL.tons * 1.1, 1)} tons with the 10% extra most yards&apos; own calculators add.
      </p>

      <h2>How much does a cubic yard of gravel weigh?</h2>
      <p>
        Weights below are <em>loose</em>, as delivered — the right basis for ordering. Defaults come from scale weights at a Georgia landscape yard
        (Mulch Pros) cross-checked against Martin Marietta&apos;s and Vulcan&apos;s quarry calculators; the range shows how much published factors
        disagree for the same product.
      </p>
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Tons per cu yd</th>
            <th>Published range</th>
            <th>1 ton covers at 2 in</th>
          </tr>
        </thead>
        <tbody>
          {AGGREGATES.map((a) => {
            const slug = PER_YARD.find((p) => p.id === a.id)?.slug;
            return (
              <tr key={a.id}>
                <td>{slug ? <Link href={`${BASE}/${slug}`}>{a.name}</Link> : a.name}</td>
                <td>{fmt(a.tonsPerYd)}</td>
                <td>
                  {fmt(a.range[0])}–{fmt(a.range[1])}
                </td>
                <td>{fmtInt(coveragePerTon(2, a.tonsPerYd))} sq ft</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Loose vs. compacted: why base gravel needs more</h2>
      <p>
        Crusher run, crushed concrete, screenings and decomposed granite contain fines that pack down when you run a plate compactor over them.
        Penn State&apos;s Center for Dirt &amp; Gravel Roads places 8 in of driving-surface aggregate loose to finish at 6 in — a factor of 1.33. So
        if a shed pad needs 4 in <em>compacted</em>, you spread about 5.3 in loose and order a third more. For a 10 × 12 ft pad that is about{" "}
        {fmt(pad.tons, 1)} tons of crusher run, not the {fmt(pad.q.cuydFinished * 1.45 * 1.1, 1)} tons a simple volume calculator gives. Clean
        stone such as #57 and pea gravel has no fines and barely compacts, so it is ordered at its finished depth.
      </p>
      <p>
        The opposite mistake also happens: quarry &quot;base&quot; weights such as Martin Marietta&apos;s 1.90 tons per cubic yard are compacted-in-place
        figures. Using them for loose decorative gravel over-orders by roughly 30%.
      </p>

      <h2>How deep should gravel be?</h2>
      <ul>
        {GRAVEL_USES.map((u) => (
          <li key={u.id}>
            <strong>{u.label}:</strong> {u.note}
          </li>
        ))}
      </ul>
      <p>Compact base layers in lifts no thicker than 3 in (Unilock), and extend any base at least 6 in past the edge of what sits on it (Quikrete).</p>

      <h2>Bulk or bags?</h2>
      <p>
        A cubic yard is 54 bags of 0.5 cu ft (about 50 lb each). At big-box prices of roughly $5.50–$7 a bag that is $300–$375 per yard of stone,
        while bulk #57 runs about $35–$55 a ton and crusher run $24–$34 a ton at the quarry (American Rock Supply, 2026), plus a delivery fee —
        typically a flat $60–$125 within about 10 miles. Bags make sense for a few square feet or where a truck can&apos;t reach; for anything over
        about half a ton, bulk is usually cheaper even after delivery. The calculator shows the break-even for your prices.
      </p>

      <h2>Getting it home</h2>
      <p>
        A cubic yard of stone weighs 2,600–2,900 lb on Mulch Pros&apos; scale — more than the nominal 1,000 lb payload of a half-ton pickup. Check the
        Tire &amp; Loading sticker on your door jamb before loading. Yards send up to about {TRUCK.singleAxleTons} tons on a single-axle dump truck
        and up to {TRUCK.tandemTons} tons on a tandem. Make sure the truck has room to dump: Roseville Rock Supply asks for 10 ft of width, 14 ft of
        height clearance and firm, level ground.
      </p>

      <h2>Same stone, different names</h2>
      <p>
        Dense-graded base is called crusher run, crush &amp; run, #411, 304, DGA, ABC, GAB, CA-6, 21A, 2A, flex base or Class 2 AB depending on the
        state — ask for the base or road stone your yard sells for driveways. Clean stone is sold by size number: #57 is about 3/4 in, #8 and
        #89 are smaller.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Ordering base gravel at its finished depth and running short once it is compacted.</li>
        <li>Using one weight for every stone — published factors run from 1.21 to 2.16 tons per cubic yard depending on product and whether it is loose or compacted.</li>
        <li>Skipping fabric under driveways and paths, so the stone slowly sinks into the soil.</li>
        <li>Spreading decorative gravel thinner than 2 in, which shows the fabric and lets weeds through.</li>
        <li>Overloading a pickup: one yard of gravel can be three times a half-ton&apos;s rated payload.</li>
      </ul>
      <p>
        Laying pavers? The <Link href="/landscaping/paver-base-calculator">paver base calculator</Link> adds bedding sand and edge restraint.
        Pouring a slab on the base? Use the <Link href="/concrete/slab-calculator">concrete slab calculator</Link>. For sandboxes and paver sand see
        the <Link href="/landscaping/sand-calculator">sand calculator</Link>, and for beds the <Link href="/landscaping/mulch-calculator">mulch calculator</Link>.
        Driveway sizes: <Link href={`${BASE}/12x50-driveway-4-inch`}>12×50 at 4 in</Link>, <Link href={`${BASE}/10x50-driveway`}>new 10×50 driveway</Link>,{" "}
        <Link href={`${BASE}/12x100-driveway`}>100 ft driveway</Link>.
      </p>
    </>
  );
}

export const gravelCalculator: CalculatorEntry<GravelValues> = {
  meta: {
    slug: SLUG,
    category: "landscaping",
    name: "Gravel Calculator",
    shortName: "Gravel & stone",
    h1: "Gravel Calculator",
    metaTitle: "Gravel Calculator: Tons, Cubic Yards & Bags (2026)",
    metaDescription:
      "How many tons, cubic yards or bags of gravel you need — pea gravel, #57, crusher run and more, with quarry weights (#57 = 1.35 t/yd³), compaction and cost.",
    summary:
      "Pick the project and stone, enter the size, and get tons, cubic yards and bags — with compaction for base layers, layered driveways, bulk-vs-bag cost and truck trips.",
    outputs: ["Tons & cubic yards", "0.5 cu ft bags", "Bulk vs bags", "Truck & pickup trips"],
    faq: [
      {
        q: "How many tons of gravel are in a cubic yard?",
        a: "About 1.3–1.45 tons loose for most gravels: #57 stone 1.35, pea gravel 1.4, crusher run 1.45 (Mulch Pros scale weights of 2,600–2,900 lb per yard). Compacted base weighs about 1.9 tons per cubic yard in place.",
      },
      {
        q: "How much gravel do I need for a 20x20 area?",
        a: "At 4 inches, 400 sq ft × 4/12 = 133 cu ft = 4.94 cubic yards, or about 6.7 tons of #57 stone. Order about 7.3 tons with 10% extra.",
      },
      {
        q: "How much area does a ton of gravel cover?",
        a: "For #57 stone (1.35 t/yd³), one ton covers about 120 sq ft at 2 inches, 80 sq ft at 3 inches and 60 sq ft at 4 inches. Heavier stone covers a little less.",
      },
      {
        q: "How many bags of gravel make a cubic yard?",
        a: "54 bags of 0.5 cubic feet (about 50 lb each). At $5.50–$7 a bag that is $300–$375 per yard, several times the bulk price, so bags only pay off for small patches.",
      },
      {
        q: "How deep should a gravel driveway be?",
        a: "A typical new driveway is about 4 inches of #57 base stone under 4 inches of compacted crusher run, on woven fabric. Penn State's spec for the driving surface is 8 inches loose compacted to 6 inches. A worn driveway usually needs about a 2-inch top-up.",
      },
      {
        q: "Why do I need more crusher run than the volume I measured?",
        a: "Crusher run compacts. Penn State places 8 inches loose to finish at 6 inches, so you order about 1.33 times the compacted volume, plus about 10% for waste.",
      },
      {
        q: "Can my pickup truck carry a yard of gravel?",
        a: "Usually not in one trip. A yard of stone weighs 2,600–2,900 lb, while a half-ton pickup is rated around 1,000 lb nominal. Check the payload on your door-jamb sticker and plan two or three trips per yard.",
      },
    ],
    sources: [
      SOURCES.mulchProsWeights,
      SOURCES.martinMarietta,
      SOURCES.vulcan,
      SOURCES.pennState,
      SOURCES.americanRock,
      SOURCES.mulchProsPrices,
      SOURCES.rosevilleCalc,
      SOURCES.rosevillePrices,
      SOURCES.stoneCenter,
      SOURCES.nebraskaDot,
      SOURCES.thePricer,
      SOURCES.kokosing,
      SOURCES.quikretePatio,
      SOURCES.unilock,
      SOURCES.cpsc325,
    ],
    related: ["landscaping/paver-base-calculator", "concrete/slab-calculator", "landscaping/sand-calculator", "landscaping/mulch-calculator", "measure/tons-to-cubic-yards", "measure/cubic-yard-calculator", "landscaping/pea-gravel-calculator", "landscaping/river-rock-calculator", "landscaping/asphalt-calculator"],
    updated: LANDSCAPING_CHECKED,
    keywords: ["gravel calculator", "crusher run", "#57 stone", "pea gravel", "river rock", "tons per yard", "driveway gravel", "road base", "decomposed granite"],
    featured: true,
  },
  Calculator: GravelCalculator,
  Content,
  presets: GRAVEL_PRESETS,
  presetAnswer,
};
