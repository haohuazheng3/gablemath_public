import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeRoom, packText } from "./compute";
import { BRAND_CALC, INTERIOR_PRIMERS, PAINT_CHECKED, WALL_PAINTS, paintSources, ratedText } from "./data";
import RoomCalculator from "./RoomCalculator";
import { ROOM_DEFAULTS, roomInputFrom, type RoomValues } from "./room-model";

const SLUG = "paint-calculator";
const BASE = `/paint/${SLUG}`;
const run = (v: RoomValues) => computeRoom(roomInputFrom(v));

/* ───────── presets: the room sizes people search ───────── */

type Spec = { l: number; w: number; doors: number; windows: number; group: string; kind: string; note: string };
const SPECS: Spec[] = [
  { l: 10, w: 10, doors: 1, windows: 1, group: "Bedrooms & offices", kind: "room", note: "10×10 is a typical small bedroom, nursery or home office. Two gallons covers two coats with paint left for touch-ups; for a same-color repaint with a premium one-coat line, a single gallon can do it." },
  { l: 10, w: 12, doors: 1, windows: 2, group: "Bedrooms & offices", kind: "room", note: "10×12 is a common secondary bedroom. The closet walls are extra — switch on “Include a closet” to add them." },
  { l: 12, w: 12, doors: 1, windows: 2, group: "Bedrooms & offices", kind: "room", note: "12×12 is the classic bedroom size and the most-asked paint question. Two gallons covers the walls twice with a little to spare." },
  { l: 12, w: 14, doors: 1, windows: 2, group: "Bedrooms & offices", kind: "bedroom", note: "At 12×14 the walls need just over two gallons for two coats, so the cheapest buy is two gallons plus a quart rather than a third gallon." },
  { l: 12, w: 16, doors: 2, windows: 2, group: "Larger rooms", kind: "room", note: "12×16 rooms (large bedrooms, dens) usually have a second door — to a closet or bath — which is already deducted here." },
  { l: 14, w: 16, doors: 2, windows: 3, group: "Larger rooms", kind: "room", note: "14×16 is primary-bedroom or family-room territory. With three windows the openings remove about 87 sq ft of wall." },
  { l: 15, w: 20, doors: 2, windows: 3, group: "Larger rooms", kind: "living room", note: "A 15×20 living room has 560 sq ft of gross wall at 8 ft. This is where buying a 5-gallon pail of a line that sells one can start to pay off — compare in the table." },
  { l: 5, w: 8, doors: 1, windows: 0, group: "Bathrooms", kind: "bathroom", note: "A 5×8 full bath has little paintable wall once the tub surround and vanity are out — enter the tiled area in “Wall hidden by cabinets, tile or built-ins” (a 5-ft tub tiled to 6 ft hides 30 sq ft). Use a satin or semi-gloss bath paint." },
];

export const ROOM_PRESETS: Preset<RoomValues>[] = SPECS.map((s) => {
  const v: RoomValues = { ...ROOM_DEFAULTS, l1: s.l, w1: s.w, doors: s.doors, windows: s.windows };
  const r = run(v);
  const walls = r.needs[0];
  return {
    slug: `${s.l}x${s.w}-${s.kind === "bathroom" ? "bathroom" : "room"}`,
    values: v,
    group: s.group,
    label: `${s.l}×${s.w} ${s.kind}`,
    h1: `How much paint do I need for a ${s.l}×${s.w} ${s.kind}?`,
    metaTitle: `Paint for a ${s.l}x${s.w} ${s.kind[0].toUpperCase()}${s.kind.slice(1)}: Gallons & Cost`,
    metaDescription: `A ${s.l}×${s.w} ${s.kind} with 8-ft walls has ${fmtInt(r.wallNetSqFt)} sq ft to paint: ${fmt(walls.gallons, 1)} gal for 2 coats — buy ${packText(walls.pack)} (~${fmtMoney(walls.pack.cost)}). Ceiling and trim too.`,
  };
});

const NOTES: Record<string, string> = Object.fromEntries(SPECS.map((s) => [`${s.l}x${s.w}`, s.note]));

function presetAnswer(v: RoomValues): PresetAnswer {
  const r = run(v);
  const walls = r.needs.find((n) => n.key === "walls")!;
  const withCeil = run({ ...v, ceiling: true });
  const ceil = withCeil.needs.find((n) => n.key === "ceiling");
  const withTrim = run({ ...v, trim: true });
  const trim = withTrim.needs.find((n) => n.key === "trim");
  const doorSq = v.doorW * v.doorH;
  const winSq = v.winW * v.winH;
  const plans: [string, RoomValues][] = [
    ["Walls, 1 coat (same-color refresh)", { ...v, coats: 1 }],
    ["Walls, 2 coats", v],
    ["Walls + ceiling, 2 coats", { ...v, ceiling: true }],
    ["Walls + ceiling + trim", { ...v, ceiling: true, trim: true }],
    ["New drywall: primer + 2 coats", { ...v, scenario: "drywall", primer: "porous" }],
    ["Deep color, no primer (3 coats)", { ...v, deep: true }],
  ];
  return {
    headline: `A ${v.l1} × ${v.w1} ft room with 8-ft walls has ${fmtInt(r.wallNetSqFt)} sq ft of wall to paint — ${fmt(walls.gallons, 2)} gallons for two coats, so buy ${packText(walls.pack)} (about ${fmtMoney(walls.pack.cost)}).`,
    bullets: [
      `Wall area: ${fmt(r.perimeterFt)} ft of perimeter × ${fmt(v.h)} ft = ${fmtInt(r.wallGrossSqFt)} sq ft, minus ${v.doors} door${v.doors === 1 ? "" : "s"} (${fmt(doorSq)} sq ft${v.doors > 1 ? " each" : ""})${v.windows ? ` and ${v.windows} window${v.windows === 1 ? "" : "s"} (${fmt(winSq)} sq ft${v.windows > 1 ? " each" : ""})` : ""} = ${fmtInt(r.wallNetSqFt)} sq ft.`,
      `Paint: ${fmtInt(r.wallNetSqFt)} × 2 coats ÷ 350 sq ft/gal = ${fmt(walls.gallons, 2)} gal → ${packText(walls.pack)}, the cheapest can mix at typical prices.`,
      ceil ? `Ceiling too: ${fmtInt(withCeil.ceilingSqFt)} sq ft × 2 coats needs another ${fmt(ceil.gallons, 2)} gal (${packText(ceil.pack)}).` : "",
      trim ? `Trim: ${fmtInt(withTrim.baseboardLf)} ft of 6-in baseboard plus door and window casing is ${fmtInt(withTrim.trimSqFt)} sq ft — ${packText(trim.pack)} of semi-gloss covers two coats.` : "",
      `Brand calculators: Sherwin-Williams' says ${fmt(r.sw.total, 1)} gal (400 sq ft/gal); Benjamin Moore's says ${r.bm.gallons} gal${r.bm.quarts ? ` + ${r.bm.quarts} qt` : ""} (350 sq ft/gal).`,
      `Supplies (roller kit, covers, brush, tape, drop cloth) add about ${fmtMoney(r.suppliesCost)}.`,
    ].filter(Boolean),
    table: {
      caption: `Paint for a ${v.l1}×${v.w1} room by plan (typical 350 sq ft/gal paint)`,
      columns: ["Plan", "Gallons", "Buy", "Paint cost"],
      rows: plans.map(([label, x]) => {
        const q = run(x);
        return [label, fmt(q.totalGallons, 2), q.needs.map((n) => `${packText(n.pack)} ${n.label.toLowerCase()}`).join(" + "), fmtMoney(q.paintCost)];
      }),
    },
    notes: [NOTES[`${v.l1}x${v.w1}`] ?? ""].filter(Boolean),
  };
}

/* ───────── long-form content ───────── */

const SHOWN = ["sw-emerald", "sw-superpaint", "bm-regal-select", "bm-ben", "behr-ultra", "valspar-signature", "glidden-hep", "clark-kensington"];

function Content() {
  const ex = run(ROOM_DEFAULTS);
  const exWalls = ex.needs[0];
  return (
    <>
      <h2>How to work out how much paint a room needs</h2>
      <p>
        Paint is sold by coverage, not by floor size, so the math runs on wall area. Add up the length of every wall (the perimeter), multiply by the wall height, subtract
        the doors and windows, then multiply by the number of coats and divide by the paint&apos;s spread rate:
      </p>
      <p>
        <strong>gallons = (perimeter × height − doors − windows) × coats ÷ sq ft per gallon</strong>
      </p>
      <p>
        <strong>Worked example — a 12×12 bedroom with 8-ft walls, one door and two windows:</strong> 48 ft of wall × 8 ft = 384 sq ft. A standard 3×7 door is 21 sq ft
        and each 3×5 window is 15 sq ft, so the paintable area is 384 − 21 − 30 = {fmtInt(ex.wallNetSqFt)} sq ft. Two coats at 350 sq ft per gallon: {fmtInt(ex.wallNetSqFt)} × 2 ÷ 350 ={" "}
        {fmt(exWalls.gallons, 2)} gallons. Buy {packText(exWalls.pack)}.
      </p>

      <h2>Paint for common room sizes</h2>
      <table>
        <thead>
          <tr>
            <th>Room (8-ft walls)</th>
            <th>Wall area</th>
            <th>Two coats</th>
            <th>Buy</th>
          </tr>
        </thead>
        <tbody>
          {ROOM_PRESETS.map((p) => {
            const r = run(p.values);
            return (
              <tr key={p.slug}>
                <td>
                  <Link href={`${BASE}/${p.slug}`}>{p.label}</Link>
                </td>
                <td>{fmtInt(r.wallNetSqFt)} sq ft</td>
                <td>{fmt(r.needs[0].gallons, 2)} gal</td>
                <td>{packText(r.needs[0].pack)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>Each row deducts that room&apos;s doors and windows. A 9-ft ceiling adds 12.5% more wall; a 10-ft ceiling adds 25%.</p>

      <h2>How far does a gallon go?</h2>
      <p>
        Most premium interior paints are rated at 350–400 sq ft per gallon per coat on smooth, primed walls — and less on porous or textured surfaces. We plan with the low end of
        each maker&apos;s range so you don&apos;t run short. A quart is a quarter of that: about 87–100 sq ft per coat.
      </p>
      <table>
        <thead>
          <tr>
            <th>Paint</th>
            <th>Label coverage (sq ft/gal)</th>
            <th>Coats</th>
          </tr>
        </thead>
        <tbody>
          {WALL_PAINTS.filter((p) => SHOWN.includes(p.id)).map((p) => (
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

      <h2>How to measure</h2>
      <ul>
        <li>Measure each wall at floor level and add them up; for an L-shaped room, add every wall segment.</li>
        <li>Measure height from floor to ceiling — not to the top of the trim.</li>
        <li>
          Sherwin-Williams&apos; calculator deducts {BRAND_CALC.swDoorSqFt} sq ft per door and {BRAND_CALC.swWindowSqFt} per window; Benjamin Moore&apos;s uses {BRAND_CALC.bmDoorSqFt} and{" "}
          {BRAND_CALC.bmWindowSqFt}. Oversized patio doors and picture windows deserve their real size.
        </li>
        <li>Subtract wall hidden by kitchen cabinets, backsplash or tile — measure it; in a kitchen it can be a big share of the wall.</li>
      </ul>

      <h2>Coats and primer</h2>
      <p>
        Two coats is the norm for an even color. A premium line can cover in one coat when you repaint the same or a similar color. New drywall needs a coat of primer first —
        bare joint compound soaks up paint unevenly. Drywall primers cover{" "}
        {INTERIOR_PRIMERS.map((p) => p.porous)
          .sort((a, b) => a - b)
          .filter((x, i, a) => i === 0 || i === a.length - 1)
          .join("–")}{" "}
        sq ft per gallon on bare board. For a big color change, a primer tinted gray or toward the new color usually saves a third topcoat; for water stains, spot-prime with a
        stain-blocking primer — a quart is usually enough.
      </p>

      <h2>Ceilings and trim</h2>
      <p>
        A ceiling equals the floor area (12×12 = 144 sq ft), so two coats take about 0.8 gallon. Popcorn and heavy textures drink more — we plan them at 75% of the label rate, about a third more paint (an estimate). For trim, multiply the linear
        feet by the face height: 48 ft of 6-in baseboard is 24 sq ft, so a quart of semi-gloss covers baseboards and casings in most rooms.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Using the floor area instead of the wall area — a 12×12 room has 144 sq ft of floor but about 333 sq ft of wall.</li>
        <li>Buying three quarts instead of a gallon: a quart usually costs 36–52% of a gallon, so three cost more than one gallon.</li>
        <li>Mixing cans from different batches on one wall — box (combine) your paint when you buy four or more gallons.</li>
        <li>Forgetting that sprayers lose paint to overspray: plan about 25% more than with a roller.</li>
        <li>Sanding old paint in a home built before 1978 without testing for lead first.</li>
      </ul>
      <p>
        Painting outside too? Use the <Link href="/paint/exterior-paint-calculator">exterior paint calculator</Link> or the{" "}
        <Link href="/paint/deck-stain-calculator">deck stain calculator</Link>. Replacing trim or floors at the same time? Try the{" "}
        <Link href="/flooring/baseboard-calculator">baseboard calculator</Link>.
      </p>
    </>
  );
}

export const roomCalculator: CalculatorEntry<RoomValues> = {
  meta: {
    slug: SLUG,
    category: "paint",
    name: "Paint Calculator",
    shortName: "Interior rooms",
    h1: "Paint Calculator: How Much Paint for a Room",
    metaTitle: "Paint Calculator: Gallons for Any Room (2026)",
    metaDescription: "How much paint for your room: walls, ceiling and trim, minus doors and windows. A 12×12 room needs 1.9 gal for 2 coats. Cheapest can mix, primer and cost.",
    summary: "Enter your room size, doors and windows to get the exact gallons for walls, ceiling and trim, the cheapest mix of quarts, gallons and pails for your paint, primer, supplies and cost.",
    outputs: ["Gallons per surface", "Cheapest can mix", "Primer", "Supplies & cost"],
    faq: [
      { q: "How much paint do I need for a 12x12 room?", a: "A 12×12 room with 8-ft walls, one door and two windows has 333 sq ft of wall. Two coats at 350 sq ft per gallon is 1.9 gallons, so buy 2 gallons. Painting the 144 sq ft ceiling too adds about 0.8 gallon." },
      { q: "How many square feet does a gallon of paint cover?", a: "350–400 sq ft per coat for most premium interior paints such as Sherwin-Williams Emerald and SuperPaint; Benjamin Moore Regal Select and ben are rated 400–450, and Behr 250–400. Plan with the low end, and expect less on textured or porous walls." },
      { q: "How much does a quart of paint cover?", a: "A quart is a quarter gallon, so it covers about 87–100 sq ft per coat at 350–400 sq ft per gallon — enough for the trim in most rooms or one coat on a small accent wall." },
      { q: "Do I need two coats of paint?", a: "Usually yes: Sherwin-Williams and Valspar Signature call for two coats. Premium lines such as Benjamin Moore Regal Select or Valspar Reserve can cover in one coat when you repaint the same or a similar color." },
      { q: "How much primer do I need for new drywall?", a: "One coat over the walls and ceiling. Drywall primers cover 250–400 sq ft per gallon on bare board (we plan KILZ 2 at 300 on bare board), so a 12×12 room's 333 sq ft of wall takes a little over one gallon." },
      { q: "What size door and window does the calculator subtract?", a: "We subtract your actual sizes, defaulting to a 3×7 ft door (21 sq ft) and a 3×5 ft window (15 sq ft). Sherwin-Williams' calculator uses 21 and 15 sq ft; Benjamin Moore's uses 21 and 12." },
      { q: "Is a 5-gallon bucket of paint cheaper than gallons?", a: "Sometimes. KILZ 2 primer is $94 for 5 gallons versus $23.97 a gallon ($119.85 for five) at Walmart, but many paint lines only sell pails in-store or by special order. The calculator compares every can mix with real prices." },
    ],
    sources: paintSources("swCalc", "bmCalc", "swEmerald", "swSuperPaint", "swDurationHome", "bmRegal", "bmBen", "behrUltra", "valspar", "gliddenWalmart", "clarkKensington", "kilz2", "zinsser", "swPww", "swPrices", "sundries", "epaLead"),
    related: ["paint/exterior-paint-calculator", "paint/deck-stain-calculator", "flooring/baseboard-calculator", "flooring/flooring-calculator", "walls/drywall-calculator", "paint/wallpaper-calculator"],
    updated: PAINT_CHECKED,
    keywords: ["paint calculator", "how much paint", "gallons of paint", "room paint", "wall paint", "ceiling paint", "primer", "paint coverage"],
    featured: true,
  },
  Calculator: RoomCalculator,
  Content,
  presets: ROOM_PRESETS,
  presetAnswer,
};
