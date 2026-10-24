import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computePaverBase, type PaverResult } from "./compute";
import { LANDSCAPING_CHECKED, PAVER, PAVER_USES, SOURCES } from "./data";
import { tonsText } from "./display";
import PaverBaseCalculator from "./PaverBaseCalculator";
import { PAVER_DEFAULTS, paverInputFrom, paverUse, type PaverValues } from "./paver-base-model";

const SLUG = "paver-base-calculator";
const BASE = `/landscaping/${SLUG}`;

const run = (v: PaverValues): PaverResult => computePaverBase(paverInputFrom(v));
const patio = (l: number, w: number, use = "patio"): PaverValues => ({ ...PAVER_DEFAULTS, use, bd: paverUse(use).baseIn, l1: l, w1: w });

/* ───────── programmatic presets ───────── */

const NOTES: Record<string, string> = {
  "10x10": "A 10×10 patio fits a bistro table and two chairs, or a grill station.",
  "12x12": "12×12 is a common patio size — room for a table for four.",
  "12x16": "12×16 holds a dining set and a pair of lounge chairs.",
  "16x20": "16×20 is a full outdoor living room: dining and lounge zones side by side.",
  "4x20": "A 4×20 walk is a common driveway-to-front-door path; one end usually butts the driveway, so subtract it from the edging.",
  "12x20": "12×20 is a single-car paver driveway pad; heavier vehicles and clay soil push toward the 14 in end of Unilock's range.",
};

type Spec = { l: number; w: number; use: string; group: string };
const SPECS: Spec[] = [
  { l: 10, w: 10, use: "patio", group: "Patios" },
  { l: 12, w: 12, use: "patio", group: "Patios" },
  { l: 12, w: 16, use: "patio", group: "Patios" },
  { l: 16, w: 20, use: "patio", group: "Patios" },
  { l: 4, w: 20, use: "walkway", group: "Walkways & driveways" },
  { l: 12, w: 20, use: "driveway", group: "Walkways & driveways" },
];

export const PAVER_PRESETS: Preset<PaverValues>[] = SPECS.map((s) => {
  const values = patio(s.l, s.w, s.use);
  const r = run(values);
  const label = paverUse(s.use).label.toLowerCase();
  return {
    slug: `${s.l}x${s.w}-${label.replace(" ", "-")}`,
    values,
    group: s.group,
    label: `${s.l}×${s.w} ${label}`,
    h1: `How much paver base and sand for a ${s.l}×${s.w} ${label}?`,
    metaTitle: `Paver Base & Sand for a ${s.l}x${s.w} ${paverUse(s.use).label}`,
    metaDescription: `A ${s.l}×${s.w} ${label} needs about ${tonsText(r.base.tons, false)} of crusher run (${values.bd} in compacted) or ${fmtInt(r.base.bags)} bags, plus ${fmtInt(r.bedding.bags)} bags of bedding sand.`,
  };
});

function presetAnswer(v: PaverValues): PresetAnswer {
  const r = run(v);
  const b = r.base;
  const use = paverUse(v.use);
  const key = `${v.l1}x${v.w1}`;
  const grownL = v.l1 + (2 * v.ext) / 12;
  const grownW = v.w1 + (2 * v.ext) / 12;
  const countyBags = Math.ceil((r.areaSqFt / 6) * v.bd);
  const depths = use.id === "driveway" ? [6, 8, 10, 12, 14] : [4, 6, 8];
  return {
    headline: `A ${v.l1}×${v.w1} ft paver ${use.label.toLowerCase()} needs about ${tonsText(b.tons, false)} of crusher run for a ${fmt(v.bd)} in compacted base (or ${fmtInt(b.bags)} bags of 0.5 cu ft paver base), plus ${fmtInt(r.bedding.bags)} bags of bedding sand and ${fmtInt(Math.ceil(r.edgeFt))} ft of edge restraint.`,
    bullets: [
      `Base: the footprint grows 6 in past every edge to ${fmt(grownL)}×${fmt(grownW)} ft = ${fmt(r.baseAreaSqFt)} sq ft. At ${fmt(v.bd)} in that is ${fmt(b.q.cuydFinished, 2)} cu yd compacted; × ${fmt(b.factor)} loose × ${fmt(1 + v.extra / 100, 2)} extra = ${fmt(b.q.cuydOrder, 2)} cu yd ≈ ${tonsText(b.tons, false)}.`,
      `Cost: about ${fmtMoney(b.buy.bulkDelivered ?? 0)} for bulk crusher run delivered vs ${fmtMoney(b.buy.bagCost ?? 0)} for ${fmtInt(b.bags)} bags (${fmt(b.pallets, 1)} pallets) — ${b.buy.cheaper === "bulk" ? "bulk is far cheaper" : "bags are cheaper here"}.`,
      `Bedding: ${fmt(r.areaSqFt)} sq ft × 1 in = ${fmt(r.bedding.q.cuftOrder, 1)} cu ft of coarse sand (with extra) — ${fmtInt(r.bedding.bags)} bags of 0.5 cu ft${r.bedding.cost != null ? `, about ${fmtMoney(r.bedding.cost)}` : ""}.`,
      `Dig ${fmt(r.excavation.depthIn, 3)} in deep (${fmt(v.bd)} in base + 1 in sand + ${fmt(v.pv, 3)} in paver): ${fmt(r.excavation.cuyd, 1)} cu yd of soil, about ${tonsText(r.excavation.tons, false)} in place, to haul away.`,
      `Unilock's range for a ${use.label.toLowerCase()} is ${use.range[0]}–${use.range[1]} in of base; go deeper on clay, shallower on sandy, well-drained soil.`,
      ...(NOTES[key] ? [NOTES[key]] : []),
    ],
    table: {
      caption: `${v.l1}×${v.w1} ft ${use.label.toLowerCase()} at other base depths`,
      columns: ["Base depth", "Crusher run", "0.5 cu ft bags", "Bulk delivered", "Dig down"],
      rows: depths.map((d) => {
        const x = run({ ...v, bd: d });
        return [`${d} in`, tonsText(x.base.tons, false), fmtInt(x.base.bags), fmtMoney(x.base.buy.bulkDelivered ?? 0), `${fmt(x.excavation.depthIn, 2)} in`];
      }),
    },
    notes: [
      `${fmt(r.baseAreaSqFt)} sq ft × ${fmt(v.bd / 12, 3)} ft = ${fmt(b.q.cuftFinished, 1)} cu ft compacted = ${fmt(b.q.cuydFinished, 2)} cu yd. Crusher run compacts — Penn State places 8 in loose to finish at 6 in — so order ${fmt(b.factor)}× that, plus ${fmt(v.extra, 0)}% for an uneven subgrade: ${fmt(b.q.cuydOrder, 2)} cu yd × ${fmt(v.den)} t = ${fmt(b.tons, 2)} tons.`,
      `County Materials' bag rule — (sq ft ÷ 6) × depth — gives ${fmtInt(countyBags)} bags for the paved area alone. The ${fmtInt(b.bags)} bags here add the base extension under the edge restraint and the volume lost to compaction; buying ${fmtInt(countyBags)} would leave you about ${fmtInt(Math.max(0, b.bags - countyBags))} bags short.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

const TEN = run(patio(10, 10));

function Content() {
  return (
    <>
      <h2>How much paver base do you need?</h2>
      <p>
        A paver patio is three layers on firm, sloped subgrade: a compacted gravel base, a 1 in screeded bed of coarse sand, and the pavers. Work
        out the base as <strong>area × compacted depth × compaction factor</strong>. Make the base footprint bigger than the pavers — at least 6 in
        past every edge, as Quikrete does for patio bases — so the edge restraints sit on compacted stone.
      </p>
      <p>
        <strong>Worked example — a 10×10 ft patio, 6 in base:</strong> the base footprint is 11×11 = 121 sq ft. 121 × 0.5 ft ={" "}
        {fmt(TEN.base.q.cuftFinished, 1)} cu ft compacted ({fmt(TEN.base.q.cuydFinished, 2)} cu yd). Crusher run compacts by a third, so order{" "}
        {fmt(TEN.base.factor)}× — plus 5% for an uneven subgrade — {fmt(TEN.base.q.cuydOrder, 2)} cu yd, or about {tonsText(TEN.base.tons, false)} at 1.45
        tons per loose yard. The bedding sand is 100 sq ft × 1 in = 8.3 cu ft: {fmtInt(TEN.bedding.bags)} half-cubic-foot bags.
      </p>

      <h2>How deep should the base be?</h2>
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Compacted base (Unilock)</th>
          </tr>
        </thead>
        <tbody>
          {PAVER_USES.map((u) => (
            <tr key={u.id}>
              <td>{u.label}</td>
              <td>
                {u.range[0]}–{u.range[1]} in
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Unilock&apos;s guide adds that clay soil needs the deeper end and sandy soil less. Older bag instructions are thinner — Quikrete&apos;s paver sand
        sheet suggests only 2–4 in of gravel — and that gap explains many sunken patios. Compact the base in lifts of 2–3 in with a plate
        compactor, and slope it away from the house.
      </p>

      <h2>Base stone and bedding</h2>
      <ul>
        <li>
          <strong>3/4 in crusher run</strong> (also sold as #411, road base, ABC, CA-6, 21A) compacts hard. Bed pavers on it in 1 in of coarse
          concrete sand.
        </li>
        <li>
          <strong>3/4 in clear stone</strong> drains freely and barely compacts by volume. Unilock beds pavers on it with 1/8 in chip stone
          instead of sand.
        </li>
        <li>
          Screed the bedding loose over 1 in pipes, lay the pavers, set edge restraints, then run the plate compactor over the pavers to settle
          them in. Sweep jointing or polymeric sand into the joints last.
        </li>
      </ul>

      <h2>Bags or bulk?</h2>
      <p>
        Paver base comes in 0.5 cu ft bags (about 50 lb, $5.37–$7.49) that cover roughly 6 sq ft at 1 in deep; a County Materials pallet is{" "}
        {PAVER.bagsPerPallet} bags. That makes a 10×10 patio about {fmtInt(TEN.base.bags)} bags — {fmt(TEN.base.pallets, 1)} pallets — versus about{" "}
        {tonsText(TEN.base.tons, false)} of bulk crusher run at $24–$34 a ton (American Rock Supply) plus delivery. Above a few hundred pounds, bulk wins
        easily; bags make sense for a small landing or when the truck can&apos;t reach.
      </p>

      <h2>Measuring and digging out</h2>
      <p>
        Measure the finished paver area, then let the calculator grow the base 6 in past every edge. Edge restraint runs along every side that
        doesn&apos;t butt against the house, steps or another slab — enter those lengths under “Edges against a house” to drop them from the count.
        Dig to the base depth plus the bedding plus the paver thickness: a 6 in base, 1 in of sand and a 2⅜ in paver means about 9⅜ in below
        finished grade. That spoil adds up fast — the 10×10 patio above moves {fmt(TEN.excavation.cuyd, 1)} cubic yards of soil, roughly{" "}
        {tonsText(TEN.excavation.tons, false)} in place at the 110 lb per cubic foot Nebraska DOT uses for compacted soil, and more volume once it is loose.
        Plan a trailer, a dumpster or a spot to regrade it before you start digging.
      </p>

      <h2>Order of work</h2>
      <ul>
        <li>Mark the layout and have buried utilities located before you dig (Unilock&apos;s first step).</li>
        <li>Excavate, then compact the subgrade so the base sits on firm soil.</li>
        <li>Place the base in 2–3 in lifts, compacting each one, sloped away from the house.</li>
        <li>Screed 1 in of bedding over pipes, lay the pavers from a corner, and cut the edges.</li>
        <li>Spike the edge restraints into the base, compact the pavers, then sweep in joint sand.</li>
      </ul>
      <p>If you choose to seal the pavers, Unilock suggests resealing every 3–5 years.</p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Ordering the base by its finished depth and running short after compaction.</li>
        <li>Building the base only as big as the patio, so edge restraints have nothing solid to spike into.</li>
        <li>Spreading bedding sand thicker than 1–2 in to fix a lumpy base — pavers then settle unevenly.</li>
        <li>Compacting the bedding sand before laying the pavers.</li>
        <li>Skipping edge restraints. Unilock calls them critical: without them pavers creep sideways.</li>
      </ul>
      <p>
        Patio sizes: <Link href={`${BASE}/10x10-patio`}>10×10</Link>, <Link href={`${BASE}/12x12-patio`}>12×12</Link>,{" "}
        <Link href={`${BASE}/12x16-patio`}>12×16</Link>, <Link href={`${BASE}/16x20-patio`}>16×20</Link>. Pouring concrete instead? Use the{" "}
        <Link href="/concrete/slab-calculator">slab calculator</Link>. Gravel paths and driveways are in the{" "}
        <Link href="/landscaping/gravel-calculator">gravel calculator</Link>, and bedding sand on its own in the{" "}
        <Link href="/landscaping/sand-calculator">sand calculator</Link>.
      </p>
    </>
  );
}

export const paverBaseCalculator: CalculatorEntry<PaverValues> = {
  meta: {
    slug: SLUG,
    category: "landscaping",
    name: "Paver Base Calculator",
    shortName: "Paver base & sand",
    h1: "Paver Base Calculator",
    metaTitle: "Paver Base Calculator: Gravel, Sand & Bags (2026)",
    metaDescription: `Paver base and bedding sand for any patio or walkway: a 10×10 patio takes about ${fmt(TEN.base.tons, 1)} tons of crusher run (6 in compacted) and ${TEN.bedding.bags} bags of sand.`,
    summary:
      "Compacted base by project (Unilock depths), compaction, bedding sand, edge restraint and dig depth for paver patios, walkways, pool decks and driveways — in tons or bags.",
    outputs: ["Base tons & bags", "Bedding sand", "Edge restraint", "Dig depth"],
    faq: [
      {
        q: "How much paver base do I need for a 10x10 patio?",
        a: `With a 6 inch compacted base extended 6 inches past the edges, about ${fmt(TEN.base.q.cuydOrder, 1)} cubic yards loose — roughly ${fmt(TEN.base.tons, 1)} tons of crusher run or ${TEN.base.bags} bags of 0.5 cu ft — plus ${TEN.bedding.bags} bags of bedding sand.`,
      },
      {
        q: "How deep should paver base be?",
        a: "Unilock calls for 6–8 inches of compacted gravel under patios and walkways, 6–12 inches under pool decks and 10–14 inches under driveways, with the deeper end on clay soil.",
      },
      {
        q: "How much sand goes under pavers?",
        a: "A 1 inch screeded bed of coarse concrete sand (Unilock); Quikrete allows 1–2 inches. 100 sq ft takes 8.3 cubic feet — about 17 bags of 0.5 cu ft.",
      },
      {
        q: "Why do I need more paver base than the volume I measured?",
        a: "Crusher run compacts. Penn State places 8 inches loose to finish at 6 inches, so order about 1.33 times the compacted volume. Bag-coverage rules like (sq ft ÷ 6) × depth ignore this.",
      },
      {
        q: "How deep do I dig for a paver patio?",
        a: "Base depth plus bedding plus paver thickness. For a 6 inch base, 1 inch of sand and a 2⅜ inch paver, dig about 9⅜ inches below finished grade, deeper on clay.",
      },
      {
        q: "How many bags of paver base are in a pallet or a yard?",
        a: "County Materials ships 63 bags of 0.5 cu ft per pallet (31.5 cu ft). A cubic yard is 54 of those bags.",
      },
      {
        q: "Do pavers need edge restraints?",
        a: "Yes. Unilock calls them critical and Quikrete says they are required: plastic, metal or concrete edging spiked into the compacted base stops pavers from shifting sideways.",
      },
    ],
    sources: [SOURCES.unilock, SOURCES.pennState, SOURCES.countyMaterials, SOURCES.quikretePaverSand, SOURCES.quikretePatio, SOURCES.mulchProsWeights, SOURCES.martinMarietta, SOURCES.americanRock, SOURCES.kellogg, SOURCES.rosevilleCalc, SOURCES.nebraskaDot],
    related: ["landscaping/sand-calculator", "landscaping/gravel-calculator", "concrete/slab-calculator", "landscaping/mulch-calculator", "landscaping/paver-calculator", "landscaping/retaining-wall-calculator"],
    updated: LANDSCAPING_CHECKED,
    keywords: ["paver base calculator", "paver sand", "patio base", "crusher run", "how much paver base", "bedding sand", "edge restraint", "paver patio"],
  },
  Calculator: PaverBaseCalculator,
  Content,
  presets: PAVER_PRESETS,
  presetAnswer,
};
