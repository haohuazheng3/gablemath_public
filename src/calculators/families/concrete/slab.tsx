import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeSlab } from "./compute";
import { BAG_YIELD_CUFT, CONCRETE_CHECKED, READY_MIX, concreteSources } from "./data";
import SlabCalculator from "./SlabCalculator";
import { SLAB_DEFAULTS, slabInputFrom, type SlabValues } from "./slab-model";

const SLUG = "slab-calculator";
const BASE = `/concrete/${SLUG}`;

/* ───────── programmatic presets: footprint × thickness ───────── */

const SIZE_NOTES: Record<string, string> = {
  "3x3": "A 3×3 pad is the usual base for a central-AC condenser or a generator.",
  "4x4": "4×4 pads suit grills, trash-can stands and small equipment.",
  "6x6": "6×6 is a typical landing at the bottom of deck stairs or a small hot-tub-side pad.",
  "8x8": "8×8 is a common footprint for small sheds and hot tubs.",
  "8x10": "8×10 is one of the most popular prefab shed sizes.",
  "10x10": "10×10 is the classic shed base and a compact patio for two chairs and a small table.",
  "10x12": "10×12 is the most common shed footprint and a comfortable bistro patio.",
  "10x14": "10×14 patios fit a dining table for four with room to walk around it.",
  "10x16": "10×16 fits a six-seat dining set or a large shed.",
  "10x20": "10×20 works as a single-car parking pad or a long side patio.",
  "12x12": "12×12 is the go-to patio size for a table and grill, and a common shed base.",
  "12x16": "12×16 patios hold dining plus lounge chairs; also a large shed or small workshop.",
  "12x20": "12×20 is a typical one-car garage or carport slab.",
  "12x24": "12×24 suits a long workshop, boat storage or a one-car garage with a bench.",
  "14x14": "14×14 fits a dining area and a lounge zone on one slab.",
  "16x16": "16×16 is a roomy entertaining patio or a pavilion base.",
  "16x20": "16×20 fits a full outdoor kitchen plus seating.",
  "20x20": "20×20 is the minimum common size for a two-car garage.",
  "20x24": "20×24 is a comfortable two-car garage with storage space.",
  "24x24": "24×24 is the standard roomy two-car garage slab.",
  "30x40": "30×40 is a popular pole-barn and shop building slab.",
};

type Spec = { l: number; w: number; t: number; group: string; project: string };
const SPECS: Spec[] = [
  ...[
    [3, 3],
    [4, 4],
    [6, 6],
    [8, 8],
  ].map(([l, w]) => ({ l, w, t: 4, group: "Pads & small slabs", project: "shed" })),
  ...[
    [8, 10],
    [10, 10],
    [10, 12],
    [10, 14],
    [10, 16],
    [12, 12],
    [12, 16],
    [14, 14],
    [16, 16],
    [16, 20],
  ].map(([l, w]) => ({ l, w, t: 4, group: "Patios & shed bases", project: "patio" })),
  ...[
    [10, 10],
    [12, 12],
  ].map(([l, w]) => ({ l, w, t: 6, group: "Thicker pads (hot tubs, heavy sheds)", project: "hottub" })),
  ...[
    [10, 20],
    [12, 20],
    [12, 24],
    [20, 20],
    [20, 24],
    [24, 24],
    [30, 40],
  ].map(([l, w]) => ({ l, w, t: 5, group: "Garages & driveways", project: "garage" })),
  ...[
    [20, 20],
    [24, 24],
  ].map(([l, w]) => ({ l, w, t: 6, group: "Garages & driveways", project: "driveway" })),
  ...[
    [10, 10],
    [12, 12],
  ].map(([l, w]) => ({ l, w, t: 3.5, group: "Patios & shed bases", project: "patio" })),
];

function tLabel(t: number) {
  return `${fmt(t)} inch${t === 1 ? "" : "es"}`;
}

export const SLAB_PRESETS: Preset<SlabValues>[] = SPECS.map((s) => {
  const slug = `${s.l}x${s.w}-${String(s.t).replace(".", "-")}-inch`;
  const v: SlabValues = { ...SLAB_DEFAULTS, l1: s.l, w1: s.w, t: s.t, project: s.project, rebar: s.project === "garage" || s.project === "driveway" ? "driveway" : "none" };
  const r = computeSlab(slabInputFrom(v));
  return {
    slug,
    values: v,
    group: s.group,
    label: `${s.l}×${s.w} ft, ${fmt(s.t)} in`,
    h1: `How many bags of concrete for a ${s.l}×${s.w} slab, ${fmt(s.t)} inches thick?`,
    metaTitle: `Concrete for a ${s.l}x${s.w} Slab (${fmt(s.t)} in): Bags & Yards`,
    metaDescription: `A ${s.l}×${s.w} ft slab at ${tLabel(s.t)} takes ${fmt(r.cuydNet, 2)} yd³ — ${fmtInt(r.bags)} bags of 80-lb mix with 10% extra. Compare bag vs ready-mix cost, gravel and rebar.`,
  };
});

function presetAnswer(v: SlabValues): PresetAnswer {
  const r = computeSlab(slabInputFrom(v));
  const b60 = r.bagsBySize.find((b) => b.size === 60)?.bags;
  const b40 = r.bagsBySize.find((b) => b.size === 40)?.bags;
  const key = `${v.l1}x${v.w1}`;
  const area = v.l1 * v.w1;
  const cuft = area * (v.t / 12);
  const rows = [3.5, 4, 5, 6].map((t) => {
    const x = computeSlab(slabInputFrom({ ...v, t }));
    return [
      `${fmt(t)} in${t === 3.5 ? " (2×4)" : ""}`,
      fmt(x.cuydNet, 2),
      fmtInt(x.bags),
      fmtInt(x.bagsBySize.find((b) => b.size === 60)?.bags ?? 0),
      x.bagCost != null ? fmtMoney(x.bagCost) : "—",
      fmtMoney(x.readyMixCost),
    ];
  });
  return {
    headline: `A ${v.l1} × ${v.w1} ft slab ${fmt(v.t)} inches thick needs ${fmt(r.cuydNet, 2)} cubic yards of concrete — ${fmtInt(r.bags)} bags of 80-lb mix${b60 ? ` (or ${fmtInt(b60)} × 60-lb)` : ""}, including 10% extra.`,
    bullets: [
      `Volume: ${fmt(area)} sq ft × ${fmt(v.t)} in = ${fmt(cuft, 1)} cu ft (${fmt(r.cuydNet, 2)} yd³) before waste.`,
      `Bags at 10% extra: ${fmtInt(r.bags)} × 80 lb${b60 ? `, ${fmtInt(b60)} × 60 lb` : ""}${b40 ? ` or ${fmtInt(b40)} × 40 lb` : ""} — that is ${fmtInt(r.weightLb)} lb to haul${r.pallets >= 0.9 ? ` (${fmt(r.pallets, 1)} pallets)` : ""}.`,
      r.bagCost != null
        ? `Cost: about ${fmtMoney(r.bagCost)} in 80-lb bags vs. about ${fmtMoney(r.readyMixCost)} for ${fmt(r.readyMixYd, 2)} yd³ of ready-mix delivered — ${r.cheaper === "ready-mix" ? "the truck is cheaper here" : "bags are cheaper here, but mean more mixing"}.`
        : `Ready-mix: about ${fmtMoney(r.readyMixCost)} for ${fmt(r.readyMixYd, 2)} yd³ delivered.`,
      r.gravel ? `Base: about ${fmt(r.gravel.tons, 1)} tons of crusher run for a 4-in compacted gravel base extending 6 in past the edges.` : "",
      `Water: roughly ${fmt(r.waterGal[0], 0)}–${fmt(r.waterGal[1], 0)} gallons to mix ${fmtInt(r.bags)} bags.`,
      SIZE_NOTES[key] ?? "",
    ].filter(Boolean),
    table: {
      caption: `The same ${v.l1}×${v.w1} footprint at other thicknesses`,
      columns: ["Thickness", "Cubic yards", "80-lb bags", "60-lb bags", "Bag cost", "Ready-mix"],
      rows,
    },
    notes: [
      `${v.l1} ft × ${v.w1} ft = ${fmt(area)} sq ft. Multiply by the thickness in feet (${fmt(v.t)} ÷ 12 = ${fmt(v.t / 12, 3)} ft) to get ${fmt(cuft, 2)} cubic feet, and divide by 27 for ${fmt(cuft / 27, 2)} cubic yards.`,
      `Adding 10% for uneven ground and spillage gives ${fmt(cuft * 1.1, 2)} cu ft. Quikrete and Sakrete both rate an 80-lb bag at ${BAG_YIELD_CUFT[80]} cu ft, so ${fmt(cuft * 1.1, 2)} ÷ ${BAG_YIELD_CUFT[80]} = ${fmt((cuft * 1.1) / 0.6, 1)}, rounded up to ${fmtInt(r.bags)} bags.`,
      `Ready-mix is priced at about $${READY_MIX.pricePerYd} per yard for 4,000 psi plus delivery, fuel and — under ${READY_MIX.shortLoadUnderYd} yards — a short-load fee. Plants sell in quarter-yard steps, so the order is ${fmt(r.readyMixYd, 2)} yd³.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const examples = [
    [10, 10, 4],
    [12, 12, 4],
    [10, 20, 4],
    [20, 20, 4],
    [24, 24, 4],
  ];
  return (
    <>
      <h2>How to calculate concrete for a slab</h2>
      <p>
        Concrete is ordered by volume, so every slab comes down to <strong>length × width × thickness</strong>. Measure in feet,
        convert the thickness from inches to feet (divide by 12), and multiply. Divide the cubic feet by 27 to get cubic yards — the
        unit ready-mix plants sell in. For bags, divide the cubic feet by what one bag yields.
      </p>
      <p>
        <strong>Worked example — a 10 × 10 ft patio, 4 in thick:</strong> 10 × 10 = 100 sq ft. 100 × (4 ÷ 12) = 33.3 cu ft = 1.23 yd³.
        With 10% extra that is 36.7 cu ft; an 80-lb bag makes 0.60 cu ft, so 36.7 ÷ 0.60 = 61.1 → <strong>62 bags</strong>.
      </p>

      <h2>How many bags make a cubic yard?</h2>
      <p>
        Quikrete and Sakrete publish the same yield for each bag weight in their technical data sheets. A cubic yard is 27 cu ft:
      </p>
      <table>
        <thead>
          <tr>
            <th>Bag size</th>
            <th>Yield per bag</th>
            <th>Bags per cubic yard</th>
            <th>Bags per 100 sq ft at 4 in</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>80 lb</td>
            <td>0.60 cu ft</td>
            <td>45</td>
            <td>56</td>
          </tr>
          <tr>
            <td>60 lb</td>
            <td>0.45 cu ft</td>
            <td>60</td>
            <td>75</td>
          </tr>
          <tr>
            <td>50 lb</td>
            <td>0.375 cu ft</td>
            <td>72</td>
            <td>89</td>
          </tr>
          <tr>
            <td>40 lb</td>
            <td>0.30 cu ft</td>
            <td>90</td>
            <td>112</td>
          </tr>
        </tbody>
      </table>
      <p>
        Two numbers that circulate online are wrong: a bag does <em>not</em> make half a cubic foot of anything but a 50-lb bag (0.375), and a
        pallet of forty-two 80-lb bags is 25.2 cu ft — <strong>0.93 yd³, not a full yard</strong>. Buy 45 bags per yard plus your overage.
      </p>

      <h2>Common slab sizes</h2>
      <table>
        <thead>
          <tr>
            <th>Slab</th>
            <th>Cubic yards</th>
            <th>80-lb bags (+10%)</th>
            <th>60-lb bags (+10%)</th>
          </tr>
        </thead>
        <tbody>
          {examples.map(([l, w, t]) => {
            const r = computeSlab(slabInputFrom({ ...SLAB_DEFAULTS, l1: l, w1: w, t }));
            const slug = `${l}x${w}-${t}-inch`;
            const has = SLAB_PRESETS.some((p) => p.slug === slug);
            return (
              <tr key={slug}>
                <td>{has ? <Link href={`${BASE}/${slug}`}>{`${l}×${w} ft, ${t} in`}</Link> : `${l}×${w} ft, ${t} in`}</td>
                <td>{fmt(r.cuydNet, 2)}</td>
                <td>{fmtInt(r.bags)}</td>
                <td>{fmtInt(r.bagsBySize.find((b) => b.size === 60)?.bags ?? 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Bags or ready-mix?</h2>
      <p>
        Bags cost more per yard (about $260–$290 a yard in 80-lb bags at October 2026 prices) but have no fees. Ready-mix runs roughly
        $146–$285 per yard on 2026 plant price sheets — then come the extras: a <strong>short-load fee</strong> ($50–$200) when you order
        less than the plant&apos;s minimum (often 4–6 yd³), a delivery or zone fee, and a fuel surcharge. That is why small slabs are
        usually cheaper in bags, and anything over about 2 yd³ is usually cheaper — and far less work — from a truck. The calculator
        above runs the comparison with prices you can change.
      </p>
      <p>
        Labor matters too: one 80-lb bag takes 3–4 minutes in a mixer, so 60 bags is a long, hard day for two people, and you must keep
        placing concrete against wet concrete to avoid cold joints.
      </p>

      <h2>How thick should the slab be?</h2>
      <ul>
        <li>
          <strong>Walkways, patios, shed bases:</strong> 4 in. The IRC minimum for slabs on ground is 3.5 in — the height of a 2×4 form.
        </li>
        <li>
          <strong>Hot tub pads:</strong> 4–6 in; check your spa manufacturer&apos;s spec. A filled tub with people can exceed 5,000 lb.
        </li>
        <li>
          <strong>Driveways and garage floors:</strong> 5–6 in, with #4 rebar for heavy vehicles. The IRC calls for 3,500 psi concrete
          in garage floors where weathering is severe.
        </li>
      </ul>

      <h2>Don&apos;t forget base, forms and reinforcement</h2>
      <p>
        Most slabs sit on 4 in of compacted gravel that extends about 6 in beyond the edges (Quikrete&apos;s patio method: place about
        5 in, tamp down to 4). Forms are usually 2×4s (3.5 in) or 2×6s (5.5 in) staked every 3 ft. Reinforcement is optional for patios
        but a grid of #3 bar at 18 in, or #4 at 12 in for driveways, sitting on chairs in the middle-to-upper third of the slab, controls
        cracking. Cut control joints about every 6–8 ft (Quikrete) or groove panels every 3–4 ft on walks (Sakrete).
      </p>
      <p>
        Pouring the floor of a heated room? The model IRC (R506.2.3 in 2021, R506.3.3 in 2024) puts a 6-mil polyethylene vapor
        retarder, lapped 6 in, under heated slabs. Patios, walks, driveways, garages and carports are exempt. A few states amend
        this — New Jersey and Virginia call for a 10-mil ASTM E1745 Class A retarder — so check your local edition.
      </p>

      <h2>Mixing and curing</h2>
      <ul>
        <li>Use the least water that makes a workable mix: Quikrete lists 0.75 gal to start and 1.125 gal maximum per 80-lb bag. Extra water weakens the slab and causes dusting.</li>
        <li>Keep the slab moist for 5 days above 70°F or 7 days between 50 and 70°F.</li>
        <li>Protect fresh concrete from freezing for at least 48 hours.</li>
        <li>Standard mix takes foot traffic after about 24 hours; wait several days before driving on a slab.</li>
      </ul>
      <p>
        Pouring something else? Use the <Link href="/concrete/footing-calculator">footing calculator</Link>,{" "}
        <Link href="/concrete/post-hole-calculator">post hole calculator</Link>,{" "}
        <Link href="/concrete/column-calculator">Sonotube calculator</Link> or{" "}
        <Link href="/concrete/steps-calculator">concrete steps calculator</Link>. Need the gravel separately? Use the{" "}
        <Link href="/landscaping">gravel calculator</Link>.
      </p>
    </>
  );
}

export const slabCalculator: CalculatorEntry<SlabValues> = {
  meta: {
    slug: SLUG,
    category: "concrete",
    name: "Concrete Slab Calculator",
    shortName: "Slabs & patios",
    h1: "Concrete Slab Calculator",
    metaTitle: "Concrete Slab Calculator: Bags, Yards & Cost (2026)",
    metaDescription:
      "How many bags of concrete or yards of ready-mix for your slab, patio or pad — with real bag yields, 2026 prices, ready-mix fees, gravel base and rebar.",
    summary:
      "Enter your slab size and thickness to get bags of every size, cubic yards for a truck, which option is cheaper, and a complete shopping list — gravel, forms and rebar included.",
    outputs: ["Bags (40–80 lb)", "Cubic yards", "Bags vs ready-mix", "Shopping list"],
    faq: [
      { q: "How many 80-lb bags of concrete are in a cubic yard?", a: "45. An 80-lb bag of Quikrete or Sakrete concrete mix yields 0.60 cubic feet and a cubic yard is 27 cubic feet, so 27 ÷ 0.60 = 45 bags before any overage. For 60-lb bags it is 60, and for 40-lb bags it is 90." },
      { q: "How many bags of concrete do I need for a 10x10 slab?", a: "At 4 inches thick a 10×10 slab is 33.3 cubic feet (1.23 cubic yards). That is 56 bags of 80-lb mix with no waste, or 62 bags with the recommended 10% extra. In 60-lb bags it is 82 with 10% extra." },
      { q: "Is a pallet of concrete a cubic yard?", a: "No. A pallet holds 42 bags of 80-lb mix, which is 25.2 cubic feet or 0.93 cubic yards. You need about 45 bags for a full yard, plus overage." },
      { q: "When is ready-mix cheaper than bags?", a: "Usually from about 1.5–2.5 cubic yards, depending on your plant's short-load and delivery fees. Bags cost roughly $260–$290 per yard in 80-lb bags, while ready-mix is about $146–$285 per yard plus fees. The calculator shows the exact break-even for the prices you enter." },
      { q: "How thick should a concrete patio be?", a: "4 inches over 4 inches of compacted gravel is standard. The IRC minimum for a slab on ground is 3.5 inches — the height of a 2×4 form — but most builders pour 4 inches for patios and walks and 5–6 inches for driveways." },
      { q: "How much extra concrete should I order?", a: "Add 10% for bagged concrete (Sakrete's own recommendation) and 5–10% for ready-mix. Ground is never perfectly flat and forms bulge, and running short mid-pour leaves a weak cold joint." },
      { q: "How much water does an 80-lb bag of concrete need?", a: "Quikrete's data sheet starts at 6 pints (0.75 gallon) and allows a maximum of 9 pints (about 1.1 gallons) per 80-lb bag of Concrete Mix. Add water gradually; too much water weakens the concrete." },
    ],
    sources: concreteSources("qk1101", "qk5000", "qkFast", "qkCrack", "sakrete", "retail", "rebarPrice", "readyMix", "ppi", "ircSlab"),
    related: ["landscaping/gravel-calculator", "concrete/footing-calculator", "concrete/post-hole-calculator", "concrete/column-calculator", "concrete/concrete-weight-calculator", "concrete/rebar-calculator", "flooring/epoxy-floor-calculator", "landscaping/driveway-sealer-calculator"],
    updated: CONCRETE_CHECKED,
    keywords: ["concrete calculator", "bags of concrete", "cubic yards", "patio", "slab", "quikrete", "ready mix", "how much concrete"],
    featured: true,
  },
  Calculator: SlabCalculator,
  Content,
  presets: SLAB_PRESETS,
  presetAnswer,
};
