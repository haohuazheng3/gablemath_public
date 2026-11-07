import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { bestCarpetLayout, carpetLayout, carpetStairs, computeCarpet } from "./compute";
import CarpetCalculator from "./CarpetCalculator";
import { CARPET_DEFAULTS, carpetInputFrom, type CarpetValues } from "./carpet-model";
import { CARPET, CARPET_SOURCES, FLOORING_CHECKED, ROLL_WIDTHS } from "./data";

const SLUG = "carpet-calculator";
const BASE = `/flooring/${SLUG}`;

const run = (v: CarpetValues) => computeCarpet(carpetInputFrom(v));
/** A square room has one orientation, not two. */
const orientations = (l: number, w: number) => (l === w ? (["length"] as const) : (["length", "width"] as const));
const SQYD_PRICE = CARPET.pricePerSqft * 9;

/* ───────────────────────── programmatic presets ───────────────────────── */

const ROOM_NOTES: Record<string, string> = {
  "10x12": "10×12 fits inside one 12 ft roll width with 2 ft to spare.",
  "12x12": "12×12 is exactly one roll wide: a single piece, but no side allowance, so measure every wall.",
  "12x14": "12×14 still fits a single 12 ft width, run along the 14 ft wall.",
  "12x15": "12×15 still fits a single 12 ft width, run along the 15 ft wall.",
  "12x16": "12×16 fits a single 12 ft width run the long way — a 16 ft 6 in cut.",
  "13x15": "13×15 is the classic trap: 1 ft too wide for a 12 ft roll, so the cheapest layout depends on the roll width.",
};

const ROOMS: [number, number][] = [
  [10, 12],
  [12, 12],
  [12, 14],
  [12, 15],
  [12, 16],
  [13, 15],
];
const STEPS = [13, 14];

const roomValues = (a: number, b: number): CarpetValues => ({ ...CARPET_DEFAULTS, mode: "room", l: b, w: a });
const stairValues = (steps: number): CarpetValues => ({ ...CARPET_DEFAULTS, mode: "stairs", steps });

export const CARPET_PRESETS: Preset<CarpetValues>[] = [
  ...ROOMS.map(([a, b]) => {
    const r = run(roomValues(a, b));
    const L = r.layout!;
    return {
      slug: `${a}x${b}-room`,
      values: roomValues(a, b),
      group: "Rooms",
      label: `${a}×${b} room`,
      h1: `How much carpet do I need for a ${a}×${b} room?`,
      metaTitle: `Carpet for a ${a}x${b} Room: Square Yards & Cost`,
      metaDescription: `A ${a}×${b} room needs ${fmt(r.orderSqyd, 1)} sq yd of carpet on a 12 ft roll — ${fmt(L.linearFt, 1)} linear ft, ${L.seams ? `${L.seams} seam` : "no seam"}. Pad, tack strip and cost; 15 ft roll compared.`,
    };
  }),
  ...STEPS.map((n) => {
    const r = run(stairValues(n));
    return {
      slug: `${n}-stairs`,
      values: stairValues(n),
      group: "Stairs",
      label: `${n} stairs`,
      h1: `How much carpet do I need for ${n} stairs?`,
      metaTitle: `Carpet for ${n} Stairs: Square Yards, Pad & Cost`,
      metaDescription: `${n} stairs 36 in wide take ${fmt(r.orderSqyd, 1)} sq yd of carpet (${fmt(r.linearFt, 1)} linear ft of a 12 ft roll): about ${fmtMoney(r.materialsCost)} with pad, ${fmtMoney(n * 54)} installed at $54/step.`,
    };
  }),
];

function roomAnswer(v: CarpetValues): PresetAnswer {
  const r = run(v);
  const L = r.layout!;
  const a = v.w;
  const b = v.l;
  const net = a * b;
  const wider = ROLL_WIDTHS.filter((w) => w.value > 12)
    .map((w) => ({ label: w.label, layout: bestCarpetLayout(b, a, w.value, v.trim) }))
    .reduce((x, y) => (y.layout.sqyd < x.layout.sqyd ? y : x));
  const runFt = L.runAlong === "length" ? b : a;
  const saved = L.sqyd - wider.layout.sqyd;
  return {
    headline: `A ${a} × ${b} ft room (${fmt(net)} sq ft, ${fmt(net / 9, 1)} sq yd) takes ${fmt(r.orderSqyd, 1)} sq yd of carpet — ${fmt(L.linearFt, 1)} linear ft off a 12 ft roll${L.seams ? ` with ${L.seams} seam` : ", no seam"}.`,
    bullets: [
      `The roll runs along the ${runFt} ft wall: ${L.drops} drop${L.drops === 1 ? "" : "s"} × ${formatFeetInches(L.cutLenFt)} (3 in trim at each end) × 12 ft = ${fmt(L.sqft, 1)} sq ft ÷ 9 = ${fmt(L.sqyd, 1)} sq yd.`,
      `You pay for ${fmt(L.sqft, 1)} sq ft to cover ${fmt(net)} — ${fmt(r.wastePct, 0)}% ends up as offcuts${r.wastePct > 20 ? ", mostly the unused part of the fill drop" : ""}.`,
      `Pad: ${fmt(r.padSqft / 9, 1)} sq yd (5% extra). Tack strip: ${fmtInt(Math.ceil(r.tackStripLf))} ft around the walls, skipping one 32 in doorway.`,
      `Cost: about ${fmtMoney(r.carpetCost)} of carpet at ${fmtMoney(SQYD_PRICE, { cents: true })}/sq yd plus ${fmtMoney(r.padCost)} of pad — roughly ${fmtMoney(r.materialsCost + r.laborCost)} installed at $1/sq ft labor.`,
      ROOM_NOTES[`${a}x${b}`] ?? "",
    ].filter(Boolean),
    table: {
      caption: `Carpet for a ${a}×${b} room by roll width and direction`,
      columns: ["Roll width", "Roll runs along", "Seams", "Sq yd", "Offcuts"],
      rows: ROLL_WIDTHS.flatMap((w) =>
        orientations(b, a).map((along) => {
          const x = carpetLayout(b, a, w.value, along, v.trim);
          return [w.label, `${along === "length" ? b : a} ft wall`, fmtInt(x.seams), fmt(x.sqyd, 1), `${fmt(((x.sqft - net) / x.sqft) * 100, 0)}%`];
        }),
      ),
    },
    notes: [
      saved > 0.05
        ? `A ${wider.label} roll would need only ${fmt(wider.layout.sqyd, 1)} sq yd${wider.layout.seams === 0 ? " with no seam" : ""} — ${fmt(saved, 1)} sq yd less, about ${fmtMoney(saved * SQYD_PRICE)} at typical prices. Ask whether your style comes that wide before you order.`
        : `On a 12 ft roll this room already ${L.seams ? "has the fewest seams possible" : "needs no seam"}; the best wider roll (${wider.label}) would mean buying ${fmt(wider.layout.sqyd, 1)} sq yd, so it only adds offcuts.`,
      L.seams
        ? "Keep the seam parallel to the main traffic path and out of doorways, and make sure every piece has the pile running the same way (CRI 105)."
        : "A single piece means no seam to show — the best result for a bedroom.",
    ],
  };
}

function stairsAnswer(v: CarpetValues): PresetAnswer {
  const r = run(v);
  const s = r.stairs!;
  const empty = s.rows * s.across - s.steps;
  const nextRow = carpetStairs(s.rows * s.across + 1, v.stairW, v.tread, v.riser, 12);
  return {
    headline: `${s.steps} straight stairs, 36 in wide, take ${fmt(r.orderSqyd, 1)} sq yd of carpet — ${fmt(s.linearFt, 1)} linear ft of a 12 ft roll, cut ${s.across} steps across in ${s.rows} rows.`,
    bullets: [
      `Each piece is 36 × ${fmt(s.pieceIn, 1)} in: a 10 in tread + 7.5 in riser + about 1 in to wrap the nose + 1 in allowance, with the pile running down the stairs.`,
      `That covers about ${fmt(s.netSqft / s.steps, 1)} sq ft per step (Fixr: about ${CARPET.netSqftPerStep}), but you buy ${fmt(s.sqft / s.steps, 1)} sq ft per step because pieces are cut from full-width carpet.`,
      `Pad for the treads: ${fmt(s.padSqft / 9, 1)} sq yd. Carpet and pad at typical prices: about ${fmtMoney(r.materialsCost)}.`,
      `Labor: stairs add $11–$26 per step on top of room pricing (This Old House, 2026) — about ${fmtMoney(r.stairLaborCost)} at ${fmtMoney(CARPET.stairLaborPerStep, { cents: true })}. Fixr's all-in figure is $36–$65 per step, about ${fmtMoney(s.steps * 54)} for ${s.steps} steps at its $54 average.`,
    ],
    table: {
      caption: `Carpet for ${s.steps} stairs by stair width (12 ft roll)`,
      columns: ["Stair width", "Pieces across", "Rows", "Linear ft", "Sq yd"],
      rows: [30, 36, 42, 48].map((w) => {
        const x = carpetStairs(s.steps, w, v.tread, v.riser, 12);
        return [`${w} in`, fmtInt(x.across), fmtInt(x.rows), fmt(x.linearFt, 1), fmt(x.sqyd, 1)];
      }),
    },
    notes: [
      empty > 0
        ? `${s.steps} steps fill ${s.rows} rows of ${s.across} with ${empty} empty slot${empty === 1 ? "" : "s"} in the last row — enough to cover ${empty === 1 ? "a spare step or a small landing patch" : `${empty} more steps or a small landing`} at no extra carpet.`
        : `${s.steps} steps fill ${s.rows} rows of ${s.across} exactly, with no empty slot left in the last row.`,
      `Up to ${s.rows * s.across} steps fit in these ${s.rows} rows; step ${s.rows * s.across + 1} would start a new row and add ${fmt(nextRow.linearFt - s.linearFt, 1)} linear ft (${fmt(nextRow.sqyd - s.sqyd, 1)} sq yd).`,
      "A landing or winder steps need their own measurements; add the landing as a small room in the calculator above. CRI 105 asks for a nose rounded 3/4–1 in so the carpet bends without cracking.",
    ],
  };
}

function presetAnswer(v: CarpetValues): PresetAnswer {
  return v.mode === "stairs" ? stairsAnswer(v) : roomAnswer(v);
}

/* ───────────────────────── long-form guide ───────────────────────── */

function Content() {
  const examples: [number, number][] = [
    [10, 12],
    [12, 12],
    [12, 14],
    [13, 15],
    [14, 16],
    [15, 20],
  ];
  return (
    <>
      <h2>Carpet is bought off a roll, not by the square foot</h2>
      <p>
        Broadloom carpet is cut from rolls of a fixed width — Shaw says most carpet is made <strong>12 ft wide</strong>, with 15 ft on some styles; a few styles come 13 ft 6 in. The store cuts a length off the roll, so what you pay for is <strong>roll width × length cut</strong>, then quoted in square yards
        (sq ft ÷ 9). A room that is 1 ft wider than the roll needs a second full-width drop, which is why two rooms with nearly the same area can need very
        different amounts of carpet.
      </p>
      <p>
        <strong>Worked example — a 13 × 15 ft room:</strong> on a 12 ft roll the cheapest layout runs the roll along the 13 ft wall. That needs two drops (13 ft
        across is more than one 12 ft width), each 13 ft + 3 in trim at both ends = 13 ft 6 in. Two × 13.5 × 12 = <strong>324 sq ft = 36 sq yd</strong> to
        cover 195 sq ft, with one seam. The same room on a 15 ft roll is a single 13 ft 6 in cut: 15 × 13.5 = 202.5 sq ft = 22.5 sq yd, no seam.
      </p>

      <h2>Carpet for common room sizes</h2>
      <table>
        <thead>
          <tr>
            <th>Room</th>
            <th>Area</th>
            <th>12 ft roll</th>
            <th>15 ft roll</th>
          </tr>
        </thead>
        <tbody>
          {examples.map(([a, b]) => {
            const twelve = bestCarpetLayout(b, a, 12, CARPET.trimIn);
            const fifteen = bestCarpetLayout(b, a, 15, CARPET.trimIn);
            const slug = `${a}x${b}-room`;
            const has = CARPET_PRESETS.some((p) => p.slug === slug);
            return (
              <tr key={slug}>
                <td>{has ? <Link href={`${BASE}/${slug}`}>{`${a}×${b} ft`}</Link> : `${a}×${b} ft`}</td>
                <td>{fmt((a * b) / 9, 1)} sq yd</td>
                <td>
                  {fmt(twelve.sqyd, 1)} sq yd{twelve.seams ? `, ${twelve.seams} seam` : ""}
                </td>
                <td>
                  {fmt(fifteen.sqyd, 1)} sq yd{fifteen.seams ? `, ${fifteen.seams} seam` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>All figures include 3 in of trim at each cut end. Check that your style is sold in the wider width before you plan around it.</p>

      <h2>Where the seams go</h2>
      <p>
        Every piece has to keep the same pile direction (CRI 105), so fill strips are cut lengthwise from extra drops rather than turned sideways. When there
        is a choice, CRI 105 places seams so they run the length of the room, parallel to foot traffic, and never across a doorway. Pad seams should sit at right angles to the carpet seams or at least 6 in away from them.
      </p>

      <h2>Pad and tack strip</h2>
      <ul>
        <li>
          <strong>Pad:</strong> buy the room&apos;s area plus about 5%. CRI 105 caps residential cushion at 7/16 in; Shaw&apos;s 2026 warranty allows up to 1/2
          in. A thicker or softer pad than the carpet maker allows can void the carpet warranty.
        </li>
        <li>
          <strong>Tack strip:</strong> runs along every wall but not across door openings. For walls longer than 30 ft, CRI 105 calls for architectural (3-row)
          strip or two rows of standard strip.
        </li>
        <li>
          <strong>Transitions:</strong> every doorway where carpet meets a hard floor needs a transition strip.
        </li>
      </ul>

      <h2>Carpet for stairs</h2>
      <p>
        Each straight step takes a piece as wide as the stair and as long as the tread + riser + about 1 in to wrap the nose + about 1 in of allowance. On a 12
        ft roll, 36 in stairs fit three pieces across, so <Link href={`${BASE}/13-stairs`}>13 steps</Link> need five rows: 5 × 19.5 in = 8.1 linear ft, or 97.5
        sq ft. That covers about 4.6 sq ft per step — close to Fixr&apos;s 4.5 sq ft — but you buy 7.5 sq ft per step. CRI 105 requires the stair nose to be
        rounded 3/4–1 in, and most manufacturers want the pile running down the stairs.
      </p>

      <h2>What carpet costs installed</h2>
      <p>
        This Old House (June 2026) puts carpet labor at $0.50–$1 per sq ft, pad at $0.75–$2 per sq ft installed, and stairs at $11–$26 extra per step;
        tearing out old carpet runs $2–$3 per sq ft. Fixr quotes $36–$65 per step for carpeted stairs all in. &quot;Free installation&quot; promotions often
        exclude stairs, removal and furniture moving, so ask for those lines separately. Let carpet and pad acclimate at least 24 hours at 65–95°F (CRI 105).
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Ordering by floor area: a 13 ft wide room on a 12 ft roll needs far more than its area.</li>
        <li>Forgetting the 3 in trim at each end, or measuring a room that is exactly roll-width with no side allowance.</li>
        <li>Seams in doorways or across the main walkway.</li>
        <li>A pad thicker than the carpet warranty allows.</li>
      </ul>
      <p>
        Doing the rest of the house? Use the <Link href="/flooring/flooring-calculator">flooring calculator</Link> for vinyl plank or hardwood, the{" "}
        <Link href="/flooring/baseboard-calculator">baseboard calculator</Link> for new trim, and the <Link href="/paint/paint-calculator">paint calculator</Link>{" "}
        before the carpet goes down.
      </p>
    </>
  );
}

export const carpetCalculator: CalculatorEntry<CarpetValues> = {
  meta: {
    slug: SLUG,
    category: "flooring",
    name: "Carpet Calculator",
    shortName: "Carpet & stairs",
    h1: "Carpet Calculator: Square Yards, Seams, Pad and Stairs",
    metaTitle: "Carpet Calculator: Square Yards, Rolls & Stairs",
    metaDescription:
      "How much carpet to order for a room or stairs on 12, 13.5 or 15 ft rolls — linear ft, square yards, seams, pad, tack strip and cost. 12×14 room: 19.3 sq yd.",
    summary:
      "Enter the room and pick the roll width to see the real cut — linear feet off the roll, square yards to order, seam placement, pad, tack strip and stairs, with installed cost.",
    outputs: ["Sq yd to order", "Linear ft of roll", "Seam layout", "Stairs"],
    faq: [
      { q: "How much carpet do I need for a 12x14 room?", a: "On a 12 ft roll, one 14 ft 6 in cut (14 ft plus 3 in trim at each end): 174 sq ft, or 19.3 sq yd, with no seam. The room itself is 168 sq ft (18.7 sq yd)." },
      { q: "How wide does carpet come?", a: "Shaw says most carpet is made in 12 ft rolls, with 15 ft available on some styles. 13 ft 6 in exists but is less common. Rooms wider than the roll need a second drop and a seam." },
      { q: "How do I convert square feet to square yards for carpet?", a: "Divide by 9: a 12×14 room is 168 sq ft ÷ 9 = 18.7 sq yd. Order from the roll cut, though, not the area — the 12×14 room takes 19.3 sq yd once trim is added." },
      { q: "How much carpet do I need for 13 stairs?", a: "For 36 in wide stairs with 10 in treads and 7.5 in risers: 19.5 in per step, three steps across a 12 ft roll, five rows — 8.1 linear ft, or 97.5 sq ft (10.8 sq yd)." },
      { q: "What thickness of carpet pad should I buy?", a: "CRI 105 caps residential pad at 7/16 in, and Shaw's warranty recommends no more than 1/2 in. A pad thicker than the carpet maker allows can void the warranty." },
      { q: "How much does carpet installation cost?", a: "This Old House (2026) puts labor at $0.50–$1 per sq ft, stairs at $11–$26 extra per step and carpet removal at $2–$3 per sq ft. Fixr quotes $36–$65 per step for carpeted stairs all in." },
      { q: "Where should carpet seams go?", a: "Per CRI 105, run seams the length of the room, parallel to traffic, never across a doorway, with the pile of every piece running the same way. Offset pad seams at least 6 in from carpet seams." },
    ],
    sources: CARPET_SOURCES,
    related: ["flooring/flooring-calculator", "flooring/baseboard-calculator", "paint/paint-calculator"],
    updated: FLOORING_CHECKED,
    keywords: ["carpet calculator", "square yards of carpet", "carpet for stairs", "carpet roll width", "carpet pad", "how much carpet"],
  },
  Calculator: CarpetCalculator,
  Content,
  presets: CARPET_PRESETS,
  presetAnswer,
};
