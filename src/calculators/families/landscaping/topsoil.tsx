import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { bagsFor, computeSoil, type SoilResult } from "./compute";
import { LANDSCAPING_CHECKED, SOIL_TYPES, SOURCES, TRUCK } from "./data";
import { article, tonsText } from "./display";
import TopsoilCalculator from "./TopsoilCalculator";
import { TOPSOIL_DEFAULTS, modePatch, soilBagPrice, soilUsePatch, topsoilInputFrom, type TopsoilValues } from "./topsoil-model";

const SLUG = "topsoil-calculator";
const BASE = `/landscaping/${SLUG}`;

const run = (v: TopsoilValues): SoilResult => computeSoil(topsoilInputFrom(v));
const bagsAt = (r: SoilResult, size: number) => r.bagsBySize.find((b) => b.size === size)?.bags ?? 0;
const bedValues = (l: number, w: number, h: number): TopsoilValues => ({ ...TOPSOIL_DEFAULTS, ...modePatch("beds"), bl: l, bw: w, bh: h });
const lawnValues = (sqft: number, d: number): TopsoilValues => ({ ...TOPSOIL_DEFAULTS, ...soilUsePatch("lawn", 1), shape: "sqft", a1: sqft, d });

/* ───────── programmatic presets ───────── */

const BED_NOTES: Record<string, string> = {
  "4x8": "4×8 is the classic raised bed: 4 ft wide lets you reach the middle from either side, and 8 ft boards need no cutting.",
  "4x4": "4×4 suits square-foot grids and small patios; two 8 ft boards cut in half make one course of the frame.",
  "3x6": "A 3 ft width is easy to reach across from one side — handy for kids or a bed against a fence.",
  "2x8": "A 2 ft wide bed fits along a fence or a walk where you can only reach from one side.",
  "4x12": "4×12 uses 12 ft boards; long sides tend to bow under the soil's weight, so add a cross brace at the middle.",
};

/** Nominal lumber stacks to a little less than the nominal height (a 2×6 is 5½ in, a 2×12 is 11¼ in). */
const ACTUAL_FILL_IN: Record<number, { inches: number; boards: string }> = {
  12: { inches: 11, boards: "two 2×6 boards (5½ in each) or one 2×12 (11¼ in)" },
  18: { inches: 16.5, boards: "three 2×6 boards (5½ in each)" },
};

type Spec = { slug: string; group: string; label: string; h1: string; title: string; values: TopsoilValues };

const SPECS: Spec[] = [
  ...[
    [4, 8, 12],
    [4, 8, 18],
    [4, 4, 12],
    [3, 6, 18],
    [2, 8, 12],
    [4, 12, 12],
  ].map(([l, w, h]) => ({
    slug: `${l}x${w}-raised-bed-${h}-inch`,
    group: "Raised beds",
    label: `${l}×${w} raised bed, ${h} in deep`,
    h1: `How much soil for a ${l}×${w} raised bed, ${h} inches deep?`,
    title: `Soil for a ${l}x${w} Raised Bed (${h} in): Bags & Cu Ft`,
    values: bedValues(l, w, h),
  })),
  {
    slug: "new-lawn-1000-sq-ft-4-inch",
    group: "Lawns & yards",
    label: "New lawn, 1,000 sq ft at 4 in",
    h1: "How much topsoil for 1,000 sq ft of new lawn, 4 inches deep?",
    title: "Topsoil for 1,000 Sq Ft of New Lawn (4 in)",
    values: lawnValues(1000, 4),
  },
  {
    slug: "new-lawn-500-sq-ft-6-inch",
    group: "Lawns & yards",
    label: "New lawn, 500 sq ft at 6 in",
    h1: "How much topsoil for 500 sq ft, 6 inches deep?",
    title: "Topsoil for 500 Sq Ft at 6 Inches: Yards & Tons",
    values: lawnValues(500, 6),
  },
];

export const TOPSOIL_PRESETS: Preset<TopsoilValues>[] = SPECS.map((s) => {
  const r = run(s.values);
  const beds = s.values.mode === "beds";
  return {
    slug: s.slug,
    values: s.values,
    group: s.group,
    label: s.label,
    h1: s.h1,
    metaTitle: s.title,
    metaDescription: beds
      ? `A ${s.values.bl}×${s.values.bw} bed ${s.values.bh} in deep holds ${fmt(r.q.cuftFinished, 1)} cu ft of soil: ${fmtInt(bagsAt(r, 1.5))} bags of 1.5 cu ft or ${fmtInt(bagsAt(r, 1))} of 1 cu ft with settling. Mix and cost.`
      : `${s.label}: ${fmt(r.q.cuydFinished, 2)} cu yd, about ${fmt(r.q.cuydOrder, 1)} cu yd (${tonsText(r.tons, false)}) to order with settling. Bulk vs bags and truck loads.`,
  };
});

function bedAnswer(v: TopsoilValues): PresetAnswer {
  const r = run(v);
  const key = `${v.bl}x${v.bw}`;
  const b1 = bagsAt(r, 1);
  const b15 = bagsAt(r, 1.5);
  const b2 = bagsAt(r, 2);
  const split = r.blendSplit;
  const diyTop = split ? bagsFor(split.topsoilCuft, 1) : 0;
  const diyCompost = split ? bagsFor(split.compostCuft, 1.5) : 0;
  const diyCost = diyTop * (soilBagPrice("topsoil", 1).price ?? 0) + diyCompost * (soilBagPrice("compost", 1.5).price ?? 0);
  const fill = ACTUAL_FILL_IN[v.bh];
  const actual = fill ? run({ ...v, bh: fill.inches }) : undefined;
  return {
    headline: `A ${v.bl}×${v.bw} ft raised bed ${v.bh} in deep holds ${fmt(r.q.cuftFinished, 1)} cu ft of soil (${fmt(r.q.cuydFinished, 2)} cu yd). With 10% for settling, buy ${fmt(r.q.cuftOrder, 1)} cu ft — ${fmtInt(b15)} bags of 1.5 cu ft, ${fmtInt(b1)} of 1 cu ft or ${fmtInt(b2)} of 2 cu ft.`,
    bullets: [
      `Volume: ${v.bl} ft × ${v.bw} ft × ${fmt(v.bh / 12, 2)} ft = ${fmt(r.q.cuftFinished, 1)} cu ft; × 1.10 for settling = ${fmt(r.q.cuftOrder, 1)} cu ft.`,
      `Mix it 50/50 yourself: ${fmtInt(diyTop)} × 1 cu ft bags of topsoil plus ${fmtInt(diyCompost)} × 1.5 cu ft bags of compost — about ${fmtMoney(diyCost)} at Mulch Pros' October 2026 bag prices.`,
      `Or bulk: ${fmt(r.q.cuydOrder, 2)} cu yd of premixed soil–compost blend is about ${fmtMoney(r.buy.bulkDelivered ?? 0)} delivered ($48/yd + $75) — ${(r.buy.bulkDelivered ?? Infinity) < diyCost ? "cheaper than bags, if you can take a whole load" : "more than bags at this size, because the delivery fee dominates"}.`,
      `Filled, the bed holds roughly ${fmtInt(r.weightLb)} lb of soil (estimate; wet soil weighs more).`,
      ...(BED_NOTES[key] ? [BED_NOTES[key]] : []),
    ],
    table: {
      caption: `${v.bl}×${v.bw} ft beds, ${v.bh} in deep, with 10% for settling`,
      columns: ["Beds", "Cu ft", "1 cu ft bags", "1.5 cu ft bags", "2 cu ft bags", "Bulk cu yd"],
      rows: [1, 2, 3, 4].map((n) => {
        const x = run({ ...v, beds: n });
        return [String(n), fmt(x.q.cuftOrder, 1), fmtInt(bagsAt(x, 1)), fmtInt(bagsAt(x, 1.5)), fmtInt(bagsAt(x, 2)), fmt(x.q.cuydOrder, 2)];
      }),
    },
    notes: [
      `${v.bl} × ${v.bw} = ${v.bl * v.bw} sq ft of bed. At ${v.bh} in (${fmt(v.bh / 12, 2)} ft) deep that is ${fmt(r.q.cuftFinished, 1)} cu ft. Divide by the bag size — ${fmt(r.q.cuftOrder, 1)} ÷ 1.5 = ${fmt(r.q.cuftOrder / 1.5, 1)}, rounded up to ${fmtInt(b15)} bags — or by 27 for cubic yards.`,
      fill && actual
        ? `Measure inside the frame: ${fill.boards} make a wall about ${fmt(fill.inches)} in tall, so ${article(v.bh)} "${v.bh} in" bed usually holds ${fmt(fill.inches)} in of soil — ${fmt(actual.q.cuftOrder, 1)} cu ft with settling, ${fmtInt(r.bags - actual.bags)} fewer 1.5 cu ft ${r.bags - actual.bags === 1 ? "bag" : "bags"} than the nominal height suggests.`
        : "",
    ].filter(Boolean),
  };
}

function lawnAnswer(v: TopsoilValues): PresetAnswer {
  const r = run(v);
  const loads = r.truck.loads;
  return {
    headline: `${fmtInt(r.areaSqFt)} sq ft of topsoil ${fmt(v.d)} in deep is ${fmt(r.q.cuydFinished, 2)} cu yd — order about ${fmt(r.q.cuydOrder, 1)} cu yd (${tonsText(r.tons, false)}) with 10% for settling.`,
    bullets: [
      `Volume: ${fmtInt(r.areaSqFt)} sq ft × ${fmt(v.d)} in ÷ 12 = ${fmt(r.q.cuftFinished, 0)} cu ft ÷ 27 = ${fmt(r.q.cuydFinished, 2)} cu yd.`,
      `Weight: screened topsoil runs 2,000–2,200 lb per yard dry (Roseville Rock Supply), so about ${tonsText(r.tons, false)} — ${loads} ${r.truck.truck} load${loads > 1 ? "s" : ""}.`,
      `Cost: about ${fmtMoney(r.buy.bulkDelivered ?? 0)} delivered at $42.45/yd (screened topsoil runs $32.95–$51.95) versus ${fmtMoney(r.buy.bagCost ?? 0)} for ${fmtInt(r.bags)} bags of 1 cu ft.`,
      `Depth: Roseville recommends 4–6 in of topsoil under new lawn; ${v.d >= 6 ? "6 in is the top of that range, worth it over poor subsoil" : "4 in is the bottom of that range"}.`,
      `Hauling it yourself would take ${fmtInt(r.pickupTrips)} trips in a half-ton pickup — this is a delivery job.`,
    ],
    table: {
      caption: `${fmtInt(r.areaSqFt)} sq ft of topsoil at other depths (10% for settling)`,
      columns: ["Depth", "Cu yd", "Tons", "Truck", "Bulk delivered"],
      rows: [2, 3, 4, 6].map((d) => {
        const x = run({ ...v, d });
        return [`${d} in`, fmt(x.q.cuydOrder, 1), fmt(x.tons, 1), `${x.truck.loads} ${x.truck.truck}`, fmtMoney(x.buy.bulkDelivered ?? 0)];
      }),
    },
    notes: [
      `${fmtInt(r.areaSqFt)} × ${fmt(v.d / 12, 3)} ft = ${fmt(r.q.cuftFinished, 0)} cu ft = ${fmt(r.q.cuydFinished, 2)} cu yd; × 1.10 for settling = ${fmt(r.q.cuydOrder, 2)} cu yd; × 1.1 t/yd³ = ${fmt(r.tons, 1)} tons.`,
      `At ${tonsText(r.tons, false)} the order ${r.tons > TRUCK.singleAxleTons ? `is over a single-axle truck's ~${TRUCK.singleAxleTons} tons, so expect a tandem and ask whether the yard charges more for it` : "fits on one single-axle truck"}. Have it dumped as close to the work as the ground allows — a cubic yard is a lot of wheelbarrow trips.`,
    ],
  };
}

function presetAnswer(v: TopsoilValues): PresetAnswer {
  return v.mode === "beds" ? bedAnswer(v) : lawnAnswer(v);
}

/* ───────── long-form guide ───────── */

function Content() {
  const lawn = run(lawnValues(1000, 4));
  const bed = run(bedValues(4, 8, 12));
  const breakEven = run(lawnValues(100, 4)).buy.breakEvenYd ?? 0;
  return (
    <>
      <h2>How to calculate topsoil</h2>
      <p>
        Multiply the area in square feet by the depth in inches and divide by 12 for cubic feet; divide by 27 for cubic yards, the unit bulk soil
        is sold in. Then add an allowance for settling: loose soil slumps after the first good soaking, and Roseville Rock Supply suggests ordering
        5–10% extra.
      </p>
      <p>
        <strong>Worked example — 1,000 sq ft of new lawn at 4 in:</strong> 1,000 × 4 ÷ 12 = 333 cu ft ÷ 27 = {fmt(lawn.q.cuydFinished, 2)} cu yd. With 10%
        for settling, order {fmt(lawn.q.cuydOrder, 1)} cu yd — about {tonsText(lawn.tons, false)} of screened topsoil at 2,000–2,200 lb a yard.
      </p>

      <h2>Raised beds</h2>
      <p>
        A raised bed is a box: inside length × inside width × soil depth. A 4×8 ft bed 12 in deep holds {fmt(bed.q.cuftFinished)} cu ft; with 10% for
        settling that is {fmt(bed.q.cuftOrder, 1)} cu ft — {fmtInt(bagsAt(bed, 1.5))} bags of 1.5 cu ft or {fmtInt(bagsAt(bed, 1))} bags of 1 cu ft. Measure
        inside the boards: lumber is smaller than its name, so a frame of two 2×6s stands 11 in, not 12. Popular sizes:{" "}
        <Link href={`${BASE}/4x8-raised-bed-12-inch`}>4×8×12</Link>, <Link href={`${BASE}/4x8-raised-bed-18-inch`}>4×8×18</Link>,{" "}
        <Link href={`${BASE}/4x4-raised-bed-12-inch`}>4×4×12</Link>, <Link href={`${BASE}/3x6-raised-bed-18-inch`}>3×6×18</Link>.
      </p>

      <h2>Bags per cubic yard</h2>
      <table>
        <thead>
          <tr>
            <th>Bag size</th>
            <th>Bags per cubic yard</th>
            <th>Bags for a 4×8×12 in bed (+10%)</th>
          </tr>
        </thead>
        <tbody>
          {bed.bagsBySize.map((b) => (
            <tr key={b.size}>
              <td>{fmt(b.size)} cu ft</td>
              <td>{fmt(27 / b.size, 1)}</td>
              <td>{fmtInt(b.bags)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Topsoil, compost, blend or fill?</h2>
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Weight per cu yd</th>
            <th>Bulk price</th>
            <th>Use it for</th>
          </tr>
        </thead>
        <tbody>
          {SOIL_TYPES.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>
                {s.weightEstimate ? "≈ " : ""}
                {fmtInt(s.tonsPerYd * 2000)} lb
              </td>
              <td>{s.bulkNote}</td>
              <td>{s.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Only the topsoil weight comes from a published yard table (Roseville: 2,000–2,200 lb per yard); compost, blend and fill weights are
        estimates and swing widely with moisture. Weight changes your truck and pickup plans, not the volume you need.
      </p>

      <h2>Bags or bulk?</h2>
      <p>
        A 1 cu ft bag of topsoil at $2.85 works out to $76.95 per cubic yard, against $32.95–$51.95 for screened topsoil in bulk. With a $75 delivery
        fee and a $42.45 bulk price, bulk is cheaper from about {fmt(breakEven, 1)} cubic yards — roughly {fmtInt(breakEven * 81)} sq ft at 4 in. Raised beds sit near that line: one or two beds are usually a
        bag job, a whole garden of them is a bulk job. Compost is pricier either way ($9.95 per 1.5 cu ft bag, $32.05–$65.95 per yard bulk).
      </p>

      <h2>Measuring odd shapes and low spots</h2>
      <p>
        For a curved bed, measure its length, then its width every few feet along it, and multiply the length by the average width. Split
        L-shaped areas into rectangles and add them up (the calculator takes up to three). For low spots, push a stake in at the deepest point and
        a few points toward the edges, and use the average depth — ordering for the deepest reading over the whole area buys far too much.
      </p>

      <h2>Getting a load delivered</h2>
      <p>
        A cubic yard of screened topsoil weighs about a ton, so even a small raised-bed order outweighs a half-ton pickup&apos;s nominal payload. Yards
        send up to about {TRUCK.singleAxleTons} tons on a single-axle truck and up to {TRUCK.tandemTons} tons on a tandem; Roseville Rock Supply asks for 10
        ft of width, 14 ft of height clearance and firm, level ground where the truck dumps. Lay a tarp on the driveway first, and have the pile
        dropped as close to the beds as the truck can safely reach.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Forgetting settling — a bed filled flush to the top sits noticeably lower after a few soakings.</li>
        <li>Using the nominal board height for raised beds instead of measuring inside.</li>
        <li>Filling beds with fill dirt. It is unscreened subsoil meant for raising grade, not for growing.</li>
        <li>Ordering by weight from one yard and by volume from another without converting — ask how they sell it.</li>
        <li>Planning to haul it in a pickup: a yard of topsoil weighs about a ton, twice a half-ton&apos;s nominal payload.</li>
      </ul>
      <p>
        Finishing the beds? The <Link href="/landscaping/mulch-calculator">mulch calculator</Link> covers the top layer, and the{" "}
        <Link href="/landscaping/gravel-calculator">gravel calculator</Link> handles paths between beds. Leveling a yard with sand instead? Use the{" "}
        <Link href="/landscaping/sand-calculator">sand calculator</Link>.
      </p>
    </>
  );
}

export const topsoilCalculator: CalculatorEntry<TopsoilValues> = {
  meta: {
    slug: SLUG,
    category: "landscaping",
    name: "Topsoil & Raised Bed Soil Calculator",
    shortName: "Topsoil & raised beds",
    h1: "Topsoil & Raised Bed Soil Calculator",
    metaTitle: "Topsoil Calculator: Yards, Bags & Raised Beds",
    metaDescription:
      "How much topsoil, compost or garden soil you need — a 4×8 raised bed 12 in deep holds 32 cu ft (24 bags of 1.5 cu ft with settling). Yards, tons and cost.",
    summary:
      "Cubic yards, tons and bags of topsoil, compost or blend for lawns, beds and raised beds — with settling, a 50/50 mix split and bags-vs-bulk cost.",
    outputs: ["Cubic yards & tons", "Bags (0.75–2 cu ft)", "Raised beds", "Bags vs bulk"],
    faq: [
      {
        q: "How much soil do I need for a 4x8 raised bed?",
        a: "At 12 inches deep a 4×8 bed holds 32 cubic feet (1.19 cubic yards). With 10% for settling buy about 35 cubic feet: 24 bags of 1.5 cu ft, 36 bags of 1 cu ft or 18 bags of 2 cu ft.",
      },
      {
        q: "How many bags of soil are in a cubic yard?",
        a: "27 bags of 1 cu ft, 18 bags of 1.5 cu ft, 36 bags of 0.75 cu ft or 13.5 bags of 2 cu ft — a cubic yard is 27 cubic feet.",
      },
      {
        q: "How much does a yard of topsoil weigh?",
        a: "About 2,000–2,200 lb (1–1.1 tons) dry, per Roseville Rock Supply's reference table. Wet topsoil weighs noticeably more, which matters for trucks and pickups but not for how much you need.",
      },
      {
        q: "How much topsoil do I need for a new lawn?",
        a: "Roseville Rock Supply recommends 4–6 inches. 1,000 sq ft at 4 inches is 12.35 cubic yards before settling — order about 13.6 cubic yards.",
      },
      {
        q: "How much extra soil should I order for settling?",
        a: "Order 5–10% extra (Roseville Rock Supply); the calculator uses 10%. Loose soil and blends settle after the first watering, and raised beds always look low the first season.",
      },
      {
        q: "Is it cheaper to buy topsoil in bags or bulk?",
        a: "Bulk, once you need more than about two cubic yards. A 1 cu ft bag at $2.85 is $76.95 per yard, while screened bulk topsoil runs $32.95–$51.95 per yard plus delivery.",
      },
      {
        q: "Is fill dirt the same as topsoil?",
        a: "No. Fill dirt is unscreened subsoil ($25.95–$28.95 per yard) for filling holes and raising grade. Cap it with at least a few inches of topsoil wherever you want anything to grow.",
      },
    ],
    sources: [SOURCES.rosevilleCalc, SOURCES.rosevillePrices, SOURCES.mulchProsPrices, SOURCES.msuMulch, SOURCES.mulchProsWeights, SOURCES.lawnStarter],
    related: ["landscaping/mulch-calculator", "landscaping/gravel-calculator", "landscaping/sand-calculator", "landscaping/paver-base-calculator", "measure/cubic-yard-calculator", "landscaping/sod-calculator", "landscaping/grass-seed-calculator"],
    updated: LANDSCAPING_CHECKED,
    keywords: ["topsoil calculator", "raised bed soil", "how much soil", "compost calculator", "garden soil", "fill dirt", "yards of topsoil", "bags of soil"],
  },
  Calculator: TopsoilCalculator,
  Content,
  presets: TOPSOIL_PRESETS,
  presetAnswer,
};
