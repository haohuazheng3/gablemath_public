import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney, plural } from "@/lib/format";
import { aPitch, autoWastePct, bundlesFor, computeRoof, pitchAngle, pitchFactor, type RoofResult } from "./compute";
import { INSTALLED_PER_SQUARE, ROOFING_CHECKED, ROOFING_SOURCES, SHINGLES, SHINGLE_LB_PER_SQUARE, WASTE_TABLE, shingle, underlayment } from "./data";
import RoofingCalculator from "./RoofingCalculator";
import { ROOFING_DEFAULTS, roofingInputFrom, type RoofingValues } from "./roofing-model";

const SLUG = "roofing-calculator";
const BASE = `/roofing/${SLUG}`;

/* ───────── programmatic presets ───────── */

const SIZE_NOTES: Record<string, string> = {
  "25x40": "1,000 sq ft is a typical small ranch footprint — and also the footprint of a 2,000 sq ft two-story house.",
  "30x40": "30×40 (1,200 sq ft) is a common ranch and Cape footprint.",
  "30x50": "A 30×50 footprint (1,500 sq ft) fits a three-bedroom ranch or a 3,000 sq ft two-story.",
  "36x50": "36×50 (1,800 sq ft) is a roomy single-story ranch; the deeper 36-ft width also means longer rafters.",
  "40x50": "A 40×50 footprint (2,000 sq ft) is a large ranch — or a 4,000 sq ft two-story.",
  "50x50": "2,500 sq ft is a big single-story footprint, often with attached-garage wings — expect valleys in real life.",
  "50x60": "A 3,000 sq ft footprint is usually a large ranch with an attached garage; check for cross gables and valleys.",
  "10x12": "10×12 is a common backyard shed size; at this scale the waste table's small-roof 8% and the single starter and ridge-cap bundles dominate the order.",
  "12x16": "12×16 is a common storage shed or small workshop.",
  "24x24": "24×24 is a common two-car garage size.",
};

const PITCH_NOTES: Record<number, string> = {
  4: "4/12 is the lowest pitch that takes a single layer of underlayment, and it is easy to walk.",
  6: "6/12 is a very common house pitch: still walkable, and it adds 11.8% to the plan area.",
  8: "8/12 is where roofs stop being walkable: crews typically charge $50–100 more per square, and the ice barrier must reach at least 36 in up the slope.",
};

type FootSpec = { a: number; b: number; pitch: number; group: string; oh: number; small?: boolean };

const FOOTPRINTS: [number, number][] = [
  [25, 40],
  [30, 40],
  [30, 50],
  [36, 50],
  [40, 50],
  [50, 50],
  [50, 60],
];

const FOOT_SPECS: FootSpec[] = [
  ...[4, 6, 8].flatMap((pitch) => FOOTPRINTS.map(([a, b]) => ({ a, b, pitch, oh: 12, group: `${pitch}/12 pitch houses` }))),
  { a: 10, b: 12, pitch: 4, oh: 6, group: "Sheds & garages", small: true },
  { a: 12, b: 16, pitch: 4, oh: 6, group: "Sheds & garages", small: true },
  { a: 24, b: 24, pitch: 6, oh: 12, group: "Sheds & garages", small: true },
];

const ROOF_AREAS = [1000, 1500, 2000, 2500, 3000];
/** Area presets assume a simple 6/12 gable 1.5 times as long as it is wide to estimate edge lengths. */
const AREA_PITCH = 6;
const AREA_ASPECT = 1.5;

function areaEdges(area: number) {
  const pf = pitchFactor(AREA_PITCH);
  const w = Math.sqrt(area / pf / AREA_ASPECT);
  const l = w * AREA_ASPECT;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { w, l, eaves: r1(2 * l), rakes: r1(2 * w * pf), ridge: r1(l) };
}

function footValues(s: FootSpec): RoofingValues {
  return {
    ...ROOFING_DEFAULTS,
    l: s.b,
    w: s.a,
    pitch: s.pitch,
    oh: s.oh,
    // New sheds: no tear-off, no attic venting, felt instead of a 1,000 sq ft synthetic roll.
    ...(s.small && s.a * s.b < 400 ? { iw: "none", layers: 0, vent: false, under: "felt15" } : {}),
  };
}

function areaValues(area: number): RoofingValues {
  const e = areaEdges(area);
  return { ...ROOFING_DEFAULTS, mode: "area", area, pitch: AREA_PITCH, eaves: e.eaves, rakes: e.rakes, ridge: e.ridge, hips: 0, valleys: 0 };
}

const roofOf = (v: RoofingValues) => computeRoof(roofingInputFrom(v));

export const ROOFING_PRESETS: Preset<RoofingValues>[] = [
  ...FOOT_SPECS.map((s) => {
    const v = footValues(s);
    const r = roofOf(v);
    const shed = s.small && s.a * s.b < 400;
    const what = shed ? "shed" : s.small ? "garage" : "house";
    return {
      slug: `${s.a}x${s.b}-${what}-${s.pitch}-12-pitch`,
      values: v,
      group: s.group,
      label: `${s.a}×${s.b} ${what}${s.small ? "" : ` (${fmtInt(s.a * s.b)} sq ft)`}, ${s.pitch}/12`,
      h1: s.small
        ? `How many bundles of shingles for a ${s.a}×${s.b} ${what} roof?`
        : `How many roofing squares for a ${s.a}×${s.b} house with ${aPitch(s.pitch)} pitch?`,
      metaTitle: s.small ? `Shingles for a ${s.a}x${s.b} ${what === "shed" ? "Shed" : "Garage"} Roof (${s.pitch}/12)` : `Roofing Squares for a ${s.a}x${s.b} House, ${s.pitch}/12 Pitch`,
      metaDescription: `A ${s.a}×${s.b} ${what} with ${aPitch(s.pitch)} roof and ${s.oh}-in overhangs is ${fmt(r.squares, 1)} squares: ${fmtInt(r.bundles)} shingle bundles with waste, ${r.starter.qty} starter and ${r.cap.qty} ridge-cap ${plural(r.cap.qty, "bundle")}.`,
    };
  }),
  ...ROOF_AREAS.map((area) => {
    const r = roofOf(areaValues(area));
    const noWaste = bundlesFor(area, 0, shingle("generic").sqftPerBundle);
    return {
      slug: `${area}-sq-ft-roof`,
      values: areaValues(area),
      group: "By roof area",
      label: `${fmtInt(area)} sq ft roof (${area / 100} squares)`,
      h1: `How many bundles of shingles for a ${fmtInt(area)} sq ft roof?`,
      metaTitle: `Shingles for a ${fmtInt(area)} sq ft Roof: Bundles & Squares`,
      metaDescription: `A ${fmtInt(area)} sq ft roof is ${area / 100} squares: ${noWaste} bundles of 32.8 sq ft shingles before waste, ${r.bundles} with ${r.wastePct}% waste. Compare GAF, OC, CertainTeed & IKO.`,
    };
  }),
];

function accessoriesLine(v: RoofingValues, r: RoofResult): string {
  const parts = [
    `${r.starter.qty} ${plural(r.starter.qty, "bundle")} of starter for ${fmtInt(r.starter.lf)} ft of eaves and rakes`,
    `${r.cap.qty} ${plural(r.cap.qty, "bundle")} of ridge cap for ${fmtInt(r.cap.lf)} ft of ridge${r.edges.hips > 0 ? " and hips" : ""}`,
    `${r.underlayment.qty} ${plural(r.underlayment.qty, "roll")} of ${underlayment(v.under).id === "synthetic" ? "synthetic underlayment" : underlayment(v.under).name.split(",")[0]}`,
    ...(r.iceWater && r.iceWater.qty > 0 ? [`${r.iceWater.qty} ${plural(r.iceWater.qty, "roll")} of ice & water shield (${r.iceWater.courses} ${plural(r.iceWater.courses, "course")} at the eaves)`] : []),
    `${r.dripEdge.qty} pieces of drip edge`,
    r.nails.pack === "hand"
      ? `about ${fmtInt(r.nails.total)} roofing nails (${r.nails.qty} × 5-lb ${plural(r.nails.qty, "box", "boxes")} for hand nailing)`
      : `${r.nails.qty} ${plural(r.nails.qty, "box", "boxes")} of coil nails`,
  ];
  return `Also on the list: ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.`;
}

function costLine(r: RoofResult, v: RoofingValues): string {
  if (v.layers === 0) return `Cost: about ${fmtMoney(r.materialsCost)} in materials at October 2026 shelf prices, before tax.`;
  return `Cost: about ${fmtMoney(r.materialsCost)} in materials at October 2026 shelf prices, or roughly ${fmtMoney(r.installed.total)} hired (${fmtMoney(r.installed.low)}–${fmtMoney(r.installed.high)}) at $${INSTALLED_PER_SQUARE.architectural.low}–${INSTALLED_PER_SQUARE.architectural.high} per square with tear-off${r.installed.steep > 0 ? ", plus the steep-roof surcharge" : ""}.`;
}

function debrisLine(r: RoofResult): string {
  if (!r.debris?.dumpster) return "";
  const d = r.debris.dumpster;
  return `Tear-off: one layer of architectural shingles weighs about ${fmt(r.debris.tons, 1)} tons (${fmt(r.debris.cubicYards, 1)} cu yd) — book a ${d.count > 1 ? `${d.count} × ` : ""}${d.yd}-yard dumpster${d.overTons > 0 ? ` and expect about ${fmt(d.overTons, 1)} tons of overage` : ` (about ${fmt(d.tonsIncluded, 1)} ${plural(d.tonsIncluded, "ton")} included)`}.`;
}

function footprintAnswer(v: RoofingValues, r: RoofResult): PresetAnswer {
  const a = Math.min(v.l, v.w);
  const b = Math.max(v.l, v.w);
  const key = `${a}x${b}`;
  const g = r.geometry!;
  const small = a * b < 800;
  const what = small ? (a * b < 400 ? "shed" : "garage") : "house";
  const hip = roofOf({ ...v, style: "hip" });
  const rows = [3, 4, 5, 6, 7, 8, 9, 10, 12].map((pitch) => {
    const x = roofOf({ ...v, pitch });
    return [`${pitch}/12`, fmt(pitchFactor(pitch), 3), fmtInt(x.roofAreaSqFt), fmt(x.squares, 1), fmtInt(x.bundles), x.iceWater ? fmtInt(x.iceWater.qty) : "—"];
  });
  const notes = [
    `With ${v.oh}-in overhangs the roof covers ${fmt(g.widthFt, 2)} × ${fmt(g.lengthFt, 2)} ft = ${fmtInt(g.planAreaSqFt)} sq ft of plan. ${aPitch(v.pitch, true)} pitch multiplies that by √(1 + (${v.pitch}/12)²) = ${fmt(r.pitchFactor, 4)}, giving ${fmt(r.roofAreaSqFt, 1)} sq ft. CertainTeed's waste table puts a ${fmtInt(r.roofAreaSqFt)} sq ft gable at ${r.wastePct}%, so ${fmt(r.roofAreaSqFt, 1)} × ${fmt(1 + r.wastePct / 100, 2)} ÷ 32.8 sq ft per bundle = ${fmt((r.roofAreaSqFt * (1 + r.wastePct / 100)) / 32.8, 2)}, rounded up to ${r.bundles} bundles.`,
    `As a hip roof the surface is the same, but the edges change: ${fmtInt(hip.edges.eaves)} ft of eaves and ${fmtInt(hip.edges.hips)} ft of hips need ${hip.starter.qty} starter and ${hip.cap.qty} ridge-cap bundles, and the waste allowance rises from ${r.wastePct}% to ${hip.wastePct}% — ${hip.bundles} bundles instead of ${r.bundles}.`,
  ];
  if (!small) {
    const half = roofOf({ ...v, l: b / Math.SQRT2, w: a / Math.SQRT2 });
    notes.push(
      `Is ${fmtInt(a * b)} sq ft your living area rather than the footprint? On a two-story house the footprint is about ${fmtInt((a * b) / 2)} sq ft, and the same ${v.pitch}/12 roof drops to about ${fmt(half.squares, 1)} squares and ${half.bundles} bundles. Always measure the outside of the house, one floor.`,
    );
  }
  if (r.iceWater && r.iceWater.qty > 0) {
    notes.push(
      `Ice & water shield: (${v.oh} in of overhang + 6 in of wall + 24 in inside it) × ${fmt(r.pitchFactor, 3)} = ${fmt(r.iceWater.requiredIn, 0)} in up the slope${v.pitch >= 8 ? " (and never less than 36 in at 8/12 or steeper)" : ""}, so ${r.iceWater.courses} ${plural(r.iceWater.courses, "course")} of 36-in membrane along ${fmtInt(r.edges.eaves)} ft of eaves — ${r.iceWater.qty} rolls of 65 ft after 6-in end laps.`,
    );
  }
  return {
    headline: `A ${a} × ${b} ft ${what} with ${aPitch(v.pitch)} gable roof and ${v.oh}-in overhangs has about ${fmtInt(r.roofAreaSqFt)} sq ft of roof — ${fmt(r.squares, 1)} squares. Order ${r.bundles} bundles of architectural shingles, including ${r.wastePct}% waste.`,
    bullets: [
      `Shingles: ${fmtInt(r.roofAreaSqFt)} sq ft + ${r.wastePct}% waste ÷ 32.8 sq ft per bundle = ${r.bundles} bundles. ${r.bundles >= 39 ? "That clears the 39-bundle bulk tier many yards offer (about $4–5 less per bundle)." : `That is under the 39-bundle bulk tier, so expect single-bundle prices${r.bundles >= 33 ? " — or round up to 39 if the bulk price makes it cheaper" : ""}.`}`,
      accessoriesLine(v, r),
      `Weight: ${r.bundles} bundles come to about ${r.shingleWeightLb >= 2000 ? `${fmt(r.shingleWeightLb / 2000, 1)} tons` : `${fmtInt(r.shingleWeightLb)} lb`}, roughly ${fmtInt(r.shingleWeightLb / r.bundles)} lb each — check your truck's payload before hauling them yourself.`,
      costLine(r, v),
      debrisLine(r),
      PITCH_NOTES[v.pitch] ?? "",
      SIZE_NOTES[key] ?? "",
    ].filter(Boolean),
    table: {
      caption: `The same ${a}×${b} footprint at other pitches`,
      columns: ["Pitch", "Multiplier", "Roof sq ft", "Squares", "Bundles", "Ice & water rolls"],
      rows,
    },
    notes,
  };
}

function areaAnswer(v: RoofingValues, r: RoofResult): PresetAnswer {
  const area = v.area;
  const e = areaEdges(area);
  const gw = autoWastePct(area, "gable");
  const hw = autoWastePct(area, "hip");
  const generic = shingle("generic");
  const naive = (area / 100) * 3;
  const covered = naive * generic.sqftPerBundle;
  const felt = roofOf({ ...v, under: "felt15" });
  const rows = SHINGLES.filter((x) => x.id !== "custom").map((x) => {
    const g = bundlesFor(area, gw, x.sqftPerBundle);
    const h = bundlesFor(area, hw, x.sqftPerBundle);
    const price = x.bulk && g >= x.bulk.minBundles ? x.bulk.price : x.price;
    return [x.short, fmt(x.sqftPerBundle, 1), fmtInt(g), fmtInt(h), fmtMoney(g * price)];
  });
  return {
    headline: `A ${fmtInt(area)} sq ft roof is ${area / 100} squares — ${bundlesFor(area, 0, generic.sqftPerBundle)} bundles of 32.8-sq-ft architectural shingles before waste, ${bundlesFor(area, gw, generic.sqftPerBundle)} for a simple gable (${gw}% waste) or ${bundlesFor(area, hw, generic.sqftPerBundle)} for a hip roof (${hw}%).`,
    bullets: [
      `Why not just ${area / 100} × 3 = ${fmtInt(naive)} bundles? GAF Timberline HDZ and Owens Corning Duration bundles cover 32.8 sq ft (98.4 per 3-bundle square), so ${fmtInt(naive)} bundles only cover ${fmtInt(covered)} sq ft — ${fmtInt(area - covered)} sq ft short before any waste.`,
      `CertainTeed Landmark and IKO Cambridge cover 33⅓ sq ft per bundle (${bundlesFor(area, gw, 100 / 3)} bundles with gable waste); IKO Marathon 3-tab covers 32.3 (${bundlesFor(area, gw, 32.3)}); a 4-bundle line such as CertainTeed NorthGate needs ${bundlesFor(area, gw, 25)}.`,
      `Underlayment and nails: ${r.underlayment.qty} rolls of synthetic (929 sq ft net each) or ${felt.underlayment.qty} rolls of #15 felt, and ${r.nails.coilBoxes} ${plural(r.nails.coilBoxes, "box", "boxes")} of 7,200 coil nails at 4 per shingle (${r.nails.perSquare} per square).`,
      `Weight: ${r.bundles} bundles of architectural shingles weigh about ${fmt(r.shingleWeightLb / 2000, 1)} tons (roughly ${fmtInt(r.shingleWeightLb / Math.max(r.bundles, 1))} lb a bundle) — check your truck's payload before hauling them yourself.`,
      `Starter, ridge cap and drip edge depend on edge lengths, not area. For a simple ${AREA_PITCH}/12 gable about ${fmtInt(e.w)} × ${fmtInt(e.l)} ft that is ${r.starter.qty} starter ${plural(r.starter.qty, "bundle")}, ${r.cap.qty} ridge-cap ${plural(r.cap.qty, "bundle")} and ${r.dripEdge.qty} pieces of drip edge — enter your own edges above for exact counts.`,
      costLine(r, v),
      debrisLine(r),
    ].filter(Boolean),
    table: {
      caption: `Bundles for ${fmtInt(area)} sq ft by shingle line`,
      columns: ["Line", "Sq ft / bundle", `Gable (+${gw}%)`, `Hip (+${hw}%)`, "Cost (gable)"],
      rows,
    },
    notes: [
      `${fmtInt(area)} sq ft ÷ 100 = ${area / 100} squares. Add waste — ${gw}% for a gable this size or ${hw}% for a hip, from CertainTeed's Shingle Applicator's Manual — then divide by the coverage per bundle: ${fmtInt(area)} × ${fmt(1 + gw / 100, 2)} ÷ 32.8 = ${fmt((area * (1 + gw / 100)) / 32.8, 1)}, rounded up to ${bundlesFor(area, gw, 32.8)} bundles.`,
      `If your ${fmtInt(area)} sq ft is the house's floor area rather than a measured roof area, the roof is bigger: add the overhangs and multiply by the pitch factor (1.118 at 6/12). Switch the calculator to "House footprint" to do that.`,
    ],
  };
}

function presetAnswer(v: RoofingValues): PresetAnswer {
  const r = roofOf(v);
  return v.mode === "area" ? areaAnswer(v, r) : footprintAnswer(v, r);
}

/* ───────── long-form guide ───────── */

function Content() {
  const ex = roofOf(ROOFING_DEFAULTS);
  const g = ex.geometry!;
  const lineup = SHINGLES.filter((x) => x.id !== "custom");
  return (
    <>
      <h2>How to calculate roofing squares and bundles</h2>
      <p>
        Roofing is ordered by the <strong>square</strong> — 100 sq ft of roof surface. Start from the outside footprint of the house (one floor, not
        the living area), add the overhang on every side, multiply length by width, and multiply by the <strong>pitch factor</strong>. That works
        for gable and hip roofs alike as long as every plane has the same pitch. Divide by 100 for squares, add waste, and divide by what one
        bundle covers.
      </p>
      <p>
        <strong>Worked example — a 30 × 40 ft house, 6/12 pitch, 12-in overhangs:</strong> the roof covers {fmt(g.widthFt)} × {fmt(g.lengthFt)} ={" "}
        {fmtInt(g.planAreaSqFt)} sq ft of plan. × {fmt(ex.pitchFactor, 3)} = {fmtInt(ex.roofAreaSqFt)} sq ft, or {fmt(ex.squares, 1)} squares. Add{" "}
        {ex.wastePct}% waste and divide by 32.8 sq ft per bundle: <strong>{ex.bundles} bundles</strong>. See it worked out for{" "}
        <Link href={`${BASE}/30x40-house-6-12-pitch`}>a 30×40 house at 6/12</Link> or{" "}
        <Link href={`${BASE}/2000-sq-ft-roof`}>a 2,000 sq ft roof</Link>.
      </p>

      <h2>Pitch multipliers</h2>
      <p>
        Pitch is the inches of rise per 12 inches of run. The multiplier is √(1 + (rise/12)²); the hip/valley factor, √(2 + (rise/12)²), turns
        half the building width into the length of each hip. Don&apos;t know your pitch? The{" "}
        <Link href="/roofing/roof-pitch-calculator">roof pitch calculator</Link> shows three ways to measure it without walking the roof.
      </p>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Pitch</th>
            <th>Angle</th>
            <th>Multiplier</th>
            <th>1,000 sq ft of plan becomes</th>
          </tr>
        </thead>
        <tbody>
          {[3, 4, 5, 6, 7, 8, 9, 10, 12].map((x) => (
            <tr key={x}>
              <td>{x}/12</td>
              <td>{fmt(pitchAngle(x), 1)}°</td>
              <td>{fmt(pitchFactor(x), 3)}</td>
              <td>{fmtInt(1000 * pitchFactor(x))} sq ft</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2>Not every bundle covers 33⅓ sq ft</h2>
      <p>
        The old rule — three bundles make a 100 sq ft square — is only roughly true. GAF Timberline HDZ and Owens Corning Duration are
        &quot;metric&quot; shingles: 64 pieces of 39⅜ in at a 5⅝-in exposure cover <strong>98.4 sq ft per three bundles</strong>, or 32.8 per
        bundle, even when the store label says 33.33. Ordering by the label leaves you about 1.6% short. Heavy designer lines pack less:
        CertainTeed NorthGate and Belmont are four bundles per square, Grand Manor and Carriage House five. Landmark PRO is three, not four.
      </p>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Line</th>
            <th>Sq ft / bundle</th>
            <th>Matching starter</th>
            <th>Matching ridge cap</th>
          </tr>
        </thead>
        <tbody>
          {lineup.map((x) => (
            <tr key={x.id}>
              <td>{x.short}</td>
              <td>{fmt(x.sqftPerBundle, 1)}</td>
              <td>
                {x.starter.name}, {fmt(x.starter.lfPerBundle, 1)} ft
              </td>
              <td>
                {x.cap.name}, {fmt(x.cap.lfPerBundle, 1)} ft
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2>How much waste to add</h2>
      <p>
        A flat 10% for gables and 15% for hips is what most people use, and CertainTeed&apos;s own applicator manual calls it too high for larger
        roofs. Its table scales with size and shape — and cut-up roofs with dormers and valleys need 3–5 points more:
      </p>
      <table>
        <thead>
          <tr>
            <th>Roof area</th>
            <th>Gable</th>
            <th>Hip</th>
          </tr>
        </thead>
        <tbody>
          {WASTE_TABLE.areaSqFt.map((a, i) => (
            <tr key={a}>
              <td>{fmtInt(a)} sq ft</td>
              <td>{WASTE_TABLE.gable[i]}%</td>
              <td>{WASTE_TABLE.hip[i]}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>The rest of the shopping list</h2>
      <ul>
        <li>
          <strong>Starter strip</strong> along every eave — and along the rakes too if you want the enhanced wind warranties from GAF, Owens Corning
          or Atlas. Bundles cover 102–140 ft depending on the brand.
        </li>
        <li>
          <strong>Hip & ridge cap</strong> for the ridge plus every hip: 20–33 ft per bundle. CertainTeed Shadow Ridge comes in a 30-ft and a 45-ft
          pack under the same name, so read the wrapper.
        </li>
        <li>
          <strong>Underlayment:</strong> a &quot;10-square&quot; synthetic roll covers about 929 sq ft once the laps are taken out. Between 2/12 and
          4/12 the IRC requires two layers, which roughly doubles the rolls; under 2/12 shingles aren&apos;t allowed at all.
        </li>
        <li>
          <strong>Ice & water shield</strong> must run from the eave to 24 in <em>inside the exterior wall, measured level</em> — not 24 in up the
          roof. With a 12-in overhang and 2×6 walls that is about 47 in up a 6/12 roof: two courses of 36-in membrane. Steeper than 8/12, it must
          also reach at least 36 in along the slope. Line valleys with a 36-in strip.
        </li>
        <li>
          <strong>Drip edge</strong> on eaves and rakes in 10-ft pieces lapped 2 in, nailed every 12 in. Underlayment goes over it at the eaves and
          under it at the rakes.
        </li>
        <li>
          <strong>Nails:</strong> the code minimum is four per shingle — 256 per square for GAF or OC — and six where the maker or high-wind rules
          require it. A 7,200-count coil box covers about 28 squares of field shingles.
        </li>
        <li>
          <strong>Ventilation:</strong> 1 sq ft of net free area per 150 sq ft of attic, half high and half low. At 18 sq in per foot, a 1,200 sq ft
          attic wants 32 ft of ridge vent and matching soffit intake.
        </li>
      </ul>

      <h2>What a new roof costs in 2026</h2>
      <p>
        Materials for architectural shingles run about $95–140 per square on their own. Installed, 2026 guides put architectural roofs at
        ${INSTALLED_PER_SQUARE.architectural.low}–${INSTALLED_PER_SQUARE.architectural.high} per square and 3-tab at $
        {INSTALLED_PER_SQUARE["3-tab"].low}–${INSTALLED_PER_SQUARE["3-tab"].high}, including one layer of tear-off. A second old layer adds
        roughly $25–150 per square, 8/12 and steeper about $50–100 more, permits $150–500, and rotten decking $70–100 per 4×8 sheet — two to
        six sheets is normal on an older roof. Online figures of $2–4 per sq ft are years out of date.
      </p>

      <h2>Weight: delivery and tear-off</h2>
      <p>
        New shingles are heavy. CertainTeed lists Landmark at 217–229 lb per square, and IKO puts laminates under{" "}
        {SHINGLE_LB_PER_SQUARE.architectural} lb and 3-tab around {SHINGLE_LB_PER_SQUARE["3-tab"]} lb — about{" "}
        {fmtInt(SHINGLE_LB_PER_SQUARE.architectural / 3)} lb per architectural bundle. The {ex.bundles} bundles in the example above weigh
        about {fmt(ex.shingleWeightLb / 2000, 1)} tons, so check your truck&apos;s payload before planning to haul them, and remember every
        bundle has to go up a ladder unless the supplier delivers to the roof.
      </p>
      <p>
        One square of old shingles weighs about 200 lb for 3-tab, 240 lb for architectural and 300 lb for premium, and fills roughly half a cubic
        yard per layer. Dumpsters run out of weight allowance before they run out of space: a 20-yard bin usually includes about 2 tons, which is
        only around 16 squares of architectural tear-off. The calculator sizes the dumpster from both.
      </p>

      <h2>Mistakes that cost a second trip</h2>
      <ul>
        <li>Entering living area instead of the footprint, or forgetting the overhangs (about 10% on a small house).</li>
        <li>Assuming every bundle covers 33⅓ sq ft, or that every line is three bundles per square.</li>
        <li>Ordering 20-in W-valley flashing for open valleys — the IRC calls for at least 24 in.</li>
        <li>Mixing roll sizes: GAF WeatherWatch is 150 sq ft per roll, StormGuard 200.</li>
        <li>Skipping the starter on the rakes — Owens Corning&apos;s 160 mph Duration rating and GAF&apos;s WindProven warranty both depend on it.</li>
      </ul>
      <p>
        Putting on metal instead? Use the <Link href="/roofing/metal-roofing-calculator">metal roofing calculator</Link> for panels, screws and trim.
      </p>
    </>
  );
}

export const roofingCalculator: CalculatorEntry<RoofingValues> = {
  meta: {
    slug: SLUG,
    category: "roofing",
    name: "Roofing Calculator",
    shortName: "Shingles & squares",
    h1: "Roofing Calculator",
    metaTitle: "Roofing Calculator: Squares, Bundles & Cost (2026)",
    metaDescription:
      "Turn your footprint and pitch into roofing squares and bundles (32.8 sq ft each), plus starter, ridge cap, underlayment, ice & water, drip edge and nails.",
    summary:
      "Enter the house footprint and pitch — or your roof report — to get squares, bundles for your brand of shingle, and every other line on the order: starter, ridge cap, underlayment, ice & water, drip edge, nails, vents, dumpster and cost.",
    outputs: ["Squares & bundles", "Starter & ridge cap", "Underlayment & ice & water", "Nails & drip edge", "Cost & dumpster"],
    faq: [
      {
        q: "How many bundles of shingles are in a square?",
        a: "Three for most architectural and 3-tab lines — GAF Timberline HDZ, Owens Corning Duration, CertainTeed Landmark and Landmark PRO, IKO Cambridge. Heavy designer lines differ: CertainTeed NorthGate and Belmont are 4 per square, Grand Manor and Carriage House 5. A 3-bundle square of GAF or OC metric shingles covers 98.4 sq ft, not 100.",
      },
      {
        q: "How many square feet does a bundle of shingles cover?",
        a: "32.8 sq ft for GAF Timberline HDZ and Owens Corning Duration or Oakridge — their specs work out to 98.4 sq ft per three bundles even when store labels say 33.3. CertainTeed Landmark and IKO Cambridge or Dynasty cover 33⅓ sq ft, IKO Marathon 3-tab 32.3, and 4-bundle lines 25.",
      },
      {
        q: "How many bundles of shingles do I need for a 2,000 sq ft roof?",
        a: "61 bundles of 32.8 sq ft shingles before waste. With CertainTeed's suggested 4% for a simple gable of that size it is 64 bundles; a hip roof at 9% needs 67.",
      },
      {
        q: "How do I convert my house square footage into roofing squares?",
        a: "Use the footprint, not the living area. Add the overhang on every side, multiply length by width, multiply by the pitch factor (1.054 at 4/12, 1.118 at 6/12, 1.202 at 8/12) and divide by 100. A 30×40 house with 1-ft overhangs and a 6/12 pitch is 32 × 42 × 1.118 = 1,503 sq ft, or 15 squares.",
      },
      {
        q: "How much waste should I add for a hip roof versus a gable roof?",
        a: "CertainTeed's table suggests about 6% for a 1,200 sq ft gable but 13% for a hip roof that size, 4% versus 9% at 2,000 sq ft, and 8% versus 17% on small 600 sq ft roofs. Add 3–5 points for dormers and valleys.",
      },
      {
        q: "How much ice and water shield do I need?",
        a: "The IRC requires it from the eave to at least 24 inches inside the exterior wall, measured level — not 24 inches up the roof. With a 12-in overhang and 2×6 walls on a 6/12 roof that is about 47 inches up the slope, so two courses of 36-in membrane. A 65-ft roll covers about 64 ft of eave per course after end laps.",
      },
      {
        q: "How many roofing nails per square, and how many squares does a box cover?",
        a: "At four nails per shingle, GAF and Owens Corning shingles take 256 nails per square; a six-nail pattern takes 384. A 7,200-count box of coil nails covers about 28 squares of field shingles, or roughly 25 once starter and ridge caps are nailed.",
      },
      {
        q: "How much does a new shingle roof cost per square in 2026?",
        a: "About $400–700 per square installed for architectural shingles and $350–550 for 3-tab, including a one-layer tear-off. A second layer adds roughly $25–150 per square, 8/12 and steeper about $50–100 more, and permits $150–500.",
      },
    ],
    sources: ROOFING_SOURCES,
    related: ["roofing/roof-pitch-calculator", "roofing/metal-roofing-calculator", "paint/exterior-paint-calculator", "solar/solar-panel-calculator", "lumber/plywood-calculator", "roofing/gutter-calculator", "roofing/siding-calculator"],
    updated: ROOFING_CHECKED,
    keywords: ["roofing calculator", "shingle calculator", "roofing squares", "bundles of shingles", "roof area", "ice and water shield", "starter strip", "ridge cap", "underlayment", "roof cost"],
    featured: true,
  },
  Calculator: RoofingCalculator,
  Content,
  presets: ROOFING_PRESETS,
  presetAnswer,
};
