import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeBaseboard, rectPerimeter } from "./compute";
import BaseboardCalculator from "./BaseboardCalculator";
import { BASEBOARD_DEFAULTS, baseboardInputFrom, type BaseboardValues } from "./baseboard-model";
import { BASEBOARD, BASEBOARD_SOURCES, FLOORING_CHECKED } from "./data";

const SLUG = "baseboard-calculator";
const BASE = `/flooring/${SLUG}`;

const run = (v: BaseboardValues) => computeBaseboard(baseboardInputFrom(v));

/* ───────────────────────── programmatic presets ───────────────────────── */

const ROOM_NOTES: Record<string, string> = {
  "10x10": "10×10 is a small bedroom or office; every wall fits in one 12 ft piece.",
  "10x12": "10×12 is a common secondary bedroom; every wall fits in one 12 ft piece.",
  "12x12": "12×12 walls match 12 ft stock exactly, so measure first — a wall a hair over 12 ft forces a splice.",
  "12x14": "12×14 has two 14 ft walls, longer than 12 ft stock.",
  "12x16": "12×16 has two 16 ft walls, which only 16 ft stock covers in one piece.",
  "15x20": "15×20 is a living room; its 20 ft walls need a splice with any stock length.",
};

const ROOMS: [number, number][] = [
  [10, 10],
  [10, 12],
  [12, 12],
  [12, 14],
  [12, 16],
  [15, 20],
];

const roomValues = (a: number, b: number): BaseboardValues => ({ ...BASEBOARD_DEFAULTS, l1: b, w1: a });

export const BASEBOARD_PRESETS: Preset<BaseboardValues>[] = ROOMS.map(([a, b]) => {
  const r = run(roomValues(a, b));
  const best = r.options.reduce((x, o) => (o.splices < x.splices || (o.splices === x.splices && o.cost < x.cost) ? o : x), r.options[0]);
  return {
    slug: `${a}x${b}-room`,
    values: roomValues(a, b),
    group: "Rooms",
    label: `${a}×${b} room`,
    h1: `How much baseboard do I need for a ${a}×${b} room?`,
    metaTitle: `Baseboard for a ${a}x${b} Room: Linear Feet & Pieces`,
    metaDescription: `A ${a}×${b} room with one door needs ${fmt(r.netLf)} linear ft of baseboard: ${best.pieces} pieces of ${best.stockFt} ft with 10% for copes and miters. Nails, caulk, paint, cost.`,
  };
});

function presetAnswer(v: BaseboardValues): PresetAnswer {
  const r = run(v);
  const a = v.w1;
  const b = v.l1;
  const perim = rectPerimeter({ l: b, w: a });
  const best = r.options.reduce((x, o) => (o.splices < x.splices || (o.splices === x.splices && o.cost < x.cost) ? o : x), r.options[0]);
  const cheapest = r.options.reduce((x, o) => (o.cost < x.cost ? o : x), r.options[0]);
  const paint = [r.gallons ? `${r.gallons} gallon` : "", r.quarts ? `${r.quarts} quart${r.quarts === 1 ? "" : "s"}` : ""].filter(Boolean).join(" + ");
  return {
    headline: `A ${a} × ${b} ft room with one 36 in door needs ${fmt(r.netLf)} linear ft of baseboard — ${r.options.map((o) => `${o.pieces} × ${o.stockFt} ft`).join(", ")} with 10% for copes and miters.`,
    bullets: [
      `Math: 2 × (${a} + ${b}) = ${fmt(perim)} ft of wall − 3 ft for the door = ${fmt(r.netLf)} ft; × 1.10 = ${fmt(r.buyLf, 1)} ft to buy.`,
      `Corners: ${r.insideCorners} inside corners to cope or miter and 2 square ends at the door casing.`,
      `Fasteners and finish: about ${fmtInt(r.nails)} finish nails (two per stud at 16 in), ${r.caulkTubes} tube${r.caulkTubes === 1 ? "" : "s"} of caulk for the top edge, and ${paint} of trim paint for two coats on 5¼ in base.`,
      `Cost: about ${fmtMoney(r.materialsCost)} in MDF, caulk and paint; a pro adds about ${fmtMoney(r.laborCost)} at ${fmtMoney(BASEBOARD.laborPerLf, { cents: true })} per linear ft (Angi range $5–$7.75).`,
      ROOM_NOTES[`${a}x${b}`] ?? "",
    ].filter(Boolean),
    table: {
      caption: `Baseboard for a ${a}×${b} room by piece length`,
      columns: ["Piece length", "Pieces", "Splices", "Offcuts", "MDF cost"],
      rows: r.options.map((o) => [`${o.stockFt} ft`, fmtInt(o.pieces), fmtInt(o.splices), `${fmt(o.offcutFt, 1)} ft`, fmtMoney(o.cost)]),
    },
    notes: [
      best.splices === 0
        ? `${best.stockFt} ft pieces cover every wall without a splice${best.cost - cheapest.cost < 0.01 ? " and cost no more than any other length" : `, for ${fmtMoney(best.cost - cheapest.cost)} more than the cheapest option (${cheapest.stockFt} ft with ${cheapest.splices} scarf joint${cheapest.splices === 1 ? "" : "s"})`}.`
        : `No stock length covers the ${Math.max(a, b)} ft walls in one piece, so plan ${best.splices} scarf joint${best.splices === 1 ? "" : "s"} — cut both ends at 45° and land the joint on a stud.`,
      `Measure the actual door opening from casing edge to casing edge; a wider opening or a run of cabinets comes straight off the linear feet.`,
    ],
  };
}

/* ───────────────────────── long-form guide ───────────────────────── */

function Content() {
  const example = run(roomValues(12, 14));
  const twelve = example.options.find((o) => o.stockFt === 12)!;
  const sixteen = example.options.find((o) => o.stockFt === 16)!;
  return (
    <>
      <h2>How to measure baseboard</h2>
      <p>
        Baseboard is bought by the piece and measured in linear feet. Add up the length of every wall that gets trim (for a rectangle, 2 × (length + width)),
        subtract door openings measured casing to casing, subtract cabinets, tubs and built-ins, and add about <strong>10% for copes, miters and cut-offs</strong>.
        Closets count: add each closet as its own room.
      </p>
      <p>
        <strong>Worked example — a 12 × 14 ft bedroom with one door:</strong> 2 × (12 + 14) = 52 ft. Minus a 3 ft door opening = 49 ft. With 10%, 53.9 ft. In 12
        ft pieces that is {twelve.pieces} pieces, and the full 14 ft wall is longer than a stick, so it needs {twelve.splices} scarf joint
        {twelve.splices === 1 ? "" : "s"}. In 16 ft pieces you need {sixteen.pieces}, with no splices at all.
      </p>

      <h2>Pick the piece length before you buy</h2>
      <p>
        The calculator plans every wall onto sticks of 8, 12 or 16 ft and shows the cut list. It takes the larger of two counts: total length plus your waste
        allowance, and the number of sticks needed so that no wall shorter than a stick has a joint in it. Longer pieces mean fewer joints but are harder to haul;
        8 ft fits in most cars.
      </p>
      <table>
        <thead>
          <tr>
            <th>Room (1 door)</th>
            <th>Linear ft</th>
            <th>8 ft pieces</th>
            <th>12 ft pieces</th>
            <th>16 ft pieces</th>
          </tr>
        </thead>
        <tbody>
          {ROOMS.map(([a, b]) => {
            const r = run(roomValues(a, b));
            const slug = `${a}x${b}-room`;
            return (
              <tr key={slug}>
                <td>
                  <Link href={`${BASE}/${slug}`}>{`${a}×${b} ft`}</Link>
                </td>
                <td>{fmt(r.netLf)}</td>
                {r.options.map((o) => (
                  <td key={o.stockFt}>
                    {o.pieces}
                    {o.splices ? ` (${o.splices} splice${o.splices === 1 ? "" : "s"})` : ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Corners and joints</h2>
      <ul>
        <li>
          <strong>Inside corners:</strong> butt one piece square into the corner and cope the other to its profile, or miter both at 45°. Lowe&apos;s install guide
          shows both; coping hides small gaps better when corners aren&apos;t square.
        </li>
        <li>
          <strong>Outside corners:</strong> miter both pieces at 45°.
        </li>
        <li>
          <strong>Long walls:</strong> join two pieces with a scarf joint — opposing 45° cuts that overlap — over a stud.
        </li>
        <li>
          <strong>Door casings:</strong> square cuts where the base meets the casing.
        </li>
      </ul>

      <h2>Nails, caulk and paint</h2>
      <p>
        Lowe&apos;s guide calls for finishing nails into the studs every 16–18 in; carpenters typically drive two per stud, one high and one low, which works out to
        about 1.5 nails per linear foot. For the top edge, DAP rates a 10.1 oz tube of Alex Plus at <strong>55 linear ft</strong> with a 3/16 in bead. Paint area is
        linear feet × height ÷ 12 (the Sherwin-Williams calculator method): 45 ft of 5¼ in base is about 20 sq ft, and at 350–400 sq ft per gallon per coat,
        two coats fit in a single quart.
      </p>

      <h2>Quarter round with new floors</h2>
      <p>
        If the baseboards stay in place over a new floating floor, quarter round or shoe molding covers the expansion gap — 1/4 in for vinyl plank, 3/8 in for
        laminate. Nail it to the baseboard, not into the floor. A 3/4 in solid-hardwood gap is wider than standard quarter round covers, so pull and reset the
        baseboards instead. The <Link href="/flooring/flooring-calculator">flooring calculator</Link> adds quarter round to the flooring list automatically.
      </p>

      <h2>What it costs</h2>
      <p>
        Angi&apos;s 2026 figures put MDF baseboard at $1.00–$1.40 per linear foot and professional installation at $5–$7.75 per linear foot, so labor is most
        of the bill. Painting and removing old trim are usually quoted separately.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Buying exactly the perimeter with no allowance for copes and bad cuts.</li>
        <li>Splicing short walls with leftover pieces — buy enough length that every wall under one stick is a single piece.</li>
        <li>Forgetting closets, or counting a door between two trimmed rooms only once.</li>
        <li>Nailing into drywall between studs, where nails don&apos;t hold.</li>
      </ul>
      <p>
        Planning a room refresh? Pair this with the <Link href="/paint/paint-calculator">paint calculator</Link> for the walls and the{" "}
        <Link href="/flooring/carpet-calculator">carpet calculator</Link> or <Link href="/tile/tile-calculator">tile calculator</Link> for the floor.
      </p>
    </>
  );
}

export const baseboardCalculator: CalculatorEntry<BaseboardValues> = {
  meta: {
    slug: SLUG,
    category: "flooring",
    name: "Baseboard Calculator",
    shortName: "Baseboard & trim",
    h1: "Baseboard Calculator: Linear Feet, Pieces and Cut List",
    metaTitle: "Baseboard Calculator: Linear Feet, Pieces & Cost",
    metaDescription:
      "Linear feet of baseboard for any room, minus doors, with 8, 12 or 16 ft pieces, a cut list, corners, nails, caulk and paint. A 12×12 room with a door: 45 ft.",
    summary:
      "Enter your rooms and openings to get linear feet, the number of 8, 12 or 16 ft pieces with a cut list that avoids splices, corner counts, nails, caulk, paint and cost.",
    outputs: ["Linear feet", "Pieces & cut list", "Corners & splices", "Nails, caulk, paint"],
    faq: [
      { q: "How much baseboard do I need for a 12x12 room?", a: "The walls total 48 ft; minus a 3 ft door opening that is 45 linear ft, or 49.5 ft with 10% for copes and miters — 5 pieces of 12 ft or 7 pieces of 8 ft." },
      { q: "How do I calculate linear feet of baseboard?", a: "Add up every wall that gets trim (2 × (length + width) for a rectangular room), subtract door openings measured casing to casing and any cabinets or tubs, then add about 10% for cuts." },
      { q: "What length of baseboard should I buy?", a: "Buy pieces at least as long as most of your walls so each wall is one piece. This calculator compares 8, 12 and 16 ft pieces; walls longer than a piece are joined with a 45° scarf joint over a stud." },
      { q: "How many nails do I need for baseboard?", a: "Lowe's guide says to nail into the studs every 16–18 in; with two nails per stud that is about 1.5 nails per linear foot, or roughly 68 nails for 45 ft." },
      { q: "How much caulk do I need for baseboards?", a: "DAP rates a 10.1 oz tube of Alex Plus at 55 linear ft with a 3/16 in bead, so one tube per 55 ft of baseboard top edge." },
      { q: "How much paint do I need for baseboards?", a: "Multiply linear feet by the board height in inches and divide by 12. 45 ft of 5¼ in baseboard is about 20 sq ft; two coats at 350–400 sq ft per gallon fit in one quart." },
      { q: "How much does baseboard installation cost?", a: "Angi's 2026 figures put MDF at $1.00–$1.40 per linear foot and labor at $5–$7.75 per linear foot, so 45 ft of MDF runs about $45–$63 and labor roughly $225–$350." },
    ],
    sources: BASEBOARD_SOURCES,
    related: ["flooring/flooring-calculator", "paint/paint-calculator", "flooring/carpet-calculator", "tile/tile-calculator"],
    updated: FLOORING_CHECKED,
    keywords: ["baseboard calculator", "linear feet of baseboard", "trim calculator", "quarter round", "baseboard cost", "how much baseboard"],
  },
  Calculator: BaseboardCalculator,
  Content,
  presets: BASEBOARD_PRESETS,
  presetAnswer,
};
