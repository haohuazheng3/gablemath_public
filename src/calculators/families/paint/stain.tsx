import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeStain, packText } from "./compute";
import { OLYMPIC_GUIDE, PAINT_CHECKED, STAINS, paintSources, stain } from "./data";
import StainCalculator from "./StainCalculator";
import { STAIN_DEFAULTS, stainInputFrom, type StainValues } from "./stain-model";

const SLUG = "deck-stain-calculator";
const BASE = `/paint/${SLUG}`;
const run = (v: StainValues) => computeStain(stainInputFrom(v));
const label = (id: string) => {
  const p = stain(id);
  return p.brand === "Any brand" ? p.name : `${p.brand} ${p.name}`;
};

/* ───────── presets: deck sizes + the classic fence question ───────── */

const DECK_NOTES: Record<string, string> = {
  "10x10": "A 10×10 deck is a small landing or grill deck. Here the railings take more stain than the floor — leave them out and the stain need drops by more than half.",
  "12x12": "12×12 fits a table for four. With railings on three sides, the balusters still take more stain than the floor boards.",
  "12x16": "12×16 is the deck size Sherwin-Williams uses in its own worked example: 44 ft of balustered railing on three sides.",
  "16x20": "A 16×20 deck holds dining and lounge areas. Even at this size the balustered railing takes about as much stain as the floor, and a pump sprayer plus back-brushing saves real time.",
};

const DECKS: [number, number][] = [
  [10, 10],
  [12, 12],
  [12, 16],
  [16, 20],
];

/** Railing on the three open sides (one long side against the house): length + 2 × width. */
const deckValues = (l: number, w: number): StainValues => ({ ...STAIN_DEFAULTS, mode: "deck", dl: l, dw: w, railLf: l + 2 * w });
const FENCE: StainValues = { ...STAIN_DEFAULTS, mode: "fence", fl: 100, fh: 6, sides: 2, style: "privacy" };

export const STAIN_PRESETS: Preset<StainValues>[] = [
  ...DECKS.map(([l, w]) => {
    const v = deckValues(l, w);
    const r = run(v);
    return {
      slug: `${l}x${w}-deck`,
      values: v,
      group: "Deck sizes",
      label: `${l}×${w} deck`,
      h1: `How much stain do I need for a ${l}×${w} deck?`,
      metaTitle: `Stain for a ${l}x${w} Deck: Gallons With Railings`,
      metaDescription: `A ${l}×${w} deck with railings and 3 steps is ${fmtInt(r.totalSqFt)} sq ft of wood: ${fmt(r.gallons, 2)} gal for 2 coats of semi-transparent stain — buy ${packText(r.pack)}.`,
    };
  }),
  (() => {
    const r = run(FENCE);
    return {
      slug: "100-ft-6-ft-privacy-fence",
      values: FENCE,
      group: "Fences",
      label: "100 ft of 6 ft privacy fence",
      h1: "How much stain for 100 feet of 6-foot privacy fence?",
      metaTitle: "Stain for 100 ft of 6 ft Privacy Fence: Gallons",
      metaDescription: `100 ft of 6-ft privacy fence is 600 sq ft a side. Both sides take ${fmt(r.gallons, 0)} gal for 2 coats of a 200 sq ft/gal stain; one-coat stains need about 8 gal.`,
    };
  })(),
];

function plansTable(v: StainValues, ids: string[]) {
  return ids.map((id) => {
    const p = stain(id);
    const x = run({ ...v, product: id, coats: p.coats });
    return [label(id), x.coats, `${fmt(x.gallons, 2)} gal`, packText(x.pack), fmtMoney(x.pack.cost)];
  });
}

function presetAnswer(v: StainValues): PresetAnswer {
  const r = run(v);
  if (v.mode === "fence") {
    const side = v.fl * v.fh;
    const rows = (
      [
        ["One side, weathered wood", { ...v, sides: 1 }],
        ["Both sides, weathered wood", v],
        ["Both sides, rough-sawn boards", { ...v, cond: "rough" }],
        ["Both sides, shadowbox style", { ...v, style: "shadowbox" }],
        ["Both sides, Ready Seal (one application)", { ...v, product: "ready-seal", coats: 1 }],
      ] as [string, StainValues][]
    ).map(([name, x]) => {
      const q = run(x);
      return [name, fmtInt(q.totalSqFt), `${fmt(q.gallons, 1)} gal`, packText(q.pack), fmtMoney(q.pack.cost)];
    });
    const rs = run({ ...v, product: "ready-seal", coats: 1 });
    return {
      headline: `${fmt(v.fl)} ft of ${fmt(v.fh)}-ft privacy fence is ${fmtInt(side)} sq ft per side — ${fmt(r.gallons, 1)} gallons to stain both sides with two coats of a typical semi-transparent stain (200 sq ft/gal).`,
      bullets: [
        `Area: ${fmt(v.fl)} ft × ${fmt(v.fh)} ft = ${fmtInt(side)} sq ft per side, ${fmtInt(r.totalSqFt)} sq ft for both.`,
        `Two coats at 200 sq ft/gal: ${fmtInt(r.totalSqFt)} × 2 ÷ 200 = ${fmt(r.gallons, 1)} gal → buy ${packText(r.pack)} (about ${fmtMoney(r.pack.cost)} at a typical price).`,
        `A one-coat stain cuts that sharply: Ready Seal rates weathered wood at 150 sq ft/gal for its full application, so both sides take ${fmt(rs.gallons, 1)} gal.`,
        "Rough-sawn pickets soak up more: Ready Seal rates rough cedar at 125 sq ft/gal vs 150 smooth, and we plan rough boards at that same ratio.",
        "Posts and back rails are not counted separately — the flat face area covers them approximately. On a shadowbox or board-on-board fence the overlaps add an estimated 15–30%.",
      ],
      table: { caption: `Stain for ${fmt(v.fl)} ft of ${fmt(v.fh)}-ft fence`, columns: ["Plan", "Sq ft", "Stain", "Buy", "Cost"], rows },
      notes: ["A pump or airless sprayer is the fast way to stain a long fence; add about 25% for overspray and back-brush while it is wet. Stain the side facing the neighbor only with their agreement."],
    };
  }
  const floor = run({ ...v, railings: false, steps: 0 });
  return {
    headline: `A ${fmt(v.dl)}×${fmt(v.dw)} ft deck with railings and ${v.steps} steps is ${fmtInt(r.totalSqFt)} sq ft of wood — ${fmt(r.gallons, 2)} gallons for two coats of semi-transparent stain, so buy ${packText(r.pack)}.`,
    bullets: [
      `Floor: ${fmt(v.dl)} × ${fmt(v.dw)} = ${fmtInt(r.floorSqFt)} sq ft. Railing: ${fmt(v.railLf)} ft × ${fmt(v.railH)} ft × 2.0 for balusters = ${fmtInt(r.railSqFt)} sq ft. Stairs: ${v.steps} steps × ${fmt(v.stairW)} ft × (11 in tread + 7¾ in riser) = ${fmtInt(r.stairSqFt)} sq ft.`,
      `Two coats at 200 sq ft/gal on weathered wood: ${fmtInt(r.totalSqFt)} × 2 ÷ 200 = ${fmt(r.gallons, 2)} gal → ${packText(r.pack)} (about ${fmtMoney(r.pack.cost)}).`,
      `Floor only (no railings or stairs): ${fmt(floor.gallons, 2)} gal — buy ${packText(floor.pack)}.`,
      `Sherwin-Williams' deck calculator (250 sq ft/gal) says ${fmt(r.sw.total, 1)} gal for two coats${r.olympic ? `; Olympic's rule of thumb says ${r.olympic} for this area` : ""}.`,
      DECK_NOTES[`${v.dl}x${v.dw}`] ?? "",
    ].filter(Boolean),
    table: {
      caption: `Stain for this ${fmt(v.dl)}×${fmt(v.dw)} deck by product type (each at its label coats)`,
      columns: ["Stain", "Coats", "Gallons", "Buy", "Cost"],
      rows: plansTable(v, ["thompsons-clear", "typical-semi", "ready-seal", "behr-solid", "cabot-deckcorrect"]),
    },
    notes: ["Many semi-transparent stains are one-coat products — a second coat sits on top and peels. Check the can before buying for two coats."],
  };
}

/* ───────── long-form content ───────── */

const SHOWN = ["thompsons-clear", "cabot-semi", "olympic-elite-semi", "behr-semi", "sw-superdeck-semi", "ready-seal", "valspar-one-coat", "behr-solid", "sw-woodscapes-solid", "cabot-deckcorrect"];
const range = (r: readonly [number, number]) => (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`);

function Content() {
  const ex = run(STAIN_DEFAULTS);
  return (
    <>
      <h2>How to work out how much deck stain you need</h2>
      <p>Add up every surface the stain goes on, multiply by the number of coats, and divide by the stain&apos;s spread rate for your wood:</p>
      <ul>
        <li>
          <strong>Deck floor:</strong> length × width.
        </li>
        <li>
          <strong>Railings:</strong> length × height × 2.0 with balusters (each spindle has four faces), or × 0.6 for an open rail — the factors Sherwin-Williams&apos; deck calculator
          uses.
        </li>
        <li>
          <strong>Stairs:</strong> steps × stair width × 1.56 ft (an 11-in tread of two 2×6 boards plus a 7¾-in riser).
        </li>
        <li>
          <strong>Fence:</strong> length × height × sides.
        </li>
      </ul>
      <p>
        <strong>Worked example — a 12×16 deck with 44 ft of 3-ft balustered railing and 3 steps, 4 ft wide:</strong> 192 + 264 + {fmt(ex.stairSqFt, 1)} = {fmtInt(ex.totalSqFt)} sq ft. Two
        coats of a semi-transparent stain at 200 sq ft per gallon: {fmtInt(ex.totalSqFt)} × 2 ÷ 200 = {fmt(ex.gallons, 2)} gallons, so buy {packText(ex.pack)}.
      </p>

      <h2>Stain for common deck sizes</h2>
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Wood area</th>
            <th>Two coats</th>
            <th>Buy</th>
          </tr>
        </thead>
        <tbody>
          {STAIN_PRESETS.map((p) => {
            const r = run(p.values);
            return (
              <tr key={p.slug}>
                <td>
                  <Link href={`${BASE}/${p.slug}`}>{p.label}</Link>
                </td>
                <td>{fmtInt(r.totalSqFt)} sq ft</td>
                <td>{fmt(r.gallons, 2)} gal</td>
                <td>{packText(r.pack)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>Decks include railings on three sides and 3 steps; the fence is stained on both sides.</p>

      <h2>Coverage by stain</h2>
      <p>
        Stain coverage swings far more than paint: thin toners spread widely on new wood, while a thick resurfacer like Cabot DeckCorrect covers about 75 sq ft per gallon for its two required coats. Weathered, gray wood is thirsty,
        so we plan at the low end of each range; on new, smooth boards we use the middle.
      </p>
      <table>
        <thead>
          <tr>
            <th>Stain</th>
            <th>First coat (sq ft/gal)</th>
            <th>Coats</th>
          </tr>
        </thead>
        <tbody>
          {STAINS.filter((s) => SHOWN.includes(s.id)).map((s) => (
            <tr key={s.id}>
              <td>
                {s.brand} {s.name}
              </td>
              <td>
                {s.byCondition ? `${s.byCondition.new} new / ${s.byCondition.weathered} weathered / ${s.byCondition.rough} rough` : range(s.coat1)}
                {s.coat2 ? `; 2nd coat ${range(s.coat2)}` : ""}
              </td>
              <td>{s.coatsNote}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>One coat or two?</h2>
      <p>
        Follow the can. Many semi-transparent and toner stains are one-coat products, and a second coat that can&apos;t soak in stays on the surface and peels. Solid stains and some
        semi-transparents call for two thin coats — and the second often spreads further: Behr rates its semi-transparent at 300 sq ft per gallon for the first coat and 500 for the
        second.
      </p>

      <h2>Rough-sawn and weathered wood</h2>
      <p>
        Rough fence boards and old decks absorb far more stain. Ready Seal rates rough cedar at 125 sq ft per gallon against 150 for smooth, and Sherwin-Williams rates SuperDeck at
        350 on smooth wood but 100–200 on rough or porous wood. New lumber needs time to dry first — Ready Seal asks for 12% moisture or less.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Counting only the deck floor. Balustered railings can take as much stain as the floor itself.</li>
        <li>Trusting a quick rule of thumb: Olympic&apos;s guide ({OLYMPIC_GUIDE.map((g) => `${g.label} up to ${g.maxSqFt} sq ft`).join(", ")}) ignores coats and wood condition.</li>
        <li>Staining over dirt, mildew or failing old coatings — clean and, if needed, strip first.</li>
        <li>Staining in direct sun or before rain; check each product&apos;s minimum temperature.</li>
      </ul>
      <p>
        Building the fence first? Use the <Link href="/fence/fence-calculator">fence calculator</Link> and the{" "}
        <Link href="/concrete/post-hole-calculator">post hole concrete calculator</Link>. Painting the house next? Try the{" "}
        <Link href="/paint/exterior-paint-calculator">exterior paint calculator</Link>.
      </p>
    </>
  );
}

export const stainCalculator: CalculatorEntry<StainValues> = {
  meta: {
    slug: SLUG,
    category: "paint",
    name: "Deck Stain Calculator",
    shortName: "Decks & fences",
    h1: "Deck & Fence Stain Calculator",
    metaTitle: "Deck Stain Calculator: Gallons for Decks & Fences",
    metaDescription: "How much stain for your deck or fence, railings and stairs included. A 12×16 deck with railings takes 4.75 gal for 2 coats. Compare 20 stains by cost.",
    summary: "Enter your deck or fence size to get gallons of stain for the floor, railings and stairs — by product, coats and wood condition — plus the cheapest can mix, supplies and cost.",
    outputs: ["Gallons of stain", "Railings & stairs", "Product comparison", "Cost"],
    faq: [
      { q: "How much stain do I need for a 12x16 deck?", a: "The 192 sq ft floor alone takes about 2 gallons for two coats at 200 sq ft per gallon. With 44 ft of 3-ft balustered railing and 3 steps the total is 475 sq ft, or 4.75 gallons — buy 5." },
      { q: "How much stain for 100 feet of 6-foot privacy fence?", a: "Each side is 600 sq ft, so both sides are 1,200 sq ft. Two coats of a stain that covers 200 sq ft per gallon take 12 gallons; a one-coat stain such as Ready Seal (150 sq ft/gal on weathered wood) takes about 8." },
      { q: "How many square feet does a gallon of deck stain cover?", a: "Usually 150–400 sq ft per coat, depending on the stain and the wood. Weathered and rough-sawn wood soak up more: Sherwin-Williams SuperDeck covers 350 sq ft per gallon on smooth wood but 100–200 on rough or porous wood." },
      { q: "Does the second coat of stain use less?", a: "Often, yes. Behr rates its semi-transparent stain at 300 sq ft per gallon for the first coat and 500 for the second, and its solid stain at 200–400 then 400–800." },
      { q: "Should I put two coats of stain on my deck?", a: "Only if the label says so. Many semi-transparent stains (Cabot, Thompson's, Valspar One Coat) are one coat only; a second coat sits on the surface and peels. Solid stains usually call for two thin coats." },
      { q: "How do I count railings and stairs?", a: "Railing area is length × height × 2.0 with balusters, or × 0.6 for an open rail, the factors Sherwin-Williams uses. Each step adds its width × about 1.56 ft for the tread and riser." },
    ],
    sources: paintSources("swCalc", "swSuperDeck", "swWoodScapes", "bmWoodluxe", "behrSemi", "behrSolid", "olympicElite", "olympicSolid", "olympicGuide", "cabotSemi", "cabotSolid", "cabotAto", "cabotDeckCorrect", "thompsonsSemi", "thompsonsClear", "readySeal", "defy", "valsparOneCoat", "ircStairs", "sundries"),
    related: ["fence/fence-calculator", "paint/exterior-paint-calculator", "concrete/post-hole-calculator", "paint/paint-calculator", "lumber/deck-calculator", "lumber/baluster-spacing-calculator"],
    updated: PAINT_CHECKED,
    keywords: ["deck stain calculator", "fence stain calculator", "how much stain", "gallons of stain", "deck stain coverage", "semi-transparent stain"],
  },
  Calculator: StainCalculator,
  Content,
  presets: STAIN_PRESETS,
  presetAnswer,
};
