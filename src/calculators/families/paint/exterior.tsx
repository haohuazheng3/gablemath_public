import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeExterior, packText } from "./compute";
import { BRAND_CALC, EXTERIOR_PAINTS, PAINT_CHECKED, SIDING, paintSources, ratedText } from "./data";
import ExteriorCalculator from "./ExteriorCalculator";
import { EXTERIOR_DEFAULTS, exteriorInputFrom, type ExteriorValues } from "./exterior-model";

const SLUG = "exterior-paint-calculator";
const BASE = `/paint/${SLUG}`;
const run = (v: ExteriorValues) => computeExterior(exteriorInputFrom(v));
const finishGal = (v: ExteriorValues) => run(v).needs.filter((n) => n.key !== "primer");

/* ───────── presets: house sizes (floor area → an assumed footprint) ───────── */

type Spec = { sqft: number; stories: 1 | 2; len: number; wid: number; doors: number; windows: number; alt: { stories: 1 | 2; len: number; wid: number } };
const SPECS: Spec[] = [
  { sqft: 1500, stories: 1, len: 50, wid: 30, doors: 2, windows: 12, alt: { stories: 2, len: 28, wid: 27 } },
  { sqft: 2000, stories: 2, len: 32, wid: 32, doors: 2, windows: 16, alt: { stories: 1, len: 50, wid: 40 } },
  { sqft: 2500, stories: 2, len: 36, wid: 35, doors: 2, windows: 18, alt: { stories: 1, len: 50, wid: 50 } },
  { sqft: 3000, stories: 2, len: 40, wid: 38, doors: 3, windows: 22, alt: { stories: 1, len: 60, wid: 50 } },
];

/** Gables on the short sides at a 6/12 pitch (rise = width ÷ 4), 9 ft of wall per story. */
function house(len: number, wid: number, stories: number, doors: number, windows: number): ExteriorValues {
  return { ...EXTERIOR_DEFAULTS, measure: "footprint", len, wid, h: 9 * stories, gables: 2, gableW: wid, rise: wid / 4, doors, windows };
}

export const EXTERIOR_PRESETS: Preset<ExteriorValues>[] = SPECS.map((s) => {
  const v = house(s.len, s.wid, s.stories, s.doors, s.windows);
  const r = run(v);
  const total = r.needs.reduce((t, n) => t + n.gallons, 0);
  return {
    slug: `${s.sqft}-sq-ft-house`,
    values: v,
    group: "House sizes",
    label: `${fmtInt(s.sqft)} sq ft house`,
    h1: `How many gallons of paint for a ${fmtInt(s.sqft)} sq ft house exterior?`,
    metaTitle: `Exterior Paint for a ${fmtInt(s.sqft)} sq ft House: Gallons`,
    metaDescription: `A ${fmtInt(s.sqft)} sq ft ${s.stories}-story house has about ${fmtInt(r.sidingSqFt)} sq ft of siding: ${fmt(total, 1)} gal for 2 coats of siding and trim, ~${fmtMoney(r.paintCost)} in paint.`,
  };
});

function presetAnswer(v: ExteriorValues): PresetAnswer {
  const r = run(v);
  const spec = SPECS.find((s) => s.len === v.len && s.wid === v.wid);
  const stories = Math.round(v.h / 9);
  const sidingNeed = r.needs.find((n) => n.key === "siding");
  const trimNeed = r.needs.find((n) => n.key === "trim");
  const oneCoat = run({ ...v, coats: 1 });
  const rows = [
    ["Vinyl, fiber cement or wood lap", "wood-lap"],
    ["Rough-sawn cedar / T1-11", "rough-cedar"],
    ["Smooth stucco or brick", "stucco"],
    ["Rough (dash) stucco", "stucco-rough"],
  ].map(([label, id]) => {
    const x = run({ ...v, siding: id });
    const s = x.needs.find((n) => n.key === "siding");
    return [label, s ? `${fmt(s.gallons, 1)} gal` : "—", s ? packText(s.pack) : "—", fmtMoney(x.paintCost)];
  });
  const notes: string[] = [];
  if (spec) {
    const alt = run(house(spec.alt.len, spec.alt.wid, spec.alt.stories, spec.doors, spec.windows));
    const altGal = alt.needs.reduce((t, n) => t + n.gallons, 0);
    const thisGal = r.needs.reduce((t, n) => t + n.gallons, 0);
    notes.push(
      `Floor area alone doesn't set the answer. We modeled this ${fmtInt(spec.sqft)} sq ft home as a ${stories}-story ${spec.len}×${spec.wid} ft box. The same floor area built as a ${spec.alt.stories}-story ${spec.alt.len}×${spec.alt.wid} ft house has ${fmtInt(alt.sidingSqFt)} sq ft of siding and needs ${fmt(altGal, 1)} gal — ${altGal > thisGal ? "more" : "less"} than the ${fmt(thisGal, 1)} gal here. Enter your own footprint above for your house.`,
    );
  }
  notes.push(`Gables are figured at a 6/12 roof pitch (${fmt(v.rise)} ft peak over ${fmt(v.gableW)} ft), and trim as fascia along the eaves, both rakes of each gable, and casing around every door and window.`);
  return {
    headline: `A ${spec ? `${fmtInt(spec.sqft)} sq ft ` : ""}${stories}-story house with a ${fmt(v.len)}×${fmt(v.wid)} ft footprint has about ${fmtInt(r.sidingSqFt)} sq ft of siding — ${sidingNeed ? fmt(sidingNeed.gallons, 1) : 0} gal for two coats, plus ${trimNeed ? fmt(trimNeed.gallons, 1) : 0} gal for trim.`,
    bullets: [
      `Walls: ${fmtInt(2 * (v.len + v.wid))} ft perimeter × ${fmt(v.h)} ft = ${fmtInt(r.wallSqFt)} sq ft, plus two gables (${fmtInt(r.gableSqFt)} sq ft), minus ${v.doors} doors at ${BRAND_CALC.swDoorSqFt} sq ft and ${v.windows} windows at ${BRAND_CALC.swWindowSqFt} sq ft = ${fmtInt(r.sidingSqFt)} sq ft.`,
      sidingNeed ? `Siding: ${fmtInt(r.sidingSqFt)} × 2 coats ÷ 300 sq ft/gal = ${fmt(sidingNeed.gallons, 1)} gal → buy ${packText(sidingNeed.pack)}.` : "",
      trimNeed ? `Trim: ${fmtInt(exteriorInputFrom(v).trimLf)} ft of 6-in fascia and casing = ${fmtInt(r.trimSqFt)} sq ft → ${packText(trimNeed.pack)} in the trim color.` : "",
      `Across the label range (250–400 sq ft/gal), siding and trim take ${fmt(r.range.lowGal, 1)}–${fmt(r.range.highGal, 1)} gal for two coats; Sherwin-Williams' calculator (350 sq ft/gal) says ${fmt(r.sw.total, 1)} gal.`,
      `Same-color repaint with a one-coat premium line: about ${fmt(oneCoat.totalGallons, 1)} gal (${fmtMoney(oneCoat.paintCost)}).`,
      `Paint about ${fmtMoney(r.paintCost)} at a typical ${fmtMoney(r.needs[0]?.priced.prices.gal ?? 0, { cents: true })} per gallon, plus ${fmtMoney(r.suppliesCost)} in rollers, brushes, tape and drop cloths.`,
    ].filter(Boolean),
    table: { caption: "The same house by siding type (2 coats, typical exterior paint)", columns: ["Siding", "Siding paint", "Buy", "Siding + trim cost"], rows },
    notes,
  };
}

/* ───────── long-form content ───────── */

const SHOWN = ["sw-emerald-ext", "sw-duration-ext", "sw-superpaint-ext", "sw-a100", "bm-aura-ext", "bm-element-guard", "behr-ultra-ext", "valspar-duramax", "ck-ext"];

function Content() {
  const ex = run(EXTERIOR_DEFAULTS);
  const s = ex.needs.find((n) => n.key === "siding")!;
  return (
    <>
      <h2>How to figure exterior paint</h2>
      <p>
        Exterior paint goes on the siding, not the floor plan, so start with the walls: perimeter × wall height (ground to eaves), plus the triangle of every gable end (width ×
        peak height ÷ 2), minus doors, windows and garage doors. Then:
      </p>
      <p>
        <strong>gallons = siding area × coats ÷ sq ft per gallon ÷ surface factor</strong>
      </p>
      <p>
        <strong>Worked example — a two-story house on a 32×32 ft footprint:</strong> 128 ft of perimeter × 18 ft = 2,304 sq ft. Two gables, each 32 ft wide with an 8-ft peak,
        add 2 × 128 = 256 sq ft. Two doors (21 sq ft each) and 16 windows (15 sq ft each) remove 282 sq ft, leaving {fmtInt(ex.sidingSqFt)} sq ft. Two coats at 300 sq ft per gallon:{" "}
        {fmtInt(ex.sidingSqFt)} × 2 ÷ 300 = {fmt(s.gallons, 1)} gallons for the siding, plus about {fmt(ex.trimSqFt, 0)} sq ft of fascia and casing in the trim color.
      </p>

      <h2>Gallons by house size</h2>
      <table>
        <thead>
          <tr>
            <th>House</th>
            <th>Siding</th>
            <th>Siding + trim, 2 coats</th>
            <th>Paint cost</th>
          </tr>
        </thead>
        <tbody>
          {EXTERIOR_PRESETS.map((p) => {
            const r = run(p.values);
            return (
              <tr key={p.slug}>
                <td>
                  <Link href={`${BASE}/${p.slug}`}>{p.label}</Link>
                </td>
                <td>{fmtInt(r.sidingSqFt)} sq ft</td>
                <td>{fmt(finishGal(p.values).reduce((t, n) => t + n.gallons, 0), 1)} gal</td>
                <td>{fmtMoney(r.paintCost)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>The 1,500 sq ft row is a one-story ranch; the others are two-story homes. A ranch has more wall per square foot of floor, so measure your own house.</p>

      <h2>Coverage by paint</h2>
      <p>
        Premium high-build exterior lines go on thicker and cover less per gallon — but often need only one coat on a same-color repaint. We plan at 300 sq ft per gallon for a
        typical exterior latex; pick your product in the calculator to use its own label rate.
      </p>
      <table>
        <thead>
          <tr>
            <th>Paint</th>
            <th>Label (sq ft/gal)</th>
            <th>Coats</th>
          </tr>
        </thead>
        <tbody>
          {EXTERIOR_PAINTS.filter((p) => SHOWN.includes(p.id)).map((p) => (
            <tr key={p.id}>
              <td>
                {p.brand} {p.name}
              </td>
              <td>{ratedText(p)}</td>
              <td>{p.coats}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Rough siding, stucco and brick</h2>
      <p>Data-sheet rates assume smooth, sealed surfaces. Porous and rough surfaces soak up more, so the calculator plans them at a fraction of the label rate:</p>
      <ul>
        {SIDING.filter((x) => x.factor < 1).map((x) => (
          <li key={x.id}>
            <strong>
              {x.label}: {Math.round(x.factor * 100)}%
            </strong>{" "}
            — {x.note}
          </li>
        ))}
      </ul>
      <p>These are estimates built from maker data. Buy the last gallon or two after the first coat shows you the real spread.</p>

      <h2>Prep that changes the answer</h2>
      <ul>
        <li>Bare wood, new fiber cement and fresh masonry need primer first; chalky old paint needs washing and, often, a bonding primer.</li>
        <li>Spraying uses more paint. Maker coverage excludes overspray, so we add 25% (our estimate) and recommend back-rolling.</li>
        <li>Check the minimum temperature on the can: some premium lines go down to 35°F, others need warmer weather. Stay above the dew point while it dries.</li>
        <li>Homes built before 1978 may have lead paint. Test before you scrape or sand.</li>
        <li>Dark colors on vinyl can absorb enough heat to warp it — stay at or lighter than the original color unless the line offers vinyl-safe colors.</li>
      </ul>

      <h2>Common mistakes</h2>
      <ul>
        <li>Entering the house&apos;s floor area as the paint area. A 2,000 sq ft two-story on a 32×32 footprint has about 2,560 sq ft of gross wall.</li>
        <li>Forgetting the gables, which add a few hundred square feet on a typical house.</li>
        <li>Buying all the paint at once for rough cedar or stucco without testing the spread.</li>
        <li>Mixing cans mid-wall — box all the siding color in one bucket before you start.</li>
      </ul>
      <p>
        Staining a deck or fence? Use the <Link href="/paint/deck-stain-calculator">deck stain calculator</Link>. Painting inside? Use the{" "}
        <Link href="/paint/paint-calculator">room paint calculator</Link>. Re-roofing first? Try the <Link href="/roofing/roofing-calculator">roofing calculator</Link>.
      </p>
    </>
  );
}

export const exteriorCalculator: CalculatorEntry<ExteriorValues> = {
  meta: {
    slug: SLUG,
    category: "paint",
    name: "Exterior Paint Calculator",
    shortName: "House exteriors",
    h1: "Exterior Paint Calculator",
    metaTitle: "Exterior Paint Calculator: Gallons for Your House",
    metaDescription: "How much exterior paint for your house: siding, gables and trim minus doors and windows. A 2,000 sq ft two-story takes about 17 gal for 2 coats, with cost.",
    summary: "Enter your house footprint, wall height and siding type to get gallons for siding and trim, the cheapest can mix, primer, supplies and cost — with stucco, brick and rough cedar adjusted.",
    outputs: ["Siding & trim gallons", "Siding adjustments", "Cheapest can mix", "Cost"],
    faq: [
      { q: "How many gallons of paint for a 2,000 sq ft house exterior?", a: "About 17 gallons for two coats on a two-story house with a 32×32 ft footprint: 2,278 sq ft of siding takes 15.2 gallons at 300 sq ft per gallon, and the fascia and trim about 1.6 more. A one-story 2,000 sq ft ranch has less wall per floor foot, so measure your own walls." },
      { q: "How much does a gallon of exterior paint cover?", a: "250–400 sq ft per coat on smooth siding. Premium high-build lines such as Sherwin-Williams Emerald and Duration Exterior are rated 250–300, while SuperPaint and A-100 Exterior are rated 350–400. Rough cedar, stucco and brick take noticeably more." },
      { q: "Do I need one or two coats on the outside of a house?", a: "Two coats for bare wood, a color change or chalky old paint. Sherwin-Williams Emerald and Duration Exterior call for one coat when you repaint the same color over sound paint." },
      { q: "How much paint for a stucco or brick house?", a: "Plan on about 55% more than for smooth siding (our estimate from maker data): Benjamin Moore rates its masonry high-build application at 160–265 sq ft per gallon versus 250–350 on siding. Rough dash stucco is worse — Loxon primer covers 80 sq ft per gallon there versus 200 normally." },
      { q: "Can I use my home's square footage to estimate exterior paint?", a: "No — floor area is not wall area. Measure the perimeter and wall height, add the gable triangles and subtract doors and windows. The calculator does this from your footprint." },
      { q: "How cold is too cold to paint outside?", a: "It depends on the product: Sherwin-Williams Emerald Exterior and Latitude can go down to 35°F and Ultra Spec EXT to 40°F, while other lines need warmer weather — check the label. Stay above the minimum and the dew point until the paint dries." },
    ],
    sources: paintSources("swCalc", "swEmeraldExt", "swDurationExt", "swSuperPaintExt", "swA100", "swLatitude", "bmAuraExt", "bmRegalExt", "bmElementGuard", "bmUltraSpecExt", "behrUltraExt", "valsparDuramax", "swExtWoodPrimer", "swLoxon", "swSuperDeck", "kilz2", "sundries", "epaLead"),
    related: ["paint/paint-calculator", "paint/deck-stain-calculator", "roofing/roofing-calculator", "fence/fence-calculator", "roofing/siding-calculator"],
    updated: PAINT_CHECKED,
    keywords: ["exterior paint calculator", "house paint", "siding paint", "how much paint for a house", "stucco paint", "gallons of exterior paint"],
  },
  Calculator: ExteriorCalculator,
  Content,
  presets: EXTERIOR_PRESETS,
  presetAnswer,
};
