import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { aPitch, computePitch, hipFactor, pitchAngle, pitchClass, pitchFactor } from "./compute";
import { METAL_PROFILES, PITCH, PITCH_CLASS_NOTES, PITCH_SOURCES, ROOFING_CHECKED } from "./data";
import PitchCalculator from "./PitchCalculator";
import { PITCH_DEFAULTS, pitchInputFrom, type PitchValues } from "./pitch-model";

const SLUG = "roof-pitch-calculator";
const BASE = `/roofing/${SLUG}`;
const PRESET_PITCHES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const SPANS = [24, 28, 32];

function roofingFor(rise: number): string {
  const metalRib = METAL_PROFILES[0];
  if (rise < PITCH.standingSeamMin) return "Too flat for any steep-slope roofing: use a low-slope membrane.";
  if (rise < PITCH.shingleMin)
    return `Too flat for shingles (2/12 minimum). Options: standing seam (¼/12+)${rise >= PITCH.metalSealedMin ? ", lapped metal panels with sealant in every lap (½/12+)" : ""} or a membrane.`;
  if (rise < PITCH.metalLappedMin)
    return `Shingles are allowed with two layers of underlayment. Lapped metal panels need sealant in the laps below 3/12${rise >= metalRib.minRise ? `, though ${metalRib.short} makers rate them from ${metalRib.minRise}/12` : ""}.`;
  if (rise < PITCH.doubleUnderlaymentBelow) return "Shingles are allowed with two layers of underlayment; lapped metal panels and standing seam are fine.";
  return "Shingles over a single layer of underlayment, and any metal roof.";
}

export const PITCH_PRESETS: Preset<PitchValues>[] = PRESET_PITCHES.map((n) => {
  const deg = pitchAngle(n);
  return {
    slug: `${n}-12-pitch`,
    values: { ...PITCH_DEFAULTS, mode: "pitch", rise: n },
    group: n < 4 ? "Low-slope pitches" : n < 8 ? "Common house pitches" : "Steep pitches",
    label: `${n}/12 = ${fmt(deg, 1)}°`,
    h1: `What is ${aPitch(n)} roof pitch in degrees?`,
    metaTitle: `${n}/12 Roof Pitch: ${fmt(deg, 2)}° Angle & ${fmt(pitchFactor(n), 3)} Multiplier`,
    metaDescription: `${aPitch(n, true)} roof rises ${n} in per foot: ${fmt(deg, 2)}°, a ${fmt((n / 12) * 100, 1)}% grade, slope multiplier ${fmt(pitchFactor(n), 3)} and hip factor ${fmt(hipFactor(n), 3)}. Rafter lengths and allowed roofing.`,
  };
});

function presetAnswer(v: PitchValues): PresetAnswer {
  const r = computePitch(pitchInputFrom(v));
  const n = r.rise;
  const note = PITCH_CLASS_NOTES[pitchClass(n)];
  const rafters = SPANS.map((s) => `${s} ft → ${formatFeetInches(computePitch(pitchInputFrom({ ...v, span: s, oh: 12 })).rafterFt)}`);
  const neighbors = [n - 2, n - 1, n, n + 1, n + 2].filter((x) => x >= 1);
  return {
    headline: `${aPitch(n, true)} pitch rises ${fmt(n, 2)} inches for every 12 inches of run: ${fmt(r.angleDeg, 2)}° (a ${fmt(r.gradePct, 1)}% grade), with a slope multiplier of ${fmt(r.factor, 3)}.`,
    bullets: [
      `Roof area: every 100 sq ft of plan becomes ${fmt(100 * r.factor, 1)} sq ft of roof, so a 1,500 sq ft footprint (overhangs included) has ${fmt(15 * r.factor, 1)} squares of roof at ${fmt(n, 2)}/12.`,
      `Hips and valleys: factor ${fmt(r.hipFactor, 3)} — on a 28-ft-wide hip roof each hip is 14 × ${fmt(r.hipFactor, 3)} = ${fmt(14 * r.hipFactor, 1)} ft long.`,
      `Common rafters with 12-in overhangs: ${rafters.join(", ")}. On a 28-ft span the ridge sits ${formatFeetInches(14 * (n / 12))} above the wall plates.`,
      `Roofing: ${roofingFor(n)}`,
      `${note.title}: ${note.body}`,
    ],
    table: {
      caption: `Pitches around ${fmt(n, 2)}/12`,
      columns: ["Pitch", "Angle", "Grade", "Multiplier", "Hip/valley"],
      rows: neighbors.map((x) => [`${x}/12`, `${fmt(pitchAngle(x), 2)}°`, `${fmt((x / 12) * 100, 1)}%`, fmt(pitchFactor(x), 3), fmt(hipFactor(x), 3)]),
    },
    notes: [
      `Angle = arctan(${fmt(n, 2)} ÷ 12) = ${fmt(r.angleDeg, 2)}°. Slope multiplier = √(1 + (${fmt(n, 2)} ÷ 12)²) = ${fmt(r.factor, 4)}. Hip/valley factor = √(2 + (${fmt(n, 2)} ÷ 12)²) = ${fmt(r.hipFactor, 4)}, applied to half the building width.`,
      `Rafter length is (half the span + the level overhang) × ${fmt(r.factor, 3)}: for a 28-ft span with a 1-ft overhang, (14 + 1) × ${fmt(r.factor, 3)} = ${fmt(15 * r.factor, 2)} ft, measured along the top edge before the ridge-board deduction and tail cuts.`,
    ],
  };
}

function Content() {
  const pitches = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
  return (
    <>
      <h2>What roof pitch means</h2>
      <p>
        Pitch is the rise of the roof, in inches, for every 12 inches it runs horizontally. A <strong>6/12</strong> roof climbs 6 in per foot —
        26.57°, or a 50% grade. Roofers, building codes and shingle makers all work in x/12, while phone apps and angle finders read degrees; the
        calculator converts both ways and adds the two multipliers you need to order material.
      </p>

      <h2>Pitch, slope and angle</h2>
      <p>
        On a modern job site &quot;pitch&quot; and &quot;slope&quot; both mean rise over a 12-in run. Older carpentry books define pitch as rise over
        the full <em>span</em> instead, so a 6/12 slope is a &quot;¼ pitch&quot; and a 12/12 slope a &quot;½ pitch&quot; — if a plan gives a single
        fraction, that is what it means. Angle is the same slope in degrees: 12 × tan(angle) converts it back to x/12. Percent grade, used for
        low-slope and site work, is simply rise ÷ run × 100, so 6/12 is a 50% grade.
      </p>

      <h2>Pitch to degrees and multipliers</h2>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Pitch</th>
            <th>Angle</th>
            <th>Slope multiplier</th>
            <th>Hip/valley factor</th>
          </tr>
        </thead>
        <tbody>
          {pitches.map((x) => (
            <tr key={x}>
              <td>
                <Link href={`${BASE}/${x}-12-pitch`}>{x}/12</Link>
              </td>
              <td>{fmt(pitchAngle(x), 2)}°</td>
              <td>{fmt(pitchFactor(x), 3)}</td>
              <td>{fmt(hipFactor(x), 3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p>
        The <strong>slope multiplier</strong> is √(1 + (rise/12)²). Multiply the plan area of the roof — the footprint plus overhangs, as seen
        from above — by it to get the real surface you&apos;ll cover. The <strong>hip/valley factor</strong>, √(2 + (rise/12)²), does the same for
        hips and valleys: multiply half the building width by it. CertainTeed&apos;s applicator manual prints 1.524 for 7/12; the exact value is
        1.530.
      </p>

      <h2>How to measure your pitch</h2>
      <p>You don&apos;t need to walk on the roof. Any of these works:</p>
      <ul>
        <li>
          <strong>Level and tape, in the attic:</strong> hold a level horizontally against the bottom edge of a rafter, mark 12 in from the end
          that touches, and measure straight up from the mark to the rafter. A 6-in reading is a 6/12 pitch.
        </li>
        <li>
          <strong>At the gable, from a ladder:</strong> do the same against the rake board or fascia at the end of the house. A longer level (24
          in) and halving the result reduces error.
        </li>
        <li>
          <strong>Phone or angle finder:</strong> lay it on the shingles or a rafter, read the degrees, and enter them in Angle mode. 12 × tan(angle)
          gives the rise: 30° is 6.93/12.
        </li>
      </ul>

      <h2>Rafter length from the pitch</h2>
      <p>
        A common rafter covers the run — half the building width — plus the overhang, stretched by the slope multiplier. For a 28-ft-wide house at
        6/12 with a 12-in overhang: (14 + 1) × 1.118 = 16.77 ft, or about 16&apos; 9¼&quot;, measured along the top edge. Subtract half the ridge
        board&apos;s thickness and allow for the plumb cut at the top and the tail cut at the bottom when you lay out the stock, then buy the next
        standard length up (18 ft here). The ridge sits 14 × 6/12 = 7 ft above the top of the walls.
      </p>

      <h2>What each pitch allows</h2>
      <ul>
        <li>
          <strong>Under 2/12:</strong> no shingles (IRC R905.2.2). Use a membrane, standing seam metal (¼/12 and up) or sealed lapped metal (½/12
          and up).
        </li>
        <li>
          <strong>2/12 to under 4/12:</strong> shingles only over two layers of underlayment; CertainTeed asks for self-adhered membrane over the
          entire deck. Lapped metal panels need sealant in the laps below 3/12.
        </li>
        <li>
          <strong>4/12 to 7/12:</strong> the comfortable, walkable range. Single-layer underlayment and four nails per shingle.
        </li>
        <li>
          <strong>8/12 and steeper:</strong> roofers charge roughly $50–100 more per square, and where an ice barrier is required it must reach at
          least 36 in up the slope.
        </li>
        <li>
          <strong>Over 21/12:</strong> six nails and four dabs of roof cement per shingle.
        </li>
      </ul>

      <h2>Common mistakes</h2>
      <ul>
        <li>Measuring along the sloped roof instead of level — the run must be horizontal.</li>
        <li>Using the pitch multiplier on hips and valleys; they need the hip/valley factor.</li>
        <li>Applying the hip factor to the hip&apos;s diagonal in plan rather than to half the building width.</li>
        <li>Assuming every face has the same pitch — porches and additions often differ, so measure each one.</li>
      </ul>
      <p>
        With the pitch in hand, the <Link href="/roofing/roofing-calculator">roofing calculator</Link> turns your footprint into squares, bundles and
        the full shingle order — for example a <Link href="/roofing/roofing-calculator/30x40-house-6-12-pitch">30×40 house at 6/12</Link>. Going
        metal? Try the <Link href="/roofing/metal-roofing-calculator">metal roofing calculator</Link>.
      </p>
    </>
  );
}

export const pitchCalculator: CalculatorEntry<PitchValues> = {
  meta: {
    slug: SLUG,
    category: "roofing",
    name: "Roof Pitch Calculator",
    shortName: "Pitch & angle",
    h1: "Roof Pitch Calculator",
    metaTitle: "Roof Pitch Calculator: x/12 to Degrees & Multiplier",
    metaDescription:
      "Convert roof pitch to degrees and back (6/12 = 26.57°), get the slope multiplier, hip/valley factor and rafter length, and measure your pitch with a level.",
    summary:
      "Enter a pitch, an angle or a measured rise and run to get degrees, the slope multiplier, hip/valley factor, rafter length and what roofing your pitch allows.",
    outputs: ["Pitch ↔ degrees", "Slope multiplier", "Rafter length", "Allowed roofing"],
    faq: [
      {
        q: "What is a 6/12 roof pitch in degrees?",
        a: "26.57°. A 6/12 roof rises 6 inches per foot of run, a 50% grade, and its slope multiplier is 1.118 — every 100 sq ft of plan becomes 111.8 sq ft of roof.",
      },
      {
        q: "What is a 4/12 pitch?",
        a: "A roof that rises 4 inches for every 12 inches of run: 18.43°, a 33.3% grade, multiplier 1.054. It is the lowest pitch where shingles go on over a single layer of underlayment.",
      },
      {
        q: "How do I measure roof pitch with a level?",
        a: "Hold a level horizontally against a rafter in the attic or the rake board at the gable end, mark 12 inches along it, and measure straight up from the mark to the roof line. That measurement in inches is your pitch over 12.",
      },
      {
        q: "How do I convert degrees to roof pitch?",
        a: "Rise = 12 × tan(angle). 30° is 12 × 0.577 = 6.93, so about a 7/12 pitch; 45° is exactly 12/12.",
      },
      {
        q: "What is the minimum roof pitch for shingles and metal?",
        a: "Asphalt shingles need at least 2/12, with two layers of underlayment below 4/12 (IRC R905.2.2). Lapped metal panels need 3/12, or ½/12 with sealant in every lap; standing seam goes down to ¼/12. Makers of 36-in rib panels list 2½/12.",
      },
      {
        q: "How do I calculate rafter length from the pitch?",
        a: "Multiply the run (half the building width) plus the level overhang by the slope multiplier. A 28-ft span at 6/12 with a 12-in overhang: (14 + 1) × 1.118 = 16.77 ft along the top edge, before the ridge-board deduction and end cuts.",
      },
    ],
    sources: PITCH_SOURCES,
    related: ["roofing/roofing-calculator", "roofing/metal-roofing-calculator", "solar/solar-panel-calculator", "lumber/plywood-calculator"],
    updated: ROOFING_CHECKED,
    keywords: ["roof pitch calculator", "roof pitch to degrees", "pitch multiplier", "roof slope", "rafter length", "6/12 pitch", "4/12 pitch", "roof angle"],
  },
  Calculator: PitchCalculator,
  Content,
  presets: PITCH_PRESETS,
  presetAnswer,
};
