import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { areaOf, computeMulch, coveragePerCuyd, type MulchResult } from "./compute";
import { LANDSCAPING_CHECKED, MULCH_TYPES, PLAY_SURFACES, PLAY_USE_ZONE_FT, SOURCES, TREE_RING, mulchType } from "./data";
import { article, tonsText } from "./display";
import MulchCalculator from "./MulchCalculator";
import { MULCH_DEFAULTS, materialPatch, modePatch, mulchInputFrom, mulchMode, type MulchValues } from "./mulch-model";

const SLUG = "mulch-calculator";
const BASE = `/landscaping/${SLUG}`;

const run = (v: MulchValues): MulchResult => computeMulch(mulchInputFrom(v));
const withMode = (mode: "bed" | "ring" | "topup" | "play", over: Partial<MulchValues>): MulchValues => {
  const start = { ...MULCH_DEFAULTS, ...modePatch(mode, MULCH_DEFAULTS) };
  return { ...start, ...over };
};
const bagsAt = (r: MulchResult, size: number) => r.bagsBySize.find((b) => b.size === size)?.bags ?? 0;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ───────── programmatic presets ───────── */

const AREA_NOTES: Record<number, string> = {
  100: "100 sq ft is a 10×10 island bed or a 4×25 ft strip along a foundation.",
  200: "200 sq ft is roughly the beds across the front of a small house.",
  300: "300 sq ft covers foundation beds on two sides of a typical house.",
  500: "500 sq ft is a large front-yard bed system — right around the size where bulk delivery starts to beat bags.",
  1000: "1,000 sq ft is whole-yard territory — over a hundred bags at 3 in, so bulk delivery saves both money and trips.",
};

type Spec = { slug: string; group: string; label: string; h1: string; title: string; values: MulchValues };

const SPECS: Spec[] = [
  ...[100, 200, 300, 500, 1000].map((a) => ({
    slug: `${a}-sq-ft-3-inch`,
    group: "By area, 3 in deep",
    label: `${fmtInt(a)} sq ft at 3 in`,
    h1: `How many bags of mulch for ${fmtInt(a)} sq ft, 3 inches deep?`,
    title: `Bags of Mulch for ${fmtInt(a)} Sq Ft (3 in Deep)`,
    values: withMode("bed", { shape: "sqft", a1: a, d: 3 }),
  })),
  ...[100, 200, 500].map((a) => ({
    slug: `${a}-sq-ft-2-inch`,
    group: "By area, 2 in deep",
    label: `${fmtInt(a)} sq ft at 2 in`,
    h1: `How many bags of mulch for ${fmtInt(a)} sq ft at 2 inches?`,
    title: `Bags of Mulch for ${fmtInt(a)} Sq Ft at 2 Inches`,
    values: withMode("bed", { shape: "sqft", a1: a, d: 2 }),
  })),
  ...[
    [4, 3],
    [6, 6],
    [8, 8],
    [10, 12],
  ].map(([ft, trunk]) => ({
    slug: `tree-ring-${ft}-ft`,
    group: "Tree rings",
    label: `${ft} ft tree ring`,
    h1: `How many bags of mulch for ${article(ft)} ${ft}-foot tree ring?`,
    title: `Mulch for ${article(ft)} ${ft} ft Tree Ring: Bags at 2–3 in`,
    values: withMode("ring", { l1: ft, tr: trunk }),
  })),
  {
    slug: "refresh-200-sq-ft",
    group: "Refresh & playgrounds",
    label: "Top up 200 sq ft (2 → 3 in)",
    h1: "How much mulch to refresh a 200 sq ft bed?",
    title: "Mulch to Refresh a 200 Sq Ft Bed (Top-Up Bags)",
    values: withMode("topup", { shape: "sqft", a1: 200, ex: 2, d: 3 }),
  },
  {
    slug: "refresh-500-sq-ft",
    group: "Refresh & playgrounds",
    label: "Top up 500 sq ft (1 → 3 in)",
    h1: "How much mulch to top up 500 sq ft of beds?",
    title: "Mulch to Top Up 500 Sq Ft of Beds",
    values: withMode("topup", { shape: "sqft", a1: 500, ex: 1, d: 3 }),
  },
  {
    slug: "playground-10x12-swing-set",
    group: "Refresh & playgrounds",
    label: "Playground, 10×12 swing set",
    h1: "How much mulch for a 10×12 swing set?",
    title: "Playground Mulch for a 10x12 Swing Set (CPSC)",
    values: withMode("play", {}),
  },
  {
    slug: "rubber-mulch-playground-10x12",
    group: "Refresh & playgrounds",
    label: "Rubber mulch playground, 10×12",
    h1: "How many bags of rubber mulch for a playground?",
    title: "Rubber Mulch for a 10x12 Playground: Bags",
    values: { ...withMode("play", {}), ...materialPatch("rubber", "play") },
  },
];

function metaDescription(s: Spec, r: MulchResult): string {
  if (mulchMode(s.values.mode) === "play") {
    const what = r.bags ? `${fmtInt(r.bags)} bags of ${fmt(s.values.bag)} cu ft` : "wood fiber or chips";
    return `${s.label}: ${fmtInt(r.areaSqFt)} sq ft CPSC use zone at ${fmt(s.values.d)} in = ${fmt(r.q.cuydOrder, 1)} cu yd (${what}). Fall heights and cost.`;
  }
  return `${s.label}: ${fmt(r.q.cuftOrder, 1)} cu ft (${fmt(r.q.cuydOrder, 2)} cu yd) — ${fmtInt(r.bags)} bags of 2 cu ft or ${fmtInt(bagsAt(r, 1.5))} of 1.5 cu ft. Bags vs bulk cost included.`;
}

export const MULCH_PRESETS: Preset<MulchValues>[] = SPECS.map((s) => ({
  slug: s.slug,
  values: s.values,
  group: s.group,
  label: s.label,
  h1: s.h1,
  metaTitle: s.title,
  metaDescription: metaDescription(s, run(s.values)),
}));

function bedAnswer(v: MulchValues): PresetAnswer {
  const r = run(v);
  const t = mulchType(v.mat);
  const area = r.areaSqFt;
  const b2 = r.bags;
  const b15 = bagsAt(r, 1.5);
  const b3 = bagsAt(r, 3);
  const with10 = run({ ...v, extra: 10 });
  const wins = r.buy.cheaper === "bulk";
  return {
    headline: `${fmtInt(area)} sq ft of mulch ${fmt(v.d)} in deep takes ${fmt(r.q.cuftOrder, 1)} cu ft (${fmt(r.q.cuydOrder, 2)} cu yd) — ${fmtInt(b2)} bags of 2 cu ft, ${fmtInt(b15)} bags of 1.5 cu ft or ${fmtInt(b3)} bags of 3 cu ft.`,
    bullets: [
      `Label check: a 2 cu ft bag covers ${fmt(r.coveragePerBagSqFt, 1)} sq ft at ${fmt(v.d)} in, and ${fmtInt(area)} ÷ ${fmt(r.coveragePerBagSqFt, 1)} = ${fmt(area / r.coveragePerBagSqFt, 1)} → ${fmtInt(b2)} bags.`,
      `With 10% extra for settling and uneven beds: ${fmtInt(with10.bags)} × 2 cu ft or ${fmtInt(bagsAt(with10, 1.5))} × 1.5 cu ft.`,
      `Cost at Mulch Pros' Oct 2026 prices: about ${fmtMoney(r.buy.bagCost ?? 0)} in 2 cu ft bags vs ${fmtMoney(r.buy.bulkDelivered ?? 0)} for ${fmt(r.q.cuydOrder, 2)} cu yd of bulk dyed mulch delivered — ${wins ? "bulk is cheaper here" : "bags are cheaper here"}.`,
      `Weight: about ${fmtInt(r.weightLb ?? 0)} lb of wood mulch (${tonsText((r.weightLb ?? 0) / 2000, false)}) — more after rain.`,
      `Depth: MSU Extension recommends ${t.depth[0]}–${t.depth[1]} in for ${t.short}; ${v.d >= 3 ? "3 in is also the depth bag labels quote coverage at." : "2 in suits a bed that already has some mulch or a thin color refresh."}`,
      ...(AREA_NOTES[area] ? [AREA_NOTES[area]] : []),
    ],
    table: {
      caption: `${fmtInt(area)} sq ft at other depths`,
      columns: ["Depth", "Cu yd", "2 cu ft bags", "1.5 cu ft bags", "Bag cost", "Bulk delivered"],
      rows: [2, 3, 4].map((d) => {
        const x = run({ ...v, d });
        return [`${d} in`, fmt(x.q.cuydOrder, 2), fmtInt(x.bags), fmtInt(bagsAt(x, 1.5)), fmtMoney(x.buy.bagCost ?? 0), fmtMoney(x.buy.bulkDelivered ?? 0)];
      }),
    },
    notes: [
      `${fmtInt(area)} sq ft × ${fmt(v.d)} in ÷ 12 = ${fmt(r.q.cuftOrder, 1)} cu ft. Divide by the bag size — ${fmt(r.q.cuftOrder, 1)} ÷ 2 = ${fmt(r.q.cuftOrder / 2, 2)}, rounded up to ${fmtInt(b2)} bags — or by 27 for ${fmt(r.q.cuydOrder, 2)} cubic yards.`,
      r.buy.breakEvenYd != null
        ? `With bags at $3.65 and bulk at $33.95 a yard plus $${fmt(v.del, 0)} delivery, bulk pays off from about ${fmt(r.buy.breakEvenYd, 1)} cu yd — about ${fmtInt(r.buy.breakEvenYd * coveragePerCuyd(v.d))} sq ft at ${fmt(v.d)} in. ${wins ? `At ${fmt(r.q.cuydOrder, 1)} cu yd you are past that point, so order bulk unless the pile can't go near the beds.` : `At ${fmt(r.q.cuydOrder, 2)} cu yd you are below it, so bags are cheaper and easier to carry to the beds.`}`
        : "",
    ].filter(Boolean),
  };
}

function ringAnswer(v: MulchValues): PresetAnswer {
  const r = run(v);
  const inner = (v.tr / 2 + TREE_RING.gapIn) / 12;
  const outer = v.l1 / 2;
  const at2 = run({ ...v, d: 2 });
  const fullCircle = Math.PI * outer * outer;
  return {
    headline: `${cap(article(v.l1))} ${fmt(v.l1)}-ft mulch ring around ${article(v.tr)} ${fmt(v.tr)} in trunk, ${fmt(v.d)} in deep, takes ${fmt(r.q.cuftOrder, 1)} cu ft — ${fmtInt(r.bags)} bag${r.bags === 1 ? "" : "s"} of 2 cu ft (${fmtInt(bagsAt(r, 1.5))} of 1.5 cu ft).`,
    bullets: [
      `Ring area: π × (${fmt(outer, 2)}² − ${fmt(inner, 2)}²) = ${fmt(r.areaSqFt, 1)} sq ft. The trunk and a ${TREE_RING.gapIn} in bare gap at the bark take ${fmt(fullCircle - r.areaSqFt, 1)} sq ft out of the circle.`,
      `At 2 in instead: ${fmt(at2.q.cuftOrder, 1)} cu ft = ${fmtInt(at2.bags)} bags of 2 cu ft.`,
      `${outer >= TREE_RING.minRadiusFt ? `A ${fmt(outer)} ft radius sits in MSU Extension's 3–6 ft range.` : `MSU Extension suggests extending mulch 3–6 ft from the trunk — widen this ring as the tree grows.`}`,
      `For 5 trees this size: ${fmtInt(run({ ...v, count: 5 }).bags)} bags; for 10: ${fmtInt(run({ ...v, count: 10 }).bags)} bags.`,
      `Keep it flat at 2–3 in (City of Rockville) — a mounded "mulch volcano" against the trunk holds moisture on the bark and invites rot and pests.`,
    ],
    table: {
      caption: `${fmt(v.l1)} ft rings, ${fmt(v.d)} in deep, by number of trees`,
      columns: ["Trees", "Cu ft", "2 cu ft bags", "1.5 cu ft bags", "Bag cost"],
      rows: [1, 3, 5, 10].map((n) => {
        const x = run({ ...v, count: n });
        return [String(n), fmt(x.q.cuftOrder, 1), fmtInt(x.bags), fmtInt(bagsAt(x, 1.5)), fmtMoney(x.buy.bagCost ?? 0)];
      }),
    },
    notes: [
      `The ring is a circle ${fmt(v.l1)} ft across with the middle left bare: the trunk (${fmt(v.tr)} in) plus a ${TREE_RING.gapIn} in gap all round, ${article(inner * 24)} ${fmt(inner * 24, 1)} in circle. ${fmt(r.areaSqFt, 1)} sq ft × ${fmt(v.d)} in ÷ 12 = ${fmt(r.q.cuftOrder, 2)} cu ft, ÷ 2 cu ft per bag = ${fmt(r.q.cuftOrder / 2, 2)} → ${fmtInt(r.bags)} bags.`,
    ],
  };
}

function topupAnswer(v: MulchValues): PresetAnswer {
  const r = run(v);
  const full = run({ ...v, ex: 0 });
  return {
    headline: `Topping up ${fmtInt(r.areaSqFt)} sq ft of beds from ${fmt(v.ex)} in to ${fmt(v.d)} in adds ${fmt(r.addDepthIn)} in of mulch: ${fmt(r.q.cuftOrder, 1)} cu ft — ${fmtInt(r.bags)} bags of 2 cu ft (${fmtInt(bagsAt(r, 1.5))} of 1.5 cu ft).`,
    bullets: [
      `Starting over at the full ${fmt(v.d)} in would take ${fmtInt(full.bags)} bags — measuring first saves ${fmtInt(full.bags - r.bags)} bags (${fmtMoney((full.buy.bagCost ?? 0) - (r.buy.bagCost ?? 0))}).`,
      `Volume: ${fmtInt(r.areaSqFt)} sq ft × ${fmt(r.addDepthIn)} in ÷ 12 = ${fmt(r.q.cuftOrder, 1)} cu ft (${fmt(r.q.cuydOrder, 2)} cu yd).`,
      `Cost: about ${fmtMoney(r.buy.bagCost ?? 0)} in bags vs ${fmtMoney(r.buy.bulkDelivered ?? 0)} bulk delivered — ${r.buy.cheaper === "bulk" ? "bulk wins" : "bags win"} at this size.`,
      `Don't stack past 3–4 in in total: deep layers keep water and air from roots. MSU Extension suggests raking off old mulch and starting over after about 3 years.`,
    ],
    table: {
      caption: `Bags of 2 cu ft to bring ${fmtInt(r.areaSqFt)} sq ft up to ${fmt(v.d)} in`,
      columns: ["Mulch there now", "Add", "Cu ft", "2 cu ft bags", "Bag cost"],
      rows: [0, 1, 1.5, 2, 2.5].map((ex) => {
        const x = run({ ...v, ex });
        return [`${fmt(ex)} in`, `${fmt(x.addDepthIn)} in`, fmt(x.q.cuftOrder, 1), fmtInt(x.bags), fmtMoney(x.buy.bagCost ?? 0)];
      }),
    },
    notes: [
      `Push a ruler or screwdriver down to the soil in a few places and average the readings. Organic mulch settles and breaks down, so beds lose depth every season even when they still look covered.`,
    ],
  };
}

function playAnswer(v: MulchValues): PresetAnswer {
  const r = run(v);
  const t = mulchType(v.mat);
  const rubber = t.id === "rubber";
  const zoneL = v.l1 + 2 * PLAY_USE_ZONE_FT;
  const zoneW = v.w1 + 2 * PLAY_USE_ZONE_FT;
  return {
    headline: rubber
      ? `A ${fmt(v.l1)}×${fmt(v.w1)} ft play set needs ${fmtInt(r.areaSqFt)} sq ft of surfacing; at CPSC's 6 in of shredded rubber that is ${fmt(r.q.cuydOrder, 1)} cu yd — ${fmtInt(r.bags)} bags of 0.8 cu ft.`
      : `A ${fmt(v.l1)}×${fmt(v.w1)} ft swing set needs ${fmtInt(r.areaSqFt)} sq ft of surfacing; filled 12 in deep that is ${fmt(r.q.cuydOrder, 1)} cu yd of playground wood fiber or chips.`,
    bullets: [
      `Use zone: CPSC extends surfacing at least ${PLAY_USE_ZONE_FT} ft past the equipment on every side, so ${fmt(v.l1)}×${fmt(v.w1)} becomes ${fmt(zoneL)}×${fmt(zoneW)} ft = ${fmtInt(r.areaSqFt)} sq ft.`,
      rubber
        ? "Depth: CPSC's public handbook rates 6 in of shredded or recycled rubber for falls up to 10 ft."
        : "Depth: fill 12 in so it compresses to no less than 9 in — loose fill compresses at least 25%. 9 in of wood chips protects falls up to 10 ft.",
      rubber
        ? `Cost: ${fmtInt(r.bags)} bags at about $7.47 is roughly ${fmtMoney(r.buy.bagCost ?? 0)}; rubber doesn't decompose, so it is a one-time fill plus raking.`
        : `Cost: about ${fmtMoney(r.buy.bulkDelivered ?? 0)} delivered at $${fmt(v.bulk, 2)} a yard (Mulch Pros $38.95, Roseville Rock Supply $63.95) plus $${fmt(v.del, 0)} delivery.`,
      `Swings: for to-and-fro swings CPSC extends the zone in front and behind to twice the top-bar height — an 8 ft swing beam needs 16 ft each way, so add that length.`,
      rubber ? `Compare: the same zone in wood fiber at 12 in would be ${fmt(run({ ...v, ...materialPatch("playground", "play") }).q.cuydOrder, 1)} cu yd.` : `Compare: shredded rubber at 6 in would be ${fmt(run({ ...v, ...materialPatch("rubber", "play") }).q.cuydOrder, 1)} cu yd (${fmtInt(run({ ...v, ...materialPatch("rubber", "play") }).bags)} bags of 0.8 cu ft).`,
    ],
    table: {
      caption: `Surfacing for a ${fmt(zoneL)}×${fmt(zoneW)} ft use zone by material (CPSC Table 2)`,
      columns: ["Surface", "Maintained depth", "Protects falls to", "Initial fill", "Cu yd to order"],
      rows: PLAY_SURFACES.map((p) => {
        const initial = p.id === "rubber" ? p.depthIn : 12;
        const yd = (r.areaSqFt * (initial / 12)) / 27;
        return [p.label, `${p.depthIn} in`, `${p.protectsFt} ft`, `${initial} in`, fmt(yd, 1)];
      }),
    },
    notes: [
      `${fmt(zoneL)} ft × ${fmt(zoneW)} ft = ${fmtInt(r.areaSqFt)} sq ft. × ${fmt(v.d)} in ÷ 12 = ${fmt(r.q.cuftOrder, 0)} cu ft ÷ 27 = ${fmt(r.q.cuydOrder, 2)} cu yd.`,
      `Fall height is measured from the highest platform a child can stand on. ${rubber ? "Rubber at 6 in covers up to 10 ft." : "At 12 in of wood chips you are covered to 10 ft once it settles to 9 in; shredded wood mulch only rates 7 ft at 9 in."} Mark the 9 in level on a post so you can see when to top up.`,
    ],
  };
}

function presetAnswer(v: MulchValues): PresetAnswer {
  const mode = mulchMode(v.mode);
  if (mode === "ring") return ringAnswer(v);
  if (mode === "topup") return topupAnswer(v);
  if (mode === "play") return playAnswer(v);
  return bedAnswer(v);
}

/* ───────── long-form guide ───────── */

function Content() {
  const ex = run({ ...MULCH_DEFAULTS, shape: "sqft", a1: 100, d: 3 });
  const ring = areaOf({ shape: "ring", d: 6, trunkIn: 6 });
  return (
    <>
      <h2>How to calculate mulch</h2>
      <p>
        Mulch is sold by volume: bags are labelled in cubic feet and bulk mulch is sold by the cubic yard (27 cu ft). Multiply the bed area in square
        feet by the depth in inches, divide by 12 for cubic feet, then divide by the bag size — or by 27 for yards.
      </p>
      <p>
        <strong>Worked example — 100 sq ft at 3 in:</strong> 100 × 3 ÷ 12 = {fmt(ex.q.cuftOrder)} cu ft. That is {fmtInt(ex.bags)} bags of 2 cu ft
        (25 ÷ 2 = 12.5, rounded up), {fmtInt(bagsAt(ex, 1.5))} bags of 1.5 cu ft, or {fmt(ex.q.cuydOrder, 2)} cubic yards in bulk.
      </p>

      <h2>Bags per yard and coverage per bag</h2>
      <table>
        <thead>
          <tr>
            <th>Bag size</th>
            <th>Bags per cubic yard</th>
            <th>Covers at 2 in</th>
            <th>Covers at 3 in</th>
          </tr>
        </thead>
        <tbody>
          {[1.5, 2, 3].map((s) => (
            <tr key={s}>
              <td>{fmt(s)} cu ft</td>
              <td>{fmt(27 / s, 1)}</td>
              <td>{fmt((s * 12) / 2)} sq ft</td>
              <td>{fmt((s * 12) / 3)} sq ft</td>
            </tr>
          ))}
          <tr>
            <td>1 cubic yard (bulk)</td>
            <td>—</td>
            <td>162 sq ft</td>
            <td>108 sq ft</td>
          </tr>
        </tbody>
      </table>
      <p>
        Read the label before you load the cart: the same brand can come in 1.5 and 2 cu ft bags (Scotts Nature Scapes is sold in both), and the
        bag count changes by a third.
      </p>

      <h2>How deep should mulch be?</h2>
      <table>
        <thead>
          <tr>
            <th>Mulch</th>
            <th>Depth (MSU Extension)</th>
          </tr>
        </thead>
        <tbody>
          {MULCH_TYPES.filter((m) => m.id !== "playground").map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>
                {m.depth[0]}–{m.depth[1]} in
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Three inches is the sweet spot for most bark and shredded wood: thick enough to block weed seedlings, thin enough for water to reach the
        soil. Pine straw goes down 6–8 in loose because it settles; a bale covers about 40 sq ft.
      </p>

      <h2>Tree rings without the volcano</h2>
      <p>
        Mulch a flat ring 3–6 ft out from the trunk (MSU Extension), 2–3 in deep, and keep it 2–3 in back from the bark (City of Rockville, 2026). A
        6 ft ring around a 6 in trunk with a 3 in gap is {fmt(ring, 1)} sq ft — about 7 cu ft at 3 in, or four 2 cu ft bags. See{" "}
        <Link href={`${BASE}/tree-ring-6-ft`}>6 ft</Link>, <Link href={`${BASE}/tree-ring-8-ft`}>8 ft</Link> and <Link href={`${BASE}/tree-ring-10-ft`}>10 ft</Link> rings.
      </p>

      <h2>Topping up existing mulch</h2>
      <p>
        Organic mulch breaks down, so beds lose depth every year. Measure what is left with a ruler and add only the difference: bringing 200 sq ft
        from 2 in to 3 in takes 1 in — 16.7 cu ft, or 9 bags — not the 25 bags of a fresh 3 in layer. Avoid building past 3–4 in in total. MSU
        Extension suggests raking off the old layer and starting fresh after about three years.
      </p>

      <h2>Bags or bulk?</h2>
      <p>
        At Mulch Pros&apos; October 2026 prices a 2 cu ft bag of dyed mulch is $3.65 — $49.28 per cubic yard — while bulk is $33.95 a yard. With
        their $60 minimum delivery fee, bulk wins from about 3.9 cubic yards (roughly 420 sq ft at 3 in); at a $75 fee it is about 4.9 yards. If you
        can pick it up yourself, bulk is cheaper at any size. LawnStarter puts bulk mulch at $30–$135 a yard nationally with delivery at $70–$140. Watch big-box pallet deals: their pallet price
        includes delivery, so each bag costs more than the shelf price.
      </p>

      <h2>Playground mulch is a different job</h2>
      <p>
        Landscape depths are far too thin for fall protection. The CPSC asks for at least 9 in of wood chips or wood mulch, maintained — start with
        12 in because loose fill compresses — and the surfacing must extend 6 ft past the equipment on every side. A 10×12 ft swing set therefore
        needs 22×24 ft of surfacing: about 19.6 cubic yards. Shredded rubber is the exception at 6 in. See the{" "}
        <Link href={`${BASE}/playground-10x12-swing-set`}>10×12 swing set</Link> answer.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Buying by the number of bags a neighbor used without checking the bag size.</li>
        <li>Re-mulching to full depth every spring instead of topping up the difference.</li>
        <li>Piling mulch against tree trunks and house siding.</li>
        <li>Using garden depths (2–3 in) under play equipment, where CPSC asks for 9–12 in.</li>
        <li>Forgetting that a full yard of wet mulch weighs far more than the 400–800 lb of a dry one.</li>
      </ul>
      <p>
        Starting a new bed? Work in compost or topsoil first with the <Link href="/landscaping/topsoil-calculator">topsoil calculator</Link>. Gravel
        or river rock instead of mulch? Use the <Link href="/landscaping/gravel-calculator">gravel calculator</Link>. Common sizes:{" "}
        <Link href={`${BASE}/100-sq-ft-3-inch`}>100 sq ft</Link>, <Link href={`${BASE}/200-sq-ft-3-inch`}>200 sq ft</Link>,{" "}
        <Link href={`${BASE}/500-sq-ft-3-inch`}>500 sq ft</Link>, <Link href={`${BASE}/1000-sq-ft-3-inch`}>1,000 sq ft</Link>.
      </p>
    </>
  );
}

export const mulchCalculator: CalculatorEntry<MulchValues> = {
  meta: {
    slug: SLUG,
    category: "landscaping",
    name: "Mulch Calculator",
    shortName: "Mulch & pine straw",
    h1: "Mulch Calculator",
    metaTitle: "Mulch Calculator: Bags, Yards & Cost (2026)",
    metaDescription:
      "How many bags of mulch you need — 100 sq ft at 3 in is 13 two-cubic-foot bags. Tree rings, top-ups, playgrounds and a bags-vs-bulk break-even.",
    summary:
      "Enter your beds and depth to get bags in every size, bulk cubic yards and which is cheaper — with tree rings, top-ups of existing mulch and CPSC playground depths built in.",
    outputs: ["Bags (1.5, 2, 3 cu ft)", "Cubic yards", "Bags vs bulk", "Tree rings & top-ups"],
    faq: [
      {
        q: "How many bags of mulch do I need for 100 square feet?",
        a: "At 3 inches deep, 100 sq ft takes 25 cubic feet: 13 bags of 2 cu ft or 17 bags of 1.5 cu ft. At 2 inches it is 16.7 cubic feet: 9 bags of 2 cu ft or 12 of 1.5 cu ft.",
      },
      {
        q: "How many bags of mulch are in a yard?",
        a: "A cubic yard is 27 cubic feet, so it equals 13.5 bags of 2 cu ft, 18 bags of 1.5 cu ft or 9 bags of 3 cu ft.",
      },
      {
        q: "How many square feet does a yard of mulch cover?",
        a: "324 sq ft at 1 inch, 162 sq ft at 2 inches and 108 sq ft at 3 inches. Coverage depends only on depth, not on the type of mulch.",
      },
      {
        q: "Is it cheaper to buy mulch in bags or in bulk?",
        a: "Bulk is cheaper per yard, but delivery fees make bags cheaper for small jobs. At October 2026 Georgia prices ($3.65 per 2 cu ft bag, $33.95 per yard bulk, $60 delivery) bulk wins from about 3.9 cubic yards — roughly 420 sq ft at 3 inches; with a $75 fee, about 4.9 yards. If you can haul it yourself, bulk is cheaper at any size.",
      },
      {
        q: "How deep should mulch be?",
        a: "MSU Extension recommends 2–3 inches for pine, hardwood and cypress bark, 2–4 inches for wood chips and shredded wood, and 6–8 inches of loose pine straw. Around trees keep it 2–3 inches deep and 2–3 inches back from the trunk.",
      },
      {
        q: "How much mulch do I need to refresh an existing bed?",
        a: "Measure what is left and add only the difference to reach about 3 inches. Topping up 200 sq ft from 2 to 3 inches takes 16.7 cubic feet — 9 bags of 2 cu ft. MSU Extension suggests raking off the old layer after about three years.",
      },
      {
        q: "How deep should playground mulch be?",
        a: "CPSC asks for at least 9 inches of wood chips or wood mulch, maintained, so start with 12 inches; 9 inches of wood chips protects falls up to 10 feet. Shredded rubber needs 6 inches. Extend it at least 6 feet past the equipment on all sides.",
      },
    ],
    sources: [
      SOURCES.msuMulch,
      SOURCES.msuRing,
      SOURCES.rockville,
      SOURCES.mulchProsWeights,
      SOURCES.mulchProsPrices,
      SOURCES.lawnStarter,
      SOURCES.rosevilleCalc,
      SOURCES.cpsc325,
      SOURCES.cpsc324,
    ],
    related: ["landscaping/topsoil-calculator", "landscaping/gravel-calculator", "landscaping/paver-base-calculator", "landscaping/sand-calculator", "measure/cubic-yard-calculator", "landscaping/river-rock-calculator"],
    updated: LANDSCAPING_CHECKED,
    keywords: ["mulch calculator", "bags of mulch", "how much mulch", "yard of mulch", "tree ring", "pine straw", "playground mulch", "rubber mulch"],
    featured: true,
  },
  Calculator: MulchCalculator,
  Content,
  presets: MULCH_PRESETS,
  presetAnswer,
};

