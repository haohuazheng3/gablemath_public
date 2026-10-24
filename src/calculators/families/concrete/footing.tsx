import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeFooting } from "./compute";
import { BAG_YIELD_CUFT, CONCRETE_CHECKED, IRC_FOOTING, IRC_FOOTING_TABLE, READY_MIX, concreteSources } from "./data";
import FootingCalculator from "./FootingCalculator";
import { FOOTING_DEFAULTS, footingInputFrom, type FootingValues } from "./footing-model";

const SLUG = "footing-calculator";
const BASE = `/concrete/${SLUG}`;

const run = (v: FootingValues) => computeFooting(footingInputFrom(v));
const bags60 = (r: ReturnType<typeof run>) => r.order.bagsBySize.find((b) => b.size === 60)?.bags ?? 0;

/* ───────── programmatic presets ───────── */

type Spec = { slug: string; group: string; label: string; h1: string; values: Partial<FootingValues>; note: string };

const SPECS: Spec[] = [
  {
    slug: "20-ft-12x6-inch",
    group: "Continuous footings",
    label: "20 ft, 12 × 6 in (IRC minimum)",
    h1: "How much concrete for a 20 ft footing, 12 x 6 inches?",
    values: { len: 20, w: 12, t: 6, wall: 8 },
    note: "12 × 6 in is the smallest footing the IRC allows (R403.1.1); Table R403.1(1) accepts it for a one-story slab-on-grade building even on 1,500 psf soil where the ground snow load is 50 psf or less.",
  },
  {
    slug: "20-ft-24x12-inch",
    group: "Continuous footings",
    label: "20 ft, 24 × 12 in (2 × 1 ft)",
    h1: "How much concrete for a 20 ft footing 2 ft wide and 1 ft deep?",
    values: { len: 20, w: 24, t: 12, wall: 8 },
    note: "A 2 ft × 1 ft footing holds four times the concrete per foot of the 12 × 6 in code minimum — the kind of size an engineer specifies for heavy walls, chimneys or soft soil.",
  },
  {
    slug: "40-ft-16x8-inch",
    group: "Continuous footings",
    label: "40 ft, 16 × 8 in",
    h1: "How much concrete for 40 feet of 16 x 8 inch footing?",
    values: { len: 40, w: 16, t: 8, wall: 8 },
    note: "40 ft of footing is a small addition, a sunroom, or one long garden wall.",
  },
  {
    slug: "80-ft-16x8-inch-20x20-garage",
    group: "Continuous footings",
    label: "20×20 garage: 80 ft, 16 × 8 in",
    h1: "How much concrete for a 20x20 garage footing?",
    values: { len: 80, w: 16, t: 8, wall: 8 },
    note: "A 20×20 ft garage has an 80 ft perimeter. Its slab is a separate pour — use the slab calculator for that.",
  },
  {
    slug: "88-ft-12x8-inch-20x24-garage",
    group: "Continuous footings",
    label: "20×24 garage: 88 ft, 12 × 8 in",
    h1: "How much concrete for a 20x24 garage footing (12 x 8 in)?",
    values: { len: 88, w: 12, t: 8, wall: 8 },
    note: "A 20×24 ft garage has an 88 ft perimeter; 12 × 8 in under an 8 in block wall leaves a 2 in projection each side, the IRC minimum.",
  },
  {
    slug: "96-ft-16x8-inch-24x24-garage",
    group: "Continuous footings",
    label: "24×24 garage: 96 ft, 16 × 8 in",
    h1: "How much concrete for a 24x24 garage footing?",
    values: { len: 96, w: 16, t: 8, wall: 8 },
    note: "A 24×24 ft garage has a 96 ft perimeter — big enough that ready-mix nearly always wins.",
  },
  {
    slug: "140-ft-20x10-inch",
    group: "Continuous footings",
    label: "30×40 building: 140 ft, 20 × 10 in",
    h1: "How much concrete for a 30x40 building footing (20 x 10 in)?",
    values: { len: 140, w: 20, t: 10, wall: 8 },
    note: "A 30×40 ft shop or house footprint has a 140 ft perimeter; 20 × 10 in leaves plenty of margin over the 12 × 6 in minimum for heavier loads or softer soil.",
  },
  {
    slug: "4-pads-12x12x12",
    group: "Pier & deck pads",
    label: "4 pads, 12×12×12 in",
    h1: "How much concrete for 4 deck footings 12x12x12?",
    values: { type: "pad", pads: 4, pl: 12, pw: 12, pt: 12 },
    note: "Four 12 in square, 12 in thick pads carry a small freestanding deck or a shed on piers.",
  },
  {
    slug: "6-pads-12x12x12",
    group: "Pier & deck pads",
    label: "6 pads, 12×12×12 in",
    h1: "How much concrete for 6 deck pier footings 12x12x12?",
    values: { type: "pad", pads: 6, pl: 12, pw: 12, pt: 12 },
    note: "Six pads — two rows of three — for a small ground-level deck.",
  },
  {
    slug: "9-pads-12x12x12",
    group: "Pier & deck pads",
    label: "9 pads, 12×12×12 in",
    h1: "How much concrete for 9 deck footings 12x12x12?",
    values: { type: "pad", pads: 9, pl: 12, pw: 12, pt: 12 },
    note: "Nine pads in a 3 × 3 grid, for a mid-size deck; the post spacing comes from your beam and joist spans.",
  },
  {
    slug: "8-pads-18x18x10",
    group: "Pier & deck pads",
    label: "8 pads, 18×18×10 in",
    h1: "How much concrete for 8 footings 18x18x10?",
    values: { type: "pad", pads: 8, pl: 18, pw: 18, pt: 10 },
    note: "18 in pads spread a post load over more soil — the direction IRC Table R507.3.1 pushes larger decks and weaker soils.",
  },
  {
    slug: "6-pads-24x24x12",
    group: "Pier & deck pads",
    label: "6 pads, 24×24×12 in",
    h1: "How much concrete for 6 footings 24x24x12?",
    values: { type: "pad", pads: 6, pl: 24, pw: 24, pt: 12 },
    note: "2 ft square pads suit carports, pavilions and heavy pergolas with large tributary areas.",
  },
  {
    slug: "4-pads-30x30x12",
    group: "Pier & deck pads",
    label: "4 pads, 30×30×12 in",
    h1: "How much concrete for 4 footings 30x30x12?",
    values: { type: "pad", pads: 4, pl: 30, pw: 30, pt: 12 },
    note: "A 30 in pad spreads a heavy post load — a large deck area per post, heavy snow or weak soil — over 6¼ sq ft of ground.",
  },
];

function sameValues(a: FootingValues, b: FootingValues): boolean {
  return (Object.keys(FOOTING_DEFAULTS) as (keyof FootingValues)[]).every((k) => a[k] === b[k]);
}

function describe(v: FootingValues): string {
  return v.type === "pad" ? `${v.pads} pads of ${fmt(v.pl, 1)}×${fmt(v.pw, 1)}×${fmt(v.pt, 1)} in` : `${fmt(v.len, 1)} ft of ${fmt(v.w, 1)} × ${fmt(v.t, 1)} in footing`;
}

export const FOOTING_PRESETS: Preset<FootingValues>[] = SPECS.map((s) => {
  const v: FootingValues = { ...FOOTING_DEFAULTS, ...s.values };
  const r = run(v);
  const pad = v.type === "pad";
  return {
    slug: s.slug,
    values: v,
    group: s.group,
    label: s.label,
    h1: s.h1,
    metaTitle: pad ? `Concrete for ${v.pads} Footings ${v.pl}x${v.pw}x${v.pt}: ${fmtInt(r.order.bags)} Bags` : `Concrete for ${v.len} ft of ${v.w}x${v.t} Footing: ${fmt(r.order.cuydNet, 2)} yd³`,
    metaDescription: `${describe(v)} = ${fmt(r.order.cuydNet, 2)} yd³ of concrete: ${fmtInt(r.order.bags)} × 80-lb bags with 10% extra, or ${fmt(r.order.readyMixYd, 2)} yd³ of ready-mix for about ${fmtMoney(r.order.readyMixCost)}.`,
  };
});

function presetAnswer(v: FootingValues): PresetAnswer {
  const r = run(v);
  const o = r.order;
  const pad = v.type === "pad";
  const spec = SPECS.find((s) => sameValues({ ...FOOTING_DEFAULTS, ...s.values }, v));
  const truckWins = o.cheaper === "ready-mix";

  const sizes = pad
    ? [
        [12, 12, 12],
        [18, 18, 10],
        [24, 24, 12],
        [30, 30, 12],
      ].map(([pl, pw, pt]) => ({ label: `${pl}×${pw}×${pt} in`, v: { ...v, pl, pw, pt } }))
    : [
        [12, 6],
        [12, 8],
        [16, 8],
        [20, 10],
        [24, 12],
      ].map(([w, t]) => ({ label: `${w} × ${t} in`, v: { ...v, w, t } }));

  return {
    headline: `${describe(v)} take${pad ? "" : "s"} ${fmt(o.cuydNet, 2)} cubic yards of concrete — ${fmtInt(o.bags)} × 80-lb bags with 10% extra, or ${fmt(o.readyMixYd, 2)} yd³ of ready-mix.`,
    bullets: [
      pad
        ? `Each pad: ${fmt(v.pl, 1)} × ${fmt(v.pw, 1)} × ${fmt(v.pt, 1)} in = ${fmt(r.cuftPerUnit, 2)} cu ft (${fmt(r.cuftPerUnit / BAG_YIELD_CUFT[80], 2)} × 80-lb bags); × ${v.pads} = ${fmt(o.cuftNet, 1)} cu ft.`
        : `Per foot: ${fmt(v.w, 1)} × ${fmt(v.t, 1)} in ÷ 144 = ${fmt(r.cuftPerUnit, 3)} cu ft; × ${fmt(v.len, 1)} ft = ${fmt(o.cuftNet, 1)} cu ft (${fmt(o.cuydNet, 2)} yd³).`,
      `Bags with 10% extra: ${fmtInt(o.bags)} × 80 lb or ${fmtInt(bags60(r))} × 60 lb — ${fmtInt(o.weightLb)} lb to move${o.pallets >= 0.9 ? ` (${fmt(o.pallets, 1)} pallets)` : ""}.`,
      o.bagCost != null
        ? `Cost: about ${fmtMoney(o.bagCost)} in bags vs. ${fmtMoney(o.readyMixCost)} for ${fmt(o.readyMixYd, 2)} yd³ delivered — ${truckWins ? "the truck is cheaper here" : o.bags > 40 ? "bags are cheaper here, but that is a lot of mixing" : "bags are the obvious choice"}.`
        : `Ready-mix: about ${fmtMoney(o.readyMixCost)} for ${fmt(o.readyMixYd, 2)} yd³ delivered.`,
      r.rebar ? `Rebar: ${r.rebar.bars} continuous #4 bars need ${fmtInt(r.rebar.sticks)} × 20 ft sticks (${fmt(r.rebar.linearFt, 0)} ft with laps, ${fmt(r.rebar.weightLb, 0)} lb), held 3 in off the soil.` : "",
      !pad && r.projectionIn != null ? `Under an ${fmt(v.wall, 0)} in wall the footing projects ${fmt(r.projectionIn, 1)} in each side — the IRC wants 2 in to ${fmt(v.t, 0)} in (the footing thickness).` : "",
      spec?.note ?? "",
    ].filter(Boolean),
    table: {
      caption: pad ? `${v.pads} pads at other sizes` : `${fmt(v.len, 0)} ft of footing at other sizes`,
      columns: ["Size", "Cubic yards", "80-lb bags", "60-lb bags", "Bag cost", "Ready-mix"],
      rows: sizes.map(({ label, v: x }) => {
        const xr = run(x);
        return [label, fmt(xr.order.cuydNet, 2), fmtInt(xr.order.bags), fmtInt(bags60(xr)), xr.order.bagCost != null ? fmtMoney(xr.order.bagCost) : "—", fmtMoney(xr.order.readyMixCost)];
      }),
    },
    notes: [
      pad
        ? `${fmt(v.pl, 1)} × ${fmt(v.pw, 1)} × ${fmt(v.pt, 1)} = ${fmtInt(v.pl * v.pw * v.pt)} cu in per pad, ÷ 1,728 = ${fmt(r.cuftPerUnit, 3)} cu ft. Times ${v.pads} pads = ${fmt(o.cuftNet, 2)} cu ft, ÷ 27 = ${fmt(o.cuydNet, 3)} yd³.`
        : `${fmt(v.w, 1)} in × ${fmt(v.t, 1)} in = ${fmtInt(v.w * v.t)} sq in of cross-section, ÷ 144 = ${fmt(r.cuftPerUnit, 3)} cu ft per foot. Times ${fmt(v.len, 1)} ft = ${fmt(o.cuftNet, 2)} cu ft, ÷ 27 = ${fmt(o.cuydNet, 3)} yd³.`,
      `With 10% extra that is ${fmt(o.cuftWithWaste, 2)} cu ft ÷ ${BAG_YIELD_CUFT[80]} cu ft per 80-lb bag = ${fmt(o.cuftWithWaste / BAG_YIELD_CUFT[80], 1)}, rounded up to ${fmtInt(o.bags)} bags.`,
      o.cuydWithWaste < READY_MIX.minOrderYd
        ? `At ${fmt(o.cuydWithWaste, 2)} yd³ with waste this is a bag job — a truck's ${READY_MIX.minOrderYd} yd minimum plus fees would cost about ${fmtMoney(o.readyMixCost)}.`
        : o.breakEvenYd != null
        ? `At about $${READY_MIX.pricePerYd} per yard plus delivery, fuel and a short-load fee under ${READY_MIX.shortLoadUnderYd} yd³, a truck beats bags from roughly ${fmt(o.breakEvenYd, 2)} yd³. This job is ${fmt(o.cuydWithWaste, 2)} yd³ with waste, so ${o.cuydWithWaste >= o.breakEvenYd ? "order ready-mix" : "bags make sense — if you have the crew to mix them"}.`
        : `At these prices bags stay cheaper than a truck, but every 80-lb bag is 3–4 minutes in a mixer.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const perFoot = [
    [12, 6],
    [12, 8],
    [16, 8],
    [20, 10],
    [24, 12],
  ];
  return (
    <>
      <h2>How to calculate concrete for a footing</h2>
      <p>
        A continuous footing is a long rectangular beam, so its volume is <strong>length × width × thickness</strong>. Measure the total run in feet — for a closed rectangle that is the perimeter —
        and the width and thickness in inches. Multiply width × thickness and divide by 144 to get cubic feet per foot of footing, then multiply by the length. Divide by 27 for cubic yards. Pad (spread)
        footings are the same math for each pad, times the number of pads.
      </p>
      <p>
        <strong>Worked example — a 20×20 ft garage on a 16 × 8 in footing:</strong> the perimeter is 80 ft. 16 × 8 = 128 sq in ÷ 144 = 0.889 cu ft per foot × 80 ft ={" "}
        {fmt(GARAGE.order.cuftNet, 1)} cu ft = {fmt(GARAGE.order.cuydNet, 2)} yd³. With 10% extra that is {fmt(GARAGE.order.cuftWithWaste, 1)} cu ft ÷ 0.60 cu ft per 80-lb bag ={" "}
        <strong>{fmtInt(GARAGE.order.bags)} bags</strong> — {fmtInt(GARAGE.order.weightLb)} lb. A{" "}
        <Link href={`${BASE}/80-ft-16x8-inch-20x20-garage`}>{fmt(GARAGE.order.readyMixYd, 2)} yd³ ready-mix order</Link> costs about {fmtMoney(GARAGE.order.readyMixCost)} against{" "}
        {GARAGE.order.bagCost != null ? fmtMoney(GARAGE.order.bagCost) : "—"} in bags, and saves a day of mixing.
      </p>

      <h2>Concrete per foot of footing</h2>
      <table>
        <thead>
          <tr>
            <th>Width × thickness</th>
            <th>Cu ft per foot</th>
            <th>Feet per cubic yard</th>
            <th>80-lb bags per 10 ft</th>
          </tr>
        </thead>
        <tbody>
          {perFoot.map(([w, t]) => {
            const cuft = (w * t) / 144;
            return (
              <tr key={`${w}x${t}`}>
                <td>
                  {w} × {t} in{w === 12 && t === 6 ? " (IRC minimum)" : ""}
                </td>
                <td>{fmt(cuft, 3)}</td>
                <td>{fmt(27 / cuft, 1)}</td>
                <td>{fmtInt(Math.ceil((cuft * 10) / 0.6 - 1e-9))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>How big does a footing have to be?</h2>
      <p>
        The International Residential Code sets a floor of <strong>{IRC_FOOTING.minWidthIn} in wide and {IRC_FOOTING.minThickIn} in thick</strong> (R403.1.1), and the footing must stick out at least{" "}
        {IRC_FOOTING.minProjectionIn} in past each face of the wall but no further than its own thickness. Table R403.1(1) widens it for heavier buildings and weaker soil. An excerpt for light-frame
        construction:
      </p>
      {IRC_FOOTING_TABLE.groups.map((g) => (
        <table key={g.load}>
          <caption>{g.load} — width × thickness, in</caption>
          <thead>
            <tr>
              <th>Building</th>
              {IRC_FOOTING_TABLE.soils.map((s) => (
                <th key={s}>{s} soil</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {g.rows.map(([label, ...cells]) => (
              <tr key={label}>
                <td>{label}</td>
                {cells.map((c, i) => (
                  <td key={i}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      <p>
        The table assumes a 32 ft wide building; wider buildings add 2 in of width and 1 in of thickness per extra 4 ft. Your local code, soil report or engineer has the final say, and many
        local codes go beyond the model minimums.
      </p>

      <h2>Depth, frost and soil</h2>
      <ul>
        <li>Exterior footings sit at least {IRC_FOOTING.minDepthBelowGradeIn} in below undisturbed ground (R403.1.4); deck footings follow the same 12 in rule (R507.3.2).</li>
        <li>They must also reach below the local frost depth unless you build a frost-protected shallow foundation. Your building department publishes the number.</li>
        <li>Pour on firm, undisturbed soil or engineered fill. Loose spoil in the trench bottom settles — dig it out.</li>
        <li>Deck footing sizes come from IRC Table R507.3.1, which depends on the load, the deck area each post carries and the soil bearing value.</li>
      </ul>

      <h2>Rebar in footings</h2>
      <p>
        The IRC only mandates footing reinforcement in Seismic Design Categories D0–D2 — for example one #4 bar near the bottom of a stem-wall footing, or a #4 top and bottom in a turned-down slab edge.
        Elsewhere, reinforcement is up to your plans or engineer; the calculator starts at two continuous #4 bars, which you can change. Keep {IRC_FOOTING.coverIn} in of concrete between the steel and the soil (R403.1.3.5.3) by setting bars on chairs or concrete
        blocks, and overlap the bars at splices; the calculator adds 10% to the bar length for laps.
      </p>

      <h2>Bags or ready-mix?</h2>
      <p>
        A footing is one continuous pour, and stopping halfway leaves a cold joint. Anything past about a cubic yard usually goes faster and cheaper with ready-mix — plants sell in quarter-yard steps
        and charge a short-load fee under {READY_MIX.shortLoadUnderYd} yd³ or so. Small pads and short repairs are fine in bags. The calculator compares both with prices you can edit.
      </p>
      <p>
        Footings for posts in tubes? Use the <Link href="/concrete/column-calculator">Sonotube calculator</Link>. Setting fence posts? Try the{" "}
        <Link href="/concrete/post-hole-calculator">post hole calculator</Link>. The garage floor itself is a <Link href="/concrete/slab-calculator">slab</Link>.
      </p>
    </>
  );
}

const DEF = run(FOOTING_DEFAULTS);
const GARAGE = run({ ...FOOTING_DEFAULTS, len: 80, w: 16, t: 8 });

export const footingCalculator: CalculatorEntry<FootingValues> = {
  meta: {
    slug: SLUG,
    category: "concrete",
    name: "Concrete Footing Calculator",
    shortName: "Footings & pads",
    h1: "Concrete Footing Calculator",
    metaTitle: "Concrete Footing Calculator: Bags, Yards & Rebar",
    metaDescription: `Concrete for wall footings or pier pads: 40 ft of 16×8 in footing is ${fmt(DEF.order.cuydNet, 2)} yd³ — ${fmtInt(DEF.order.bags)} × 80-lb bags. Rebar, IRC sizes, bags vs ready-mix.`,
    summary: "Enter a continuous footing or a set of pads to get bags of every size, cubic yards for a truck, #4 rebar, form boards and a check against the IRC minimums.",
    outputs: ["Bags & cubic yards", "#4 rebar sticks", "IRC size check", "Bags vs ready-mix"],
    faq: [
      { q: "What is the minimum size for a concrete footing?", a: "The IRC minimum is 12 in wide and 6 in thick (R403.1.1). Table R403.1(1) requires more on weak soil or for heavier buildings — for example 19 × 6 in for a two-story house with a basement on 1,500 psf soil under light snow loads." },
      { q: "How much concrete per foot of footing?", a: "Width × thickness in inches ÷ 144. A 12 × 6 in footing is 0.5 cu ft per foot (54 ft per cubic yard); 16 × 8 in is 0.89 cu ft; 24 × 12 in is 2 cu ft per foot (13.5 ft per yard)." },
      { q: "How deep does a footing need to be?", a: "The bottom must be at least 12 in below undisturbed ground (IRC R403.1.4) and below your local frost depth, which your building department sets. Deck footings follow the same 12 in minimum (R507.3.2)." },
      { q: "Does a footing need rebar?", a: "The IRC only requires it in Seismic Design Categories D0–D2 (for example one #4 bar near the bottom of a stem-wall footing); elsewhere follow your plans. Keep 3 in of concrete between the bars and the soil (R403.1.3.5.3)." },
      {
        q: "How many bags of concrete for a 20x20 garage footing?",
        a: `An 80 ft perimeter of 16 × 8 in footing is ${fmt(GARAGE.order.cuydNet, 2)} cubic yards — ${fmtInt(GARAGE.order.bags)} × 80-lb bags with 10% extra. That is over ${fmt(Math.floor(GARAGE.order.weightLb / 2000), 0)} tons of bags to mix by hand, which is why a ${fmt(GARAGE.order.readyMixYd, 2)} yd³ ready-mix order (about ${fmtMoney(GARAGE.order.readyMixCost)} with fees at our default prices) is usually worth it.`,
      },
      { q: "Is ready-mix cheaper than bags for footings?", a: "Usually from about 1.5–2.5 cubic yards, depending on your plant's short-load and delivery fees. The calculator shows the break-even for the prices you enter." },
      { q: "How big should deck footings be?", a: "IRC Table R507.3.1 sizes them from the deck load, the area each post carries and the soil bearing value, with a minimum depth of 12 in below grade. A 12×12×12 in pad is 1 cu ft — 2 × 80-lb bags with a little to spare." },
    ],
    sources: concreteSources("qk1101", "sakrete", "retail", "rebarPrice", "readyMix", "ppi", "ircFootings"),
    related: ["concrete/column-calculator", "concrete/slab-calculator", "concrete/post-hole-calculator", "landscaping/gravel-calculator", "lumber/deck-calculator", "concrete/concrete-block-calculator", "concrete/brick-calculator", "concrete/rebar-calculator"],
    updated: CONCRETE_CHECKED,
    keywords: ["footing calculator", "concrete footing", "foundation footing", "garage footing", "deck footing", "pier pad", "rebar", "trench footing"],
  },
  Calculator: FootingCalculator,
  Content,
  presets: FOOTING_PRESETS,
  presetAnswer,
};
