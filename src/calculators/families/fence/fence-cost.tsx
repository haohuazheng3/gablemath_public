import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtMoney } from "@/lib/format";
import { computeFence, computeFenceCost, standardFenceInput, type Range } from "./compute";
import { FENCE_COST_DEFAULTS, fenceCostInputFrom, type FenceCostValues } from "./cost-model";
import {
  FENCE_CHECKED,
  FENCE_COST_SOURCES,
  HOMEWYSE_ALL_PER_LF,
  INSTALLED,
  LABOR_PER_LF,
  MODERNIZE_150FT,
  PPI_YOY,
  PRO_STAIN_PER_SQFT,
  REMOVAL_PER_LF,
  installed,
  type CostMaterialId,
} from "./data";
import FenceCostCalculator from "./FenceCostCalculator";

const SLUG = "fence-cost-calculator";
const BASE = `/fence/${SLUG}`;
const money = (r: Range) => `${fmtMoney(r[0], { cents: false })}–${fmtMoney(r[1], { cents: false })}`;

const valuesFor = (material: CostMaterialId, lengthFt: number): FenceCostValues => ({
  ...FENCE_COST_DEFAULTS,
  mat: material,
  len: lengthFt,
  h: installed(material).defaultHeight,
  wg: 0,
  dg: 0,
});
const run = (v: FenceCostValues) => computeFenceCost(fenceCostInputFrom(v));
const TITLE: Partial<Record<CostMaterialId, string>> = { "wood-privacy": "Privacy Fence", vinyl: "Vinyl Fence", "chain-link": "Chain Link Fence", aluminum: "Aluminum Fence" };

/* ───────── programmatic presets ───────── */

const SPECS: { mat: CostMaterialId; len: number; h1: string; group: string }[] = [
  { mat: "wood-privacy", len: 100, h1: "How much does a 100 ft privacy fence cost?", group: "Wood privacy" },
  { mat: "wood-privacy", len: 150, h1: "How much does a 150 ft privacy fence cost?", group: "Wood privacy" },
  { mat: "wood-privacy", len: 200, h1: "How much does a 200 ft wood fence cost?", group: "Wood privacy" },
  { mat: "vinyl", len: 100, h1: "How much does a 100 ft vinyl fence cost?", group: "Vinyl, chain link & aluminum" },
  { mat: "vinyl", len: 150, h1: "Vinyl vs wood fence cost for 150 ft", group: "Vinyl, chain link & aluminum" },
  { mat: "chain-link", len: 100, h1: "How much does 100 ft of chain link fence cost?", group: "Vinyl, chain link & aluminum" },
  { mat: "chain-link", len: 200, h1: "How much does a 200 ft chain link fence cost?", group: "Vinyl, chain link & aluminum" },
  { mat: "aluminum", len: 100, h1: "How much does a 100 ft aluminum fence cost?", group: "Vinyl, chain link & aluminum" },
];

export const FENCE_COST_PRESETS: Preset<FenceCostValues>[] = SPECS.map((s) => {
  const v = valuesFor(s.mat, s.len);
  const r = run(v);
  const name = r.material.name;
  return {
    slug: `${s.len}-ft-${s.mat}`,
    values: v,
    group: s.group,
    label: `${s.len} ft ${name.toLowerCase()}`,
    h1: s.h1,
    metaTitle: `${s.len} ft ${TITLE[s.mat] ?? `${name} Fence`} Cost (2026): Installed vs DIY`,
    metaDescription: `${s.len} ft of ${name.toLowerCase()} fence costs about ${money(r.total)} installed ($${r.material.perLf[0]}–$${r.material.perLf[1]}/ft)${r.diy ? `, or about ${fmtMoney(r.diy.materials)} in DIY materials` : ""}. Gates and tear-out priced too.`,
  };
});

function presetAnswer(v: FenceCostValues): PresetAnswer {
  const r = run(v);
  const m = r.material;
  const L = v.len;
  const withGate = run({ ...v, wg: 1 });
  const withRemoval = run({ ...v, rem: true });
  const bullets = [
    `Fence: ${fmt(L)} ft × $${m.perLf[0]}–$${m.perLf[1]} per foot = ${money(r.fence)} (${m.source}).`,
    r.diy
      ? `DIY: our own material takeoff for ${fmt(L)} ft of ${v.h}-ft ${m.name.toLowerCase()} comes to about ${fmtMoney(r.diy.materials)}${r.diy.hasEstimates ? " (some prices estimated)" : ""} — the rest of an installed price is labor, equipment and overhead.`
      : `DIY: we don't model ${m.name.toLowerCase()} materials; installation labor alone typically runs $${LABOR_PER_LF[0]}–$${LABOR_PER_LF[1]} per foot (Modernize), or ${money([LABOR_PER_LF[0] * L, LABOR_PER_LF[1] * L])} here.`,
    withGate.gatesUnpriced
      ? `Gates: our sources don't price ${m.name.toLowerCase()} gates separately — ask for them as a line item.`
      : `Add a walk gate: ${money(withGate.gates)} more (${m.gateSource}), for ${money(withGate.total)} in all.`,
    `Tearing out an old fence first adds $${REMOVAL_PER_LF[0]}–$${REMOVAL_PER_LF[1]} per foot: ${money(withRemoval.removal)}.`,
    `Prices are moving: the BLS producer price index for ${r.ppi.series} was up ${fmt(r.ppi.pct, 1)}% year over year in September 2026.`,
  ];
  const t150 = MODERNIZE_150FT[m.id];
  if (L === 150 && t150) bullets.push(`Cross-check: Modernize's own 150-ft example for ${m.name.toLowerCase()} is ${money(t150)}.`);
  if (m.id === "aluminum" && L === 100) bullets.push("Cross-check: Fixr (Aug 2025) prices 100 ft of 4-ft staggered spear-top aluminum at $3,000–$8,500, about $7,150 on average.");
  if (m.id === "vinyl") bullets.push("Homewyse's May 2026 contractor-grade price for 6-ft vinyl privacy is higher still, $58.70–$82.35 per foot, so premium panels can land above Modernize's range.");
  if (m.id === "vinyl" || m.id === "chain-link") {
    const wood = run({ ...v, mat: "wood-privacy", h: 6 });
    bullets.push(
      `Against wood: ${fmt(L)} ft of 6-ft wood privacy runs ${money(wood.fence)} installed. ${m.id === "vinyl" ? `Vinyl costs ${money([r.fence[0] - wood.fence[0], r.fence[1] - wood.fence[1]])} more up front, but wood needs staining — ${money([PRO_STAIN_PER_SQFT[0] * L * 12, PRO_STAIN_PER_SQFT[1] * L * 12])} for both sides by a pro.` : `Chain link saves ${money([wood.fence[0] - r.fence[0], wood.fence[1] - r.fence[1]])} but gives no privacy.`}`,
    );
  }
  if (m.id === "chain-link") bullets.push(`For 6-ft galvanized chain link with 16-ga posts, Homewyse (May 2026) quotes $29.08–$44.84 per foot — ${money([29.08 * L, 44.84 * L])} for ${fmt(L)} ft.`);
  if (m.stainable) {
    const area = L * v.h * 2;
    bullets.push(`Having both sides stained by a pro adds ${money([PRO_STAIN_PER_SQFT[0] * area, PRO_STAIN_PER_SQFT[1] * area])} for ${fmt(area)} sq ft (Homewyse, May 2026).`);
  }

  return {
    headline: `Installing ${fmt(L)} ft of ${m.name.toLowerCase()} fence costs about ${money(r.total)} — $${m.perLf[0]}–$${m.perLf[1]} per foot, with a midpoint of ${fmtMoney(r.mid)}.`,
    bullets,
    table: {
      caption: `${fmt(L)} ft of fence installed, by material`,
      columns: ["Material", "Per foot", `${fmt(L)} ft installed`, "Source"],
      rows: r.compare.map((c) => [c.name, `$${c.perLf[0]}–$${c.perLf[1]}`, money(c.total), installed(c.id).source]),
    },
    notes: [
      `The range is simply length × the published per-foot range: ${fmt(L)} × $${m.perLf[0]} = ${fmtMoney(r.fence[0])} and ${fmt(L)} × $${m.perLf[1]} = ${fmtMoney(r.fence[1])}. National guides can't see your soil, slope, access or local wages, so your quotes may land anywhere in it — or outside it in high-cost metros.`,
      r.diy
        ? `The DIY figure counts every post, board or panel, bag of concrete and bag of gravel for a straight ${fmt(L)}-ft run at October 2026 retail prices; fasteners, caps and hardware are listed in the material calculator but not priced.`
        : `For a materials-only estimate, price panels and posts at a local supplier; ${m.name.toLowerCase()} is sold as manufacturer systems, so parts don't mix across brands.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const L = 150;
  const examples = INSTALLED.map((m) => ({ m, r: run(valuesFor(m.id, L)) }));
  const wood = run(valuesFor("wood-privacy", 100));
  const takeoff = computeFence(standardFenceInput("privacy", [100], 6, []));
  const line = takeoff.posts.find((p) => p.kind === "line")!;
  return (
    <>
      <h2>What a fence costs per foot in 2026</h2>
      <p>
        Fence contractors quote by the linear foot, with gates and tear-out priced separately. These are national installed ranges from the most recent cost guides we could
        verify — the date is next to each, and older guides (Fixr&apos;s January 2025 pages) predate the 2026 jump in lumber and steel prices.
      </p>
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Installed per foot</th>
            <th>150 ft installed</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {examples.map(({ m, r }) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>
                ${m.perLf[0]}–${m.perLf[1]}
              </td>
              <td>{money(r.fence)}</td>
              <td>{m.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Homewyse&apos;s May 2026 national average to install a fence — modeled on a contractor-grade wood fence with 4×4 posts in concrete — is{" "}
        {`$${HOMEWYSE_ALL_PER_LF[0]}–$${HOMEWYSE_ALL_PER_LF[1]}`} per foot, and its
        6-ft vinyl and chain-link figures sit above Modernize&apos;s ranges. Use the low end for short, simple, flat runs and the high end for tall fences, hard digging and premium
        materials.
      </p>

      <h2>What moves the price within a material</h2>
      <p>Fixr&apos;s January 2025 guides break the ranges down further — older numbers, but they show how much each choice matters:</p>
      <table>
        <thead>
          <tr>
            <th>Choice</th>
            <th>Installed per foot</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Wood: pressure-treated pine or spruce</td>
            <td>$10–$25</td>
          </tr>
          <tr>
            <td>Wood: cedar</td>
            <td>$15–$30</td>
          </tr>
          <tr>
            <td>Wood: shadowbox style</td>
            <td>$17–$35</td>
          </tr>
          <tr>
            <td>Chain link, 4 ft, 9-gauge galvanized</td>
            <td>$13.15–$23.50</td>
          </tr>
          <tr>
            <td>Chain link, 6 ft, 9-gauge galvanized</td>
            <td>$15.25–$25.40</td>
          </tr>
          <tr>
            <td>Chain link, 4 ft, vinyl-coated</td>
            <td>$18.75–$40.50</td>
          </tr>
          <tr>
            <td>Vinyl privacy</td>
            <td>$35–$60</td>
          </tr>
        </tbody>
      </table>
      <p>
        Species and coating move the price more than height does: going from 4 ft to 6 ft of galvanized chain link adds only about $2 per foot, while vinyl coating adds up to
        $17 per foot at the high end.
      </p>

      <h2>DIY or hire a pro?</h2>
      <p>
        Labor is a big share of the bill: Modernize puts installation labor alone at ${LABOR_PER_LF[0]}–${LABOR_PER_LF[1]} per foot. Our own takeoff for 100 ft of 6-ft
        pressure-treated privacy fence — about {fmtMoney(wood.diy?.materials ?? 0)} of posts, pickets, rails, concrete and gravel — compares with {money(wood.total)} installed.
        The savings are real, but so is the work: {takeoff.layout.posts} holes dug {line.holeDepthIn} in deep, {line.bagsEach} bags of concrete per post and{" "}
        {takeoff.pickets?.withWaste} pickets to hang. The{" "}
        <Link href="/fence/fence-calculator">fence calculator</Link> and <Link href="/fence/chain-link-fence-calculator">chain link calculator</Link> list every part with prices you
        can edit.
      </p>

      <h2>Add-ons that change the total</h2>
      <ul>
        <li>
          <strong>Gates:</strong> a wood walk-through gate runs about $150–$250 installed (Bob Vila, 2024); chain-link single gates $90–$250 and double drive gates $180–$500;
          vinyl gates anywhere from $200 to $2,200 depending on size and style (Fixr, 2025).
        </li>
        <li>
          <strong>Removing the old fence:</strong> ${REMOVAL_PER_LF[0]}–${REMOVAL_PER_LF[1]} per foot (Fixr).
        </li>
        <li>
          <strong>Staining:</strong> professionals charge ${PRO_STAIN_PER_SQFT[0]}–${PRO_STAIN_PER_SQFT[1]} per square foot of fence face (Homewyse, May 2026). A 100-ft, 6-ft
          fence stained on both sides is 1,200 sq ft. New pressure-treated wood needs to dry first — 30 days per Thompson&apos;s, 2–3 months per Ready Seal.
        </li>
        <li>
          <strong>Height:</strong> taller fences need longer posts, deeper holes and longer boards, and under IRC-based codes fences over 7 ft need a building permit.
        </li>
      </ul>

      <h2>Why prices went up in 2026</h2>
      <p>
        Producer prices rose sharply between September 2025 and September 2026 (BLS, via FRED): softwood lumber +{PPI_YOY.softwood.pct}%, fabricated wire products (chain-link
        fabric and ties) +{PPI_YOY.wire.pct}%, aluminum extrusions +{PPI_YOY.aluminum.pct}%, plastic construction products (vinyl) +{PPI_YOY.plastic.pct}% and treated wood +
        {PPI_YOY.treated.pct}%. Guides written before 2026 understate materials, especially for cedar, aluminum and chain link.
      </p>

      <h2>How to compare quotes</h2>
      <ul>
        <li>Divide each quote by the total length to get a price per foot, then compare it with the range above — the calculator does this for you.</li>
        <li>Ask for materials, labor, gates, removal and haul-away as separate lines, and confirm post size, post depth and whether every post is set in concrete.</li>
        <li>Check who calls 811 and who confirms the property line; a survey may be needed if the line isn&apos;t clearly marked.</li>
        <li>Ask about permits and HOA approval before anything is ordered.</li>
      </ul>
      <p>
        Popular comparisons: <Link href={`${BASE}/150-ft-wood-privacy`}>150 ft privacy fence</Link>, <Link href={`${BASE}/150-ft-vinyl`}>vinyl vs wood for 150 ft</Link>,{" "}
        <Link href={`${BASE}/200-ft-chain-link`}>200 ft chain link</Link>.
      </p>
    </>
  );
}

const W150 = run(valuesFor("wood-privacy", 150));
const W100 = run(valuesFor("wood-privacy", 100));
const V150 = run(valuesFor("vinyl", 150));
const PER_FT = INSTALLED.filter((m) => ["wood-privacy", "vinyl", "chain-link", "aluminum"].includes(m.id))
  .map((m) => `${m.name.toLowerCase()} $${m.perLf[0]}–$${m.perLf[1]}`)
  .join(", ");

export const fenceCostCalculator: CalculatorEntry<FenceCostValues> = {
  meta: {
    slug: SLUG,
    category: "fence",
    name: "Fence Cost Calculator",
    shortName: "Fence cost",
    h1: "Fence Cost Calculator: Installed Price per Foot (2026)",
    metaTitle: "Fence Cost Calculator: Price per Foot by Material (2026)",
    metaDescription: `Installed fence cost by material with gates, removal and staining. 150 ft of wood privacy runs ${money(W150.fence)} at $15–$45/ft; compare DIY materials and quotes.`,
    summary: "Enter your fence length and material to see the installed price range, gates, tear-out and staining, a DIY materials comparison and how a contractor's quote stacks up.",
    outputs: ["Installed range", "Cost per foot", "DIY vs pro", "All materials compared", "Quote check"],
    faq: [
      {
        q: "How much does a 150 ft privacy fence cost?",
        a: `About ${money(W150.fence)} installed for wood at $15–$45 per foot (Modernize, Aug 2026); Modernize's own 150-ft wood example is $3,750–$6,750. Vinyl runs ${money(V150.fence)}. Gates and removal are extra.`,
      },
      {
        q: "What is the cost per linear foot to install a fence?",
        a: `Typical 2026 installed ranges: ${PER_FT} per foot (Modernize, Aug 2026). Homewyse's May 2026 national average, modeled on a contractor-grade wood fence, is $33.48–$53.87 per foot.`,
      },
      {
        q: "Is it cheaper to build a fence yourself?",
        a: `Usually, because labor is $5–$15 per foot. Materials for 100 ft of 6-ft pressure-treated privacy fence come to about ${fmtMoney(W100.diy?.materials ?? 0)} at October 2026 prices, versus ${money(W100.total)} installed.`,
      },
      { q: "How much does it cost to remove an old fence?", a: "About $2 to $5 per linear foot for tear-out and haul-away (Fixr), so $200–$500 for 100 ft." },
      {
        q: "How much does a fence gate cost?",
        a: "Installed: about $150–$250 for a wood walk-through gate, $90–$250 for a chain-link single gate and $180–$500 for a chain-link double drive gate. Vinyl gates range from $200 to $2,200.",
      },
      {
        q: "Is vinyl or wood fence cheaper?",
        a: `Wood is cheaper up front: $15–$45 per foot installed versus $25–$60 for vinyl (Modernize, Aug 2026). For 150 ft that is ${money(W150.fence)} for wood and ${money(V150.fence)} for vinyl; vinyl needs no staining.`,
      },
      {
        q: "How much does it cost to stain a fence?",
        a: "Professional staining runs $1.33–$2.71 per square foot of fence face (Homewyse, May 2026). A 100-ft, 6-ft fence stained on both sides is 1,200 sq ft, or about $1,596–$3,252.",
      },
    ],
    sources: FENCE_COST_SOURCES,
    related: ["fence/fence-calculator", "fence/chain-link-fence-calculator", "concrete/post-hole-calculator", "paint/deck-stain-calculator"],
    updated: FENCE_CHECKED,
    keywords: ["fence cost", "fence installation cost", "cost per linear foot", "privacy fence cost", "vinyl fence cost", "chain link fence cost", "fence quote"],
  },
  Calculator: FenceCostCalculator,
  Content,
  presets: FENCE_COST_PRESETS,
  presetAnswer,
};
