import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeSteps } from "./compute";
import { BAG_YIELD_CUFT, CONCRETE_CHECKED, IRC_STAIRS, concreteSources } from "./data";
import StepsCalculator from "./StepsCalculator";
import { STEPS_DEFAULTS, stepLayout, stepsInputFrom, type StepsValues } from "./steps-model";

const SLUG = "steps-calculator";
const BASE = `/concrete/${SLUG}`;

const run = (v: StepsValues) => computeSteps(stepsInputFrom(v));
const bags60 = (r: ReturnType<typeof run>) => r.order.bagsBySize.find((b) => b.size === 60)?.bags ?? 0;

/* ───────── programmatic presets ───────── */

type Spec = { n: number; width: number; top: "landing" | "existing"; note: string };

const SPECS: Spec[] = [
  { n: 2, width: 3, top: "landing", note: "At 3 ft wide the landing is exactly as wide as a 36 in door — the IRC minimum (R311.3)." },
  { n: 2, width: 4, top: "landing", note: "A 4 ft wide stoop gives room to stand aside while a 36 in door swings out." },
  { n: 3, width: 3, top: "landing", note: "Three 7 in risers lift you 21 in, and the 36 in landing holds about three-quarters of the concrete." },
  { n: 3, width: 4, top: "landing", note: "The same 21 in rise as a 3 ft wide stoop, but a third more concrete for the extra foot of width." },
  { n: 3, width: 5, top: "landing", note: "A 5 ft wide stoop suits a front entry with sidelights or a wider door." },
  { n: 3, width: 4, top: "existing", note: "Steps up to an existing porch or deck: the porch edge is the top step, so only two concrete treads are poured." },
  { n: 4, width: 4, top: "landing", note: "Four risers is where the IRC starts requiring a handrail (R311.7.8)." },
  { n: 4, width: 5, top: "existing", note: "Four step-ups to an existing porch, 5 ft wide — a broad front approach." },
  { n: 5, width: 4, top: "existing", note: "Five step-ups at 7 in rise 35 in, so a porch this high needs guards on its open sides." },
  { n: 5, width: 5, top: "landing", note: "Five steps plus a landing is a lot of concrete — at this size a ready-mix truck usually wins, and the landing alone needs a guard." },
];

const slugOf = (s: Spec) => `${s.n}-steps-${s.width}-ft-wide${s.top === "landing" ? "-with-landing" : "-to-porch"}`;

export const STEPS_PRESETS: Preset<StepsValues>[] = SPECS.map((s) => {
  const v: StepsValues = { ...STEPS_DEFAULTS, n: s.n, width: s.width, top: s.top };
  const r = run(v);
  const landing = s.top === "landing";
  return {
    slug: slugOf(s),
    values: v,
    group: landing ? "Steps with a new landing" : "Steps up to an existing porch",
    label: `${s.n} steps, ${s.width} ft wide${landing ? " + landing" : ""}`,
    h1: landing ? `How much concrete for ${s.n} steps ${s.width} ft wide with a landing?` : `How much concrete for ${s.n} steps ${s.width} ft wide up to a porch?`,
    metaTitle: `Concrete for ${s.n} Steps, ${s.width} ft Wide${landing ? " + Landing" : " to a Porch"}: ${fmtInt(r.order.bags)} Bags`,
    metaDescription: `${s.n} concrete steps ${s.width} ft wide (7 in rise, 11 in treads${landing ? ", 36 in landing" : ""}) take ${fmt(r.order.cuftNet, 1)} cu ft — ${fmtInt(r.order.bags)} × 80-lb bags with 10% extra. Forms and code checks.`,
  };
});

function presetAnswer(v: StepsValues): PresetAnswer {
  const r = run(v);
  const o = r.order;
  const { steps: n, riseIn } = stepLayout(v);
  const landing = v.top !== "existing";
  const spec = SPECS.find((s) => s.n === v.n && s.width === v.width && s.top === v.top);
  const treads = (riseIn * v.run * (n - 1) * n) / 2;
  const landingPart = landing ? n * riseIn * v.land : 0;

  return {
    headline: `${n} concrete steps ${fmt(v.width, 1)} ft wide${landing ? ` with a ${fmt(v.land, 0)} in landing` : " up to an existing porch"} take ${fmt(o.cuftNet, 1)} cu ft (${fmt(o.cuydNet, 2)} yd³) — ${fmtInt(o.bags)} × 80-lb bags with 10% extra.`,
    bullets: [
      `Formula: ${fmt(v.width, 1)} ft × [${fmt(riseIn, 2)} × ${fmt(v.run, 1)} × ${n - 1}·${n} ÷ 2${landing ? ` + ${n} × ${fmt(riseIn, 2)} × ${fmt(v.land, 0)}` : ""}] ÷ 144 = ${fmt(o.cuftNet, 2)} cu ft.`,
      landing ? `The landing is ${fmt((r.landingCuft / Math.max(o.cuftNet, 1e-9)) * 100, 0)}% of the concrete (${fmt(r.landingCuft, 1)} cu ft); the steps themselves are ${fmt(o.cuftNet - r.landingCuft, 1)} cu ft.` : `Only ${n - 1} tread${n - 1 === 1 ? "" : "s"} are concrete — your porch is the last step.`,
      `Bags: ${fmtInt(o.bags)} × 80 lb or ${fmtInt(bags60(r))} × 60 lb (${fmtInt(o.weightLb)} lb).${o.bagCost != null ? ` About ${fmtMoney(o.bagCost)} in bags vs. ${fmtMoney(o.readyMixCost)} for ${fmt(o.readyMixYd, 2)} yd³ delivered.` : ""}`,
      `Forms: ${r.forms.risers} riser boards (${r.forms.riserLumber}, ${fmt(v.width, 1)} ft long) and two side forms ${fmt(r.forms.sideLengthIn, 0)} × ${fmt(r.forms.sideHeightIn, 0)} in.`,
      `Code: ${fmt(riseIn, 2)} in risers (max ${IRC_STAIRS.maxRiserIn} in) and ${fmt(v.run, 0)} in treads (no nosing needed at ${IRC_STAIRS.noNosingTreadIn} in).${r.checks.handrail ? " Four or more risers need a handrail." : ""}${r.checks.guard ? " The landing is over 30 in high, so it needs a guard." : ""}`,
      spec?.note ?? "",
    ].filter(Boolean),
    table: {
      caption: `${fmt(v.width, 0)} ft wide steps${landing ? " with a 36 in landing" : " up to a porch"}, by number of steps`,
      columns: ["Steps", "Cubic yards", "80-lb bags", "60-lb bags", "Bag cost", "Ready-mix"],
      rows: [2, 3, 4, 5, 6].map((k) => {
        const x = run({ ...v, mode: "steps", n: k });
        return [`${k}${k === n ? " ←" : ""}`, fmt(x.order.cuydNet, 2), fmtInt(x.order.bags), fmtInt(bags60(x)), x.order.bagCost != null ? fmtMoney(x.order.bagCost) : "—", fmtMoney(x.order.readyMixCost)];
      }),
    },
    notes: [
      `Treat each step as a solid block sitting on the ground: step 1 is one riser tall, step 2 two risers, and so on. Their side profiles add up to rise × tread × (n − 1)·n ÷ 2 = ${fmt(riseIn, 2)} × ${fmt(v.run, 1)} × ${(n - 1) * n} ÷ 2 = ${fmtInt(treads)} sq in.${landing ? ` The landing is a full-height block: ${n} × ${fmt(riseIn, 2)} × ${fmt(v.land, 0)} = ${fmtInt(landingPart)} sq in.` : ""}`,
      `Profile ${fmtInt(treads + landingPart)} sq in ÷ 144 = ${fmt((treads + landingPart) / 144, 3)} sq ft × ${fmt(v.width, 1)} ft wide = ${fmt(o.cuftNet, 2)} cu ft. With 10% extra, ${fmt(o.cuftWithWaste, 2)} ÷ ${BAG_YIELD_CUFT[80]} = ${fmt(o.cuftWithWaste / BAG_YIELD_CUFT[80], 1)} → ${fmtInt(o.bags)} bags.`,
      o.cheaper === "ready-mix"
        ? `At ${fmt(o.cuydWithWaste, 2)} yd³ a truck is cheaper than bags at the default prices — and steps should be poured in one go so the risers bond.`
        : `At ${fmt(o.cuydWithWaste, 2)} yd³ bags are cheaper than a truck at the default prices, but plan the crew: ${fmtInt(o.bags)} bags (${fmtInt(o.weightLb)} lb) have to be mixed and placed in one session so the steps bond.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const ex = run({ ...STEPS_DEFAULTS, n: 3, width: 4, top: "landing" });
  const noLanding = run({ ...STEPS_DEFAULTS, n: 3, width: 4, top: "existing" });
  return (
    <>
      <h2>How to calculate concrete for steps</h2>
      <p>
        Solid concrete steps are a staircase-shaped block. Seen from the side, each step is a column one riser taller than the one before, so the side profile adds up to{" "}
        <strong>rise × tread × (n − 1) × n ÷ 2</strong>, where n is the number of step-ups. A landing on top adds <strong>n × rise × landing depth</strong>. Multiply the profile (in square inches) by the
        width and divide by 144 for cubic feet:
      </p>
      <p>
        <strong>Volume = W × [R × D × (n − 1)·n ÷ 2 + n × R × P] ÷ 144</strong> — W in feet, rise R, tread D and landing P in inches.
      </p>
      <p>
        <strong>Worked example — 3 steps, 7 in rise, 11 in treads, 4 ft wide, 36 in landing:</strong> 7 × 11 × 6 ÷ 2 = 231 sq in for the steps, 3 × 7 × 36 = 756 sq in for the landing. 987 sq in ÷ 144 ×
        4 ft = {fmt(ex.order.cuftNet, 1)} cu ft ({fmt(ex.order.cuydNet, 2)} yd³). With 10% extra: <strong>{fmtInt(ex.order.bags)} × 80-lb bags</strong>. The same steps running up to an existing porch need
        only {fmt(noLanding.order.cuftNet, 1)} cu ft — {fmtInt(noLanding.order.bags)} bags. The landing is most of the concrete.
      </p>

      <h2>Rise, tread and landing rules</h2>
      <ul>
        <li>
          <strong>Risers: {IRC_STAIRS.maxRiserIn} in maximum</strong> (IRC R311.7.5.1), measured between tread edges. Divide the total height by 7¾ and round up for the number of steps; the calculator&apos;s
          height mode does it for you.
        </li>
        <li>
          <strong>Treads: {IRC_STAIRS.minTreadIn} in minimum</strong> (R311.7.5.2). Below {IRC_STAIRS.noNosingTreadIn} in, the code wants a ¾–1¼ in nosing, which is awkward in concrete — so most concrete
          steps use 11–12 in treads.
        </li>
        <li>
          <strong>Consistency:</strong> the tallest riser and the deepest tread may differ from the smallest by no more than ⅜ in within a flight. Uneven steps trip people.
        </li>
        <li>
          <strong>Landings:</strong> an exterior door needs a landing at least {IRC_STAIRS.landingMinIn} in deep and as wide as the door (R311.3), sloped no more than 2%. It may sit up to 7¾ in below the
          threshold if the door does not swing over it.
        </li>
        <li>
          <strong>Handrails and guards:</strong> {IRC_STAIRS.handrailRisers} or more risers need a handrail 34–38 in high (R311.7.8). A landing more than {IRC_STAIRS.guardAboveIn} in above grade needs a guard
          on its open sides (R312.1).
        </li>
      </ul>

      <h2>Concrete for common step sizes</h2>
      <table>
        <thead>
          <tr>
            <th>Steps (7 × 11 in)</th>
            <th>Cu ft</th>
            <th>80-lb bags (+10%)</th>
          </tr>
        </thead>
        <tbody>
          {SPECS.map((s) => {
            const r = run({ ...STEPS_DEFAULTS, n: s.n, width: s.width, top: s.top });
            return (
              <tr key={slugOf(s)}>
                <td>
                  <Link href={`${BASE}/${slugOf(s)}`}>
                    {s.n} steps, {s.width} ft wide{s.top === "landing" ? " + 36 in landing" : " to a porch"}
                  </Link>
                </td>
                <td>{fmt(r.order.cuftNet, 1)}</td>
                <td>{fmtInt(r.order.bags)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Mix, forms and base</h2>
      <p>
        Steps sit out in the weather and take de-icer. IRC Table R402.2 asks for 3,000 psi in moderate climates and 3,500 psi where weathering is severe, air-entrained to 5–7%. Regular bagged mix has no
        added air; Quikrete&apos;s Crack-Resistant mix lists 4–8%, or order air-entrained ready-mix.
      </p>
      <p>
        Form the sides from plywood cut to the stair profile and the front of each step from a board ripped to the riser height, braced so the wet concrete cannot push it out. Bevel the bottom edge of
        each riser board so you can finish the tread right up to it. Set the steps on compacted gravel — the calculator assumes 4 in, the IRC base course under slabs — and where the ground freezes,
        ask your building department whether steps attached to the house need their own footings.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Counting treads instead of step-ups — the landing or porch is the last step, so count the risers.</li>
        <li>Forgetting the landing in the estimate: on a 3-step stoop it is about three-quarters of the concrete.</li>
        <li>Making the top riser shorter or taller than the rest to “catch up” — keep them within ⅜ in.</li>
        <li>Pouring in several batches hours apart; plan enough crew or order ready-mix so the whole stair goes in at once.</li>
      </ul>
      <p>
        Pouring a walkway to the steps? Use the <Link href="/concrete/slab-calculator">slab calculator</Link>. Need footings under the steps or a porch? Try the{" "}
        <Link href="/concrete/footing-calculator">footing calculator</Link>.
      </p>
    </>
  );
}

const THREE = run({ ...STEPS_DEFAULTS, n: 3, width: 4, top: "landing" });
const THREE_PORCH = run({ ...STEPS_DEFAULTS, n: 3, width: 4, top: "existing" });

export const stepsCalculator: CalculatorEntry<StepsValues> = {
  meta: {
    slug: SLUG,
    category: "concrete",
    name: "Concrete Steps Calculator",
    shortName: "Steps & stoops",
    h1: "Concrete Steps Calculator",
    metaTitle: "Concrete Steps Calculator: Bags, Yards & Forms",
    metaDescription: `3 concrete steps 4 ft wide with a 3 ft landing take ${fmt(THREE.order.cuftNet, 1)} cu ft — ${fmtInt(THREE.order.bags)} × 80-lb bags. Any steps, rise, tread and landing, with IRC checks.`,
    summary: "Enter the number of steps (or the total height), tread depth, width and landing to get bags, cubic yards, the stair formula with your numbers, a forms list and an IRC rise/run check.",
    outputs: ["Bags & cubic yards", "Stair formula worked out", "IRC rise/run check", "Forms list"],
    faq: [
      {
        q: "How much concrete do I need for 3 steps?",
        a: `Three steps 4 ft wide with 7 in risers, 11 in treads and a 36 in landing take ${fmt(THREE.order.cuftNet, 1)} cu ft (${fmt(THREE.order.cuydNet, 2)} yd³) — ${fmtInt(THREE.order.bags)} × 80-lb bags with 10% extra. Without a landing (up to an existing porch) it is ${fmt(THREE_PORCH.order.cuftNet, 1)} cu ft, ${fmtInt(THREE_PORCH.order.bags)} bags.`,
      },
      { q: "What is the formula for concrete steps?", a: "Volume = width × [rise × tread × (n − 1) × n ÷ 2 + n × rise × landing depth], with n the number of step-ups. Use inches for rise, tread and landing, feet for the width, and divide by 144 for cubic feet." },
      { q: "What is the maximum rise for outdoor steps?", a: "The IRC allows risers up to 7¾ in and treads of at least 10 in, with no more than ⅜ in difference within a flight. Treads 11 in or deeper need no nosing, which suits concrete." },
      { q: "How big does the landing at a door need to be?", a: "At least 36 in deep in the direction of travel and as wide as the door (IRC R311.3), with no more than a 2% slope. It can be up to 7¾ in below the threshold if the door does not swing over it." },
      { q: "Do concrete steps need a handrail?", a: "Yes, once there are four or more risers: a handrail 34–38 in high on at least one side (IRC R311.7.8). A landing more than 30 in above grade also needs a guard." },
      { q: "What kind of concrete should I use for outdoor steps?", a: "Where winters freeze, IRC Table R402.2 calls for 3,000–3,500 psi air-entrained concrete (5–7% air) for exposed steps. Regular bagged mix is not air-entrained; Crack-Resistant mix (4–8% air) or air-entrained ready-mix holds up better." },
    ],
    sources: concreteSources("qk1101", "qkCrack", "retail", "readyMix", "ircStairs", "ircLandings", "ircHandrails", "ircSlab"),
    related: ["concrete/slab-calculator", "concrete/footing-calculator", "landscaping/gravel-calculator", "lumber/stair-calculator"],
    updated: CONCRETE_CHECKED,
    keywords: ["concrete steps", "concrete stairs", "stoop", "porch steps", "how much concrete for steps", "stair formula", "riser", "landing"],
  },
  Calculator: StepsCalculator,
  Content,
  presets: STEPS_PRESETS,
  presetAnswer,
};
