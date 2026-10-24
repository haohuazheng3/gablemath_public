import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeColumns, tubeCuftPerFt } from "./compute";
import { BAG_YIELD_CUFT, CONCRETE_CHECKED, FORM_TUBE_PRICE, QUIKTUBE_TABLE, SONOCO_4FT, TUBE_DIAMETERS, TUBE_RULES, concreteSources } from "./data";
import ColumnCalculator from "./ColumnCalculator";
import { COLUMN_DEFAULTS, columnInputFrom, type ColumnValues } from "./column-model";

const SLUG = "column-calculator";
const BASE = `/concrete/${SLUG}`;

const run = (v: ColumnValues) => computeColumns(columnInputFrom(v));
const per = (r: ReturnType<typeof run>, size: 60 | 80) => r.perColumn.find((x) => x.size === size)!;
/** "an 8 in", "an 18 in", "a 12 in" */
const an = (n: number) => (/^(8|11|18)(\D|$)/.test(String(n)) ? "an" : "a");

/* ───────── programmatic presets ───────── */

type Spec = { slug: string; group: string; label: string; h1: string; values: Partial<ColumnValues>; note: string };

const SIZE_NOTES: Record<number, string> = {
  6: "6 in tubes suit light loads — Quik-Tube lists mailboxes, lamps and fence posts among its uses.",
  8: "8 in tubes suit light deck piers and porch-rail posts.",
  10: "10 in tubes leave room around a 4×4 or 6×6 post base and its anchor.",
  12: "12 in tubes are used for larger decks, pergolas and carport posts.",
  14: "14 in tubes suit heavier deck posts and short porch columns.",
  16: "16 in columns carry porch roofs, heavy pergolas and pole-barn posts.",
  18: "18 in tubes are used for large porch columns and heavily loaded piers.",
  24: "24 in forms are structural columns — at this size the concrete is usually ordered by the yard.",
};

const SPECS: Spec[] = [
  ...[6, 8, 10, 12, 14, 16, 18, 24].map((dia) => ({
    slug: `${dia}-inch-4-ft`,
    group: "One tube, 4 ft",
    label: `${dia} in × 4 ft`,
    h1: `How much concrete for a ${dia} inch Sonotube 4 feet long?`,
    values: { dia, len: 4 },
    note: SIZE_NOTES[dia],
  })),
  { slug: "8-inch-2-ft", group: "Other lengths", label: "8 in × 2 ft", h1: "How many bags of concrete for an 8 inch tube 2 feet deep?", values: { dia: 8, len: 2 }, note: "Two feet suits fence-post sleeves and mailbox piers where frost is shallow." },
  { slug: "10-inch-3-ft", group: "Other lengths", label: "10 in × 3 ft", h1: "How much concrete for a 10 inch Sonotube 3 feet deep?", values: { dia: 10, len: 3 }, note: "A 3 ft pier works where the frost depth is 30 in or less." },
  { slug: "12-inch-3-ft", group: "Other lengths", label: "12 in × 3 ft", h1: "How much concrete for a 12 inch Sonotube 3 feet deep?", values: { dia: 12, len: 3 }, note: "A 12 in × 3 ft pier is common for decks in mild-winter regions." },
  { slug: "6-deck-footings-10-inch", group: "Deck footings", label: "6 × 10 in × 4 ft", h1: "How much concrete for 6 deck footings (10 inch tubes, 4 ft)?", values: { dia: 10, len: 4, count: 6 }, note: "Six piers is a typical 12×12 deck: two rows of three." },
  { slug: "9-deck-footings-12-inch", group: "Deck footings", label: "9 × 12 in × 4 ft", h1: "How much concrete for 9 deck footings (12 inch tubes, 4 ft)?", values: { dia: 12, len: 4, count: 9 }, note: "Nine 12 in piers in a 3 × 3 grid carry a 16×16 deck." },
  { slug: "8-footings-10-inch-with-footing", group: "Deck footings", label: "8 × 10 in on footings", h1: "How much concrete for 8 Sonotubes with footings?", values: { dia: 10, len: 4, count: 8, ftg: 6 }, note: "Quik-Tube's footing method: 2 in of gravel, a 6 in footing as wide as the hole (20 in), then the tube on top." },
  { slug: "4-pergola-footings-16-inch", group: "Deck footings", label: "4 × 16 in × 4 ft", h1: "How much concrete for 4 pergola footings (16 inch tubes)?", values: { dia: 16, len: 4, count: 4 }, note: "Four 16 in piers for a freestanding pergola or carport." },
];

function sameValues(a: ColumnValues, b: ColumnValues): boolean {
  return (Object.keys(COLUMN_DEFAULTS) as (keyof ColumnValues)[]).every((k) => a[k] === b[k]);
}

export const COLUMN_PRESETS: Preset<ColumnValues>[] = SPECS.map((s) => {
  const v: ColumnValues = { ...COLUMN_DEFAULTS, ...s.values };
  const r = run(v);
  const many = v.count > 1;
  return {
    slug: s.slug,
    values: v,
    group: s.group,
    label: s.label,
    h1: s.h1,
    metaTitle: many ? `Concrete for ${v.count} × ${v.dia} in Sonotubes: ${fmtInt(r.order.bags)} Bags` : `Concrete for ${an(v.dia)} ${v.dia} in Sonotube, ${v.len} ft: Bags & Cu Ft`,
    metaDescription: many
      ? `${v.count} × ${v.dia} in tubes ${v.len} ft long${v.ftg ? " on footings" : ""} take ${fmt(r.order.cuftNet, 1)} cu ft — ${fmtInt(r.order.bags)} × 80-lb bags with 10% extra (${fmt(per(r, 80).exact, 1)} per tube).`
      : `${an(v.dia) === "an" ? "An" : "A"} ${v.dia} in × ${v.len} ft Sonotube holds ${fmt(r.cuftPerColumn, 2)} cu ft: ${per(r, 80).whole} × 80-lb or ${per(r, 60).whole} × 60-lb bags. Checked against Quik-Tube and Sonoco tables.`,
  };
});

function presetAnswer(v: ColumnValues): PresetAnswer {
  const r = run(v);
  const o = r.order;
  const spec = SPECS.find((s) => sameValues({ ...COLUMN_DEFAULTS, ...s.values }, v));
  const many = v.count > 1;
  const p80 = per(r, 80);
  const p60 = per(r, 60);
  const perFt = tubeCuftPerFt(v.dia);
  const tubePrice = r.tubes.lengthFt === TUBE_RULES.stockLengthFt ? FORM_TUBE_PRICE[v.dia] : undefined;
  const maker = !r.footingCuft
    ? [r.quikTube ? `Quik-Tube's data sheet lists ${r.quikTube[80]} × 80-lb or ${r.quikTube[60]} × 60-lb` : "", r.sonoco ? `Sonoco's table lists ${r.sonoco[80]} × 80-lb or ${r.sonoco[60]} × 60-lb` : ""].filter(Boolean)
    : [];

  return {
    headline: many
      ? `${v.count} × ${v.dia} in Sonotubes ${fmt(v.len, 1)} ft long${v.ftg ? ` on ${fmt(v.ftg, 0)} in footings` : ""} need ${fmt(o.cuftNet, 1)} cu ft of concrete — ${fmtInt(o.bags)} × 80-lb bags with 10% extra.`
      : `${an(v.dia) === "an" ? "An" : "A"} ${v.dia} in Sonotube ${fmt(v.len, 1)} ft long holds ${fmt(r.cuftPerColumn, 2)} cu ft of concrete — ${p80.whole} × 80-lb bags or ${p60.whole} × 60-lb bags.`,
    bullets: [
      `${an(v.dia) === "an" ? "An" : "A"} ${v.dia} in tube holds ${fmt(perFt, 3)} cu ft per foot: π × (${v.dia} ÷ 24 ft)² = ${fmt(perFt, 3)}; × ${fmt(v.len, 1)} ft = ${fmt(r.tubeCuft, 2)} cu ft.`,
      r.footingCuft ? `Each ${fmt(r.footingDiaIn, 0)} in × ${fmt(v.ftg, 0)} in footing adds ${fmt(r.footingCuft, 2)} cu ft, for ${fmt(r.cuftPerColumn, 2)} cu ft per column.` : "",
      maker.length ? `${maker.join("; ")} per 4 ft tube — our ${p80.whole} / ${p60.whole} come from the same geometry.` : "",
      many ? `For ${v.count} columns with 10% extra: ${fmtInt(o.bags)} × 80-lb bags (${fmtInt(o.weightLb)} lb)${o.bagCost != null ? `, about ${fmtMoney(o.bagCost)}` : ""}.` : `Buy ${fmtInt(o.bags)} × 80-lb bags with the usual 10% cushion${o.bagCost != null ? ` (about ${fmtMoney(o.bagCost)})` : ""}.`,
      `Dig a ${fmt(r.holeDiaIn, 0)} in hole (twice the tube) and buy ${fmtInt(r.tubes.buy)} × ${r.tubes.lengthFt} ft tube${r.tubes.buy === 1 ? "" : "s"}${tubePrice != null ? ` (about ${fmtMoney(tubePrice * r.tubes.buy)})` : ""}${r.tubes.perTube > 1 ? `, cutting ${r.tubes.perTube} columns from each` : ""}.`,
      spec?.note ?? "",
    ].filter(Boolean),
    table: {
      caption: `${v.dia} in tube${many ? `s (× ${v.count})` : ""} at other lengths`,
      columns: ["Length", "Cu ft per tube", "80-lb per tube", "60-lb per tube", ...(many ? [`80-lb for ${v.count} (+10%)`] : [])],
      rows: [2, 3, 4, 5, 6, 8].map((len) => {
        const x = run({ ...v, len });
        return [`${len} ft${len === v.len ? " ←" : ""}`, fmt(x.cuftPerColumn, 2), fmtInt(per(x, 80).whole), fmtInt(per(x, 60).whole), ...(many ? [fmtInt(x.order.bags)] : [])];
      }),
    },
    notes: [
      `Round forms are cylinders: area = π × radius². ${an(v.dia) === "an" ? "An" : "A"} ${v.dia} in tube has a ${fmt(v.dia / 2, 1)} in radius, so π × ${fmt(v.dia / 2, 1)}² = ${fmt(Math.PI * (v.dia / 2) ** 2, 1)} sq in ÷ 144 = ${fmt(perFt, 3)} sq ft. Multiply by the length in feet for cubic feet.`,
      `${fmt(r.cuftPerColumn, 2)} cu ft ÷ ${BAG_YIELD_CUFT[80]} cu ft per 80-lb bag = ${fmt(p80.exact, 2)}, and ÷ ${BAG_YIELD_CUFT[60]} per 60-lb bag = ${fmt(p60.exact, 2)}. Tube tables round each tube up${p80.whole - p80.exact > 0.6 ? ` — here that leaves most of a bag over, so on several tubes round the total instead` : ""}.`,
      o.cuydWithWaste >= 1
        ? `At ${fmt(o.cuydWithWaste, 2)} yd³ with waste, ready-mix (about ${fmtMoney(o.readyMixCost)} for ${fmt(o.readyMixYd, 2)} yd³ with fees) ${o.cheaper === "ready-mix" ? "beats bags" : "still costs more than bags"} — and a chute fills tubes in minutes.`
        : `At ${fmt(o.cuydWithWaste, 2)} yd³ this is a bag job: a truck's 1 yd minimum plus fees would cost about ${fmtMoney(o.readyMixCost)}.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const twelve = run({ ...COLUMN_DEFAULTS, dia: 12, len: 4 });
  return (
    <>
      <h2>How to calculate concrete for a Sonotube</h2>
      <p>
        A round form is a cylinder, so the volume is <strong>π × radius² × length</strong>. With the diameter in inches and the length in feet: <strong>cu ft = π × (diameter ÷ 24)² × length</strong>.
        Divide by the bag yield — 0.60 cu ft for an 80-lb bag, 0.45 for a 60-lb bag — and round up.
      </p>
      <p>
        <strong>Worked example — a 12 in tube, 4 ft long:</strong> π × 0.5² × 4 = {fmt(twelve.tubeCuft, 2)} cu ft. That is {fmt(per(twelve, 80).exact, 2)} × 80-lb bags (buy {per(twelve, 80).whole}) or{" "}
        {fmt(per(twelve, 60).exact, 2)} × 60-lb bags (buy {per(twelve, 60).whole}). For several tubes, multiply first and round once.
      </p>

      <h2>Concrete per foot of tube</h2>
      <table>
        <thead>
          <tr>
            <th>Diameter</th>
            <th>Cu ft per ft</th>
            <th>80-lb bags per 4 ft</th>
            <th>60-lb bags per 4 ft</th>
          </tr>
        </thead>
        <tbody>
          {TUBE_DIAMETERS.map((d) => {
            const cuft = tubeCuftPerFt(d);
            return (
              <tr key={d}>
                <td>
                  <Link href={`${BASE}/${d}-inch-4-ft`}>{d} in</Link>
                </td>
                <td>{fmt(cuft, 3)}</td>
                <td>{Math.ceil((cuft * 4) / BAG_YIELD_CUFT[80] - 1e-9)}</td>
                <td>{Math.ceil((cuft * 4) / BAG_YIELD_CUFT[60] - 1e-9)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>What the tube makers say</h2>
      <p>
        Quikrete&apos;s Quik-Tube data sheet and Sonoco&apos;s Sonotube Builder&apos;s Tube page print bag counts for 4 ft of tube. They agree with the geometry except one cell: Sonoco rounds a 12 in tube up
        to 8 × 60-lb bags where the math (and Quik-Tube) says 7.
      </p>
      <table>
        <thead>
          <tr>
            <th>Tube, 4 ft</th>
            <th>Quik-Tube (60 / 80 lb)</th>
            <th>Sonoco (60 / 80 lb)</th>
          </tr>
        </thead>
        <tbody>
          {[6, 8, 10, 12, 16].map((d) => (
            <tr key={d}>
              <td>{d} in</td>
              <td>{QUIKTUBE_TABLE[d] ? `${QUIKTUBE_TABLE[d][60][3]} / ${QUIKTUBE_TABLE[d][80][3]}` : "—"}</td>
              <td>{SONOCO_4FT[d] ? `${SONOCO_4FT[d][60]} / ${SONOCO_4FT[d][80]}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Setting the tube</h2>
      <ul>
        <li>Dig a hole about {TUBE_RULES.holeTimesDia}× the tube diameter, set the tube and backfill around it so it stays put (Quik-Tube instructions).</li>
        <li>
          For a footing under the tube: about {TUBE_RULES.gravelIn} in of gravel, one vertical rebar driven into the center, then a 4–{TUBE_RULES.footingIn} in footing. Set the tube on the footing and fill it.
          The calculator adds the footing concrete when you switch it on.
        </li>
        <li>
          Builder&apos;s tubes are meant for use below grade and up to {TUBE_RULES.maxAboveGradeFt} ft above it. Brace them with a collar or frame once {TUBE_RULES.braceAboveFt} ft or more sticks up.
        </li>
        <li>Rod the concrete as you fill to remove air pockets (Quikrete says not to use a mechanical vibrator in Quik-Tubes), then set post bases or anchor bolts in the wet top.</li>
        <li>The bottom must sit at least 12 in below undisturbed ground (IRC R507.3.2 for decks) and below your frost depth.</li>
      </ul>

      <h2>How many tubes to buy</h2>
      <p>
        Tubes are sold in {TUBE_RULES.stockLengthFt} ft lengths at home centers, with 10 and 12 ft lengths in some regions. Cut short piers from one tube: two 2 ft piers come out of a single 4 ft tube, so
        the calculator rounds the tube count for the whole job, not per pier. Home Depot listed Sakrete 48 in tubes at {fmtMoney(FORM_TUBE_PRICE[8])} for 8 in and {fmtMoney(FORM_TUBE_PRICE[10])} for 10 in
        in July 2026; larger diameters cost more. A pier longer than 4 ft should come from one long tube rather than two short ones stacked.
      </p>

      <h2>Bags or a truck for a row of piers?</h2>
      <p>
        A single tube is a bag job. A deck&apos;s worth adds up fast: nine 12 in tubes 4 ft long hold {fmt(NINE.order.cuftNet, 1)} cu ft, or {fmtInt(NINE.order.bags)} × 80-lb bags with 10% extra —{" "}
        {fmtInt(NINE.order.weightLb)} lb to lift and pour through a tube opening. Ready-mix is sold by the quarter yard with a 1 yd minimum, so the same job is a {fmt(NINE.order.readyMixYd, 2)} yd³ order at
        about {fmtMoney(NINE.order.readyMixCost)} with fees, against {NINE.order.bagCost != null ? fmtMoney(NINE.order.bagCost) : "—"} in bags. Ask whether the truck&apos;s chute can reach every hole; a
        wheelbarrow and a bucket work for the rest. Mixing your own? 60-lb bags are easier to lift to chest height over a tall tube, at about one more bag per 4 ft of 12 in tube.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Ordering by the tube length instead of the concrete length — only the filled part counts.</li>
        <li>Rounding each tube up and buying a pile of extra bags: for many tubes, round the total.</li>
        <li>Forgetting the footing under the tube; a wide footing often holds more concrete than the tube itself.</li>
        <li>Letting a tall tube drift out of plumb while filling — brace it first.</li>
      </ul>
      <p>
        Square pads instead of tubes? Use the <Link href="/concrete/footing-calculator">footing calculator</Link>. Setting posts directly in concrete? See the{" "}
        <Link href="/concrete/post-hole-calculator">post hole calculator</Link>.
      </p>
    </>
  );
}

const TWELVE = run({ ...COLUMN_DEFAULTS, dia: 12, len: 4 });
const NINE = run({ ...COLUMN_DEFAULTS, dia: 12, len: 4, count: 9 });
const TEN_DECK = run({ ...COLUMN_DEFAULTS, dia: 10, len: 4, count: 10 });

export const columnCalculator: CalculatorEntry<ColumnValues> = {
  meta: {
    slug: SLUG,
    category: "concrete",
    name: "Sonotube & Column Concrete Calculator",
    shortName: "Sonotubes & columns",
    h1: "Sonotube Concrete Calculator",
    metaTitle: "Sonotube Concrete Calculator: Bags per Tube",
    metaDescription: `A 12 in Sonotube 4 ft long holds ${fmt(TWELVE.tubeCuft, 2)} cu ft — ${per(TWELVE, 80).whole} × 80-lb or ${per(TWELVE, 60).whole} × 60-lb bags. Any tube size, length and count, checked against maker tables.`,
    summary: "Enter the tube diameter, length and how many you need to get bags per tube and for the job, an optional footing underneath, and a check against Quik-Tube and Sonoco's own tables.",
    outputs: ["Bags per tube", "Total bags & yards", "Maker table check", "Tubes & footing"],
    faq: [
      { q: "How many bags of concrete for a 12 inch Sonotube?", a: `A 12 in tube holds ${fmt(tubeCuftPerFt(12), 3)} cu ft per foot, so 4 ft is ${fmt(TWELVE.tubeCuft, 2)} cu ft: ${per(TWELVE, 80).whole} × 80-lb bags or ${per(TWELVE, 60).whole} × 60-lb bags. Quik-Tube's data sheet says the same; Sonoco's table rounds up to 8 × 60-lb.` },
      { q: "How much concrete per foot of Sonotube?", a: `Cu ft per foot = π × (diameter in inches ÷ 24)². That is ${fmt(tubeCuftPerFt(8), 2)} for 8 in, ${fmt(tubeCuftPerFt(10), 2)} for 10 in, ${fmt(tubeCuftPerFt(12), 2)} for 12 in, ${fmt(tubeCuftPerFt(16), 2)} for 16 in and ${fmt(tubeCuftPerFt(18), 2)} for 18 in.` },
      { q: "How big should the hole be for a Sonotube?", a: "Quikrete's Quik-Tube instructions say to dig a hole twice the tube's diameter — 20 in for a 10 in tube — then backfill around the tube to hold it in place." },
      { q: "How far can a Sonotube stick out of the ground?", a: "Builder's-grade tubes like Sonotube Builder's Tube and Quik-Tube are rated for use below grade and up to 3 ft above it. Brace the tube once 2 ft or more is above ground." },
      { q: "Do I need a footing under a Sonotube?", a: "Often yes — the footing spreads the post load. Quikrete's method is 2 in of gravel, a rebar driven in the center and a 4–6 in footing as wide as the hole. Deck footing sizes come from IRC Table R507.3.1, at least 12 in below grade." },
      { q: "How many bags of concrete for 10 deck footings?", a: `Ten 10 in tubes 4 ft long hold ${fmt(TEN_DECK.order.cuftNet, 1)} cu ft — ${fmtInt(TEN_DECK.order.bags)} × 80-lb bags with 10% extra, about ${fmtInt(TEN_DECK.order.weightLb)} lb.` },
    ],
    sources: concreteSources("quikTube", "sonotube", "tubePrice", "qk1101", "retail", "readyMix", "ircFootings"),
    related: ["concrete/footing-calculator", "concrete/post-hole-calculator", "concrete/slab-calculator", "concrete/concrete-weight-calculator"],
    updated: CONCRETE_CHECKED,
    keywords: ["sonotube calculator", "concrete form tube", "quik-tube", "deck footing", "pier", "column", "cylinder concrete", "how many bags of concrete for a sonotube"],
  },
  Calculator: ColumnCalculator,
  Content,
  presets: COLUMN_PRESETS,
  presetAnswer,
};
