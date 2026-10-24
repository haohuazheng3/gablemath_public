import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { affinityWatts, computePoolPump, fmtCents, ratesRanked } from "./compute";
import { ELECTRICITY_CHECKED, POOL_PUMP, RATES, SOURCES } from "./data";
import PoolPumpCalculator from "./PoolPumpCalculator";
import { POOL_DEFAULTS, computePoolCalc, pumpWatts, type PoolValues } from "./pool-pump-model";
import { fitTitle, usYtdCents } from "./shared";

const SLUG = "pool-pump-cost-calculator";
const US = usYtdCents();
const ABOVE = { ground: "above", highW: POOL_PUMP.above.high, lowW: POOL_PUMP.above.low };
/** The default schedule (2 h high + 10 h low, in-ground VS), used in meta and FAQ text. */
const BASE_RUN = computePoolCalc(POOL_DEFAULTS).r;

/* ───────── programmatic presets: pump type × schedule ───────── */

const SPECS: { slug: string; label: string; title: string; h1: string; group: string; values: Partial<PoolValues> }[] = [
  { slug: "single-speed-8-hours", label: "Single-speed, 8 h a day", title: "Single-Speed Pool Pump (8 h)", h1: "How much does it cost to run a single-speed pool pump 8 hours a day?", group: "Single-speed & booster", values: { pump: "single", hours: 8 } },
  { slug: "single-speed-12-hours", label: "Single-speed, 12 h a day", title: "Single-Speed Pool Pump (12 h)", h1: "How much does it cost to run a pool pump 12 hours a day?", group: "Single-speed & booster", values: { pump: "single", hours: 12 } },
  { slug: "single-speed-summer-only", label: "Single-speed, 4-month season", title: "Pool Pump, Summer Only", h1: "How much does a pool pump cost for one summer?", group: "Single-speed & booster", values: { pump: "single", hours: 8, months: 4 } },
  { slug: "booster-pump", label: "Booster pump, 3 h a day", title: "Pool Booster Pump", h1: "How much does a pool cleaner booster pump cost to run?", group: "Single-speed & booster", values: { pump: "booster", hours: 3 } },
  { slug: "variable-speed", label: "Variable speed, 2 h high + 10 h low", title: "Variable-Speed Pool Pump", h1: "How much does a variable-speed pool pump cost to run?", group: "Variable speed", values: {} },
  { slug: "variable-speed-8-hours-low", label: "Variable speed, 8 h on low", title: "Variable-Speed Pump, 8 h Low", h1: "How much does a variable-speed pump cost on low for 8 hours?", group: "Variable speed", values: { highHours: 0, lowHours: 8 } },
  { slug: "variable-speed-24-hours", label: "Variable speed, 24 h on low", title: "Variable-Speed Pump Running 24/7", h1: "How much does it cost to run a variable-speed pool pump 24/7?", group: "Variable speed", values: { highHours: 0, lowHours: 24 } },
  { slug: "above-ground-variable-speed", label: "Above-ground, variable speed", title: "Above-Ground Pool Pump", h1: "How much does an above-ground pool pump cost to run?", group: "Variable speed", values: { ...ABOVE } },
];

export const POOL_PRESETS: Preset<PoolValues>[] = SPECS.map((s) => {
  const values: PoolValues = { ...POOL_DEFAULTS, ...s.values };
  const { r } = computePoolCalc(values);
  return {
    slug: s.slug,
    values,
    group: s.group,
    label: s.label,
    h1: s.h1,
    metaTitle: fitTitle(`${s.title} Cost: ${fmtMoney(r.perMonth)} a Month`, `${s.title}: ${fmtMoney(r.perMonth)}/Month`),
    metaDescription: `${s.label}: ${fmt(r.kwhDay, 1)} kWh a day, ${fmtMoney(r.perMonth, { cents: true })} a month and ${fmtMoney(r.perYear)} a year at the U.S. average ${fmtCents(US)}/kWh. ENERGY STAR pump data.`,
  };
});

function presetAnswer(v: PoolValues): PresetAnswer {
  const { r, rate } = computePoolCalc(v);
  const ranked = ratesRanked("ytd");
  const vs = v.pump === "vs";
  const ground = v.ground === "above" ? POOL_PUMP.above : POOL_PUMP.inground;
  const run = (pump: string, extra: Partial<Parameters<typeof computePoolPump>[0]>) =>
    computePoolPump({ pump, highW: ground.high, lowW: ground.low, highHours: 0, lowHours: 0, watts: POOL_PUMP.singleSpeed, hours: 0, months: v.months, cents: rate.cents, ...extra });
  const what = vs
    ? `A variable-speed ${v.ground === "above" ? "above-ground" : "in-ground"} pool pump running ${fmt(v.highHours)} h on high and ${fmt(v.lowHours)} h on low`
    : v.pump === "booster"
      ? `A pressure-cleaner booster pump running ${fmt(v.hours)} h a day`
      : `A ${fmtInt(pumpWatts(v))} W single-speed pump running ${fmt(v.hours)} h a day`;
  return {
    headline: `${what} costs about ${fmtMoney(r.perMonth, { cents: true })} a month (${fmt(r.kwhDay, 1)} kWh a day) at the U.S. average of ${fmtCents(rate.cents)}/kWh — ${fmtMoney(r.perYear)} for ${fmt(v.months, 0)} month${v.months === 1 ? "" : "s"}.`,
    bullets: [
      vs
        ? `ENERGY STAR ${v.ground === "above" ? "above-ground" : "in-ground"} variable-speed pumps average ${fmtInt(ground.high)} W at the high-speed test point and ${fmtInt(ground.low)} W at low speed: ${fmtInt(ground.high)} × ${fmt(v.highHours)} h + ${fmtInt(ground.low)} × ${fmt(v.lowHours)} h = ${fmt(r.kwhDay, 2)} kWh a day.`
        : v.pump === "booster"
          ? `Booster pumps in the ENERGY STAR list average about ${fmtInt(POOL_PUMP.booster)} W; ${fmt(v.hours)} h a day is ${fmt(r.kwhDay, 2)} kWh.`
          : `Older 1.5 hp single-speed in-ground pumps draw roughly 1,500–2,000 W (estimate; we use ${fmtInt(POOL_PUMP.singleSpeed)} W). ${fmt(v.hours)} h a day is ${fmt(r.kwhDay, 1)} kWh.`,
      vs || v.pump === "booster"
        ? `A single-speed pump for the same ${fmt(r.hoursPerDay, 1)} hours would cost about ${fmtMoney(r.singleSpeedYear)} a year (estimate).`
        : `A variable-speed pump filtering on low for the same ${fmt(v.hours)} hours would cost ${fmtMoney(run("vs", { lowHours: v.hours }).perYear)} a year — ${fmtMoney(r.perYear - run("vs", { lowHours: v.hours }).perYear)} less.`,
      `ENERGY STAR's rule of thumb: half the speed uses one-eighth of the power. At 50% speed a pump that draws ${fmtInt(ground.high)} W uses about ${fmtInt(affinityWatts(ground.high, 50))} W.`,
      `The same schedule costs ${fmtMoney(r.perMonth * (ranked[ranked.length - 1].ytdCents / rate.cents), { cents: true })} a month in ${ranked[ranked.length - 1].state} and ${fmtMoney(r.perMonth * (ranked[0].ytdCents / rate.cents), { cents: true })} in ${ranked[0].state}.`,
    ],
    table: {
      caption: `Common schedules for ${fmt(v.months, 0)} month${v.months === 1 ? "" : "s"} a year at ${fmtCents(rate.cents)}/kWh`,
      columns: ["Pump & schedule", "kWh a day", "Per month", "Per year"],
      rows: [
        { label: "Single-speed, 8 h", x: run("single", { hours: 8 }) },
        { label: "Single-speed, 12 h", x: run("single", { hours: 12 }) },
        { label: "Variable speed, 2 h high + 10 h low", x: run("vs", { highHours: 2, lowHours: 10 }) },
        { label: "Variable speed, 12 h low", x: run("vs", { lowHours: 12 }) },
        { label: "Variable speed, 24 h low", x: run("vs", { lowHours: 24 }) },
      ].map(({ label, x }) => [label, fmt(x.kwhDay, 1), fmtMoney(x.perMonth, { cents: true }), fmtMoney(x.perYear)]),
    },
    notes: [
      `${fmt(r.kwhDay, 2)} kWh a day × 30.42 days × ${fmtCents(rate.cents)} = ${fmtMoney(r.perMonth, { cents: true })} a month; × ${fmt(v.months, 0)} months = ${fmtMoney(r.perYear)}.`,
      `Prices: EIA U.S. average for ${RATES.period}. Pump watts: ENERGY STAR certified pool pump data; the single-speed figure is an estimate — check the motor plate or the pump's display for yours.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const d = US / 100;
  const ig = POOL_PUMP.inground;
  const daily = (w: number, h: number) => (w / 1000) * h;
  return (
    <>
      <h2>What a pool pump costs to run</h2>
      <p>
        A pump&apos;s cost is its watts × hours × your price per kWh, and the pump type decides the watts. Variable-speed pumps can run slowly for
        filtration; because pump power falls with the cube of speed, <strong>half the speed uses about one-eighth of the power</strong>
        (ENERGY STAR). That is why they cost so much less than single-speed pumps that always run flat out.
      </p>
      <p>
        <strong>Worked example:</strong> an ENERGY STAR in-ground variable-speed pump averages {fmtInt(ig.low)} W on low and {fmtInt(ig.high)} W on high.
        Ten hours on low plus two on high is {fmt(daily(ig.low, 10) + daily(ig.high, 2), 2)} kWh a day — {fmtMoneyPrecise((daily(ig.low, 10) + daily(ig.high, 2)) * d)} a
        day or {fmtMoney((daily(ig.low, 10) + daily(ig.high, 2)) * 30.42 * d, { cents: true })} a month at {fmtCents(US)}/kWh. A {fmtInt(POOL_PUMP.singleSpeed)} W
        single-speed pump for 8 hours uses {fmt(daily(POOL_PUMP.singleSpeed, 8), 0)} kWh a day: {fmtMoney(daily(POOL_PUMP.singleSpeed, 8) * 30.42 * d, { cents: true })} a month.
      </p>

      <h2>Pool pump power by type</h2>
      <table>
        <thead>
          <tr>
            <th>Pump</th>
            <th>Watts</th>
            <th>8 h a day, per month</th>
          </tr>
        </thead>
        <tbody>
          {[
            { label: "In-ground variable speed, low", w: ig.low, href: "variable-speed-8-hours-low" },
            { label: "In-ground variable speed, high", w: ig.high, href: "variable-speed" },
            { label: "Above-ground variable speed, low", w: POOL_PUMP.above.low, href: "above-ground-variable-speed" },
            { label: "Above-ground variable speed, high", w: POOL_PUMP.above.high, href: "above-ground-variable-speed" },
            { label: "Booster (pressure-side cleaner)", w: POOL_PUMP.booster, href: "booster-pump" },
            { label: "Single speed, 1.5 hp (estimate)", w: POOL_PUMP.singleSpeed, href: "single-speed-8-hours" },
          ].map((p) => (
            <tr key={p.label}>
              <td>
                <Link href={`/electricity/${SLUG}/${p.href}`}>{p.label}</Link>
              </td>
              <td>{fmtInt(p.w)}</td>
              <td>{fmtMoney(daily(p.w, 8) * 30.42 * d, { cents: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Variable-speed and booster figures are averages of ENERGY STAR certified pumps at the federal test points. ENERGY STAR lists no in-ground
        single-speed filter pumps; the 1.5 hp figure is the typical 1,500–2,000 W range of older pumps, so read your motor plate or the
        pump&apos;s display for a real number.
      </p>

      <h2>Hours and season</h2>
      <p>
        Pools in warm states often run all year; northern pools run only through the swimming season. Set the months in the calculator, and for
        a variable-speed pump split the day between a short high-speed block (for skimming, a heater or a cleaner) and long low-speed
        filtration. Running longer on low usually costs less than running a shorter time on high.
      </p>

      <h2>Ways to cut the cost</h2>
      <ul>
        <li>Replace a single-speed pump with a variable-speed model; ENERGY STAR estimates certified in-ground pumps save about ${POOL_PUMP.esSavingsInground} a year over standard models.</li>
        <li>Program high speed only for the tasks that need it.</li>
        <li>Keep the skimmer basket and filter clean so the water turns over in fewer hours.</li>
        <li>On a time-of-use plan, schedule filtration outside the peak window.</li>
      </ul>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>Using horsepower × 746 W.</strong> Motor horsepower isn&apos;t electrical input; the pump&apos;s display or a meter tells you the real watts.
        </li>
        <li>
          <strong>Pricing a variable-speed pump at full speed all day.</strong> Most of its hours should be at low speed.
        </li>
        <li>
          <strong>Forgetting the booster pump.</strong> A pressure-side cleaner&apos;s booster can draw more than the main pump on low.
        </li>
      </ul>
      <p>
        Adding a spa? See the <Link href="/electricity/hot-tub-cost-calculator">hot tub cost calculator</Link>, or check your{" "}
        <Link href="/electricity/electricity-rates-by-state">state&apos;s price per kWh</Link>.
      </p>
    </>
  );
}

export const poolPumpCalculator: CalculatorEntry<PoolValues> = {
  meta: {
    slug: SLUG,
    category: "electricity",
    name: "Pool Pump Cost Calculator",
    shortName: "Pool pumps",
    h1: "Pool Pump Cost Calculator",
    metaTitle: "Pool Pump Cost Calculator: Single vs Variable Speed",
    metaDescription: `A variable-speed pool pump (2 h high + 10 h low) costs about ${fmtMoney(BASE_RUN.perMonth)} a month at the U.S. average rate vs ${fmtMoney((POOL_PUMP.singleSpeed / 1000) * 8 * 30.42 * (US / 100))} for single speed.`,
    summary:
      "Price your pool pump per day, month and season — variable-speed schedules, single-speed or booster — at your state's electricity rate, and see what switching to variable speed saves.",
    outputs: ["Cost per month & year", "kWh per day", "Single vs variable speed", "Schedule comparison"],
    faq: [
      { q: "How much does it cost to run a pool pump per month?", a: `A variable-speed in-ground pump running 2 hours on high and 10 on low uses about ${fmt(BASE_RUN.kwhDay, 1)} kWh a day — ${fmtMoney(BASE_RUN.perMonth, { cents: true })} a month at the U.S. average of ${fmtCents(US)}/kWh. An older single-speed pump for 8 hours is closer to ${fmtMoney((POOL_PUMP.singleSpeed / 1000) * 8 * 30.42 * (US / 100))}.` },
      { q: "How much does a variable-speed pool pump save?", a: "Running on low for filtration it can use a small fraction of a single-speed pump's energy, because power falls with the cube of speed: half the speed uses about one-eighth the power (ENERGY STAR). ENERGY STAR estimates certified in-ground pumps save about $50 a year over standard models." },
      { q: "How many watts does a pool pump use?", a: `ENERGY STAR in-ground variable-speed pumps average about ${fmtInt(POOL_PUMP.inground.low)} W on low and ${fmtInt(POOL_PUMP.inground.high)} W at high speed; above-ground models ${fmtInt(POOL_PUMP.above.low)} and ${fmtInt(POOL_PUMP.above.high)} W. Older 1.5 hp single-speed pumps draw roughly 1,500–2,000 W.` },
      { q: "Is it cheaper to run a pool pump 24 hours on low than 8 hours on high?", a: `Yes. 24 hours at ${fmtInt(POOL_PUMP.inground.low)} W is ${fmt((POOL_PUMP.inground.low * 24) / 1000, 1)} kWh a day, while 8 hours at ${fmtInt(POOL_PUMP.inground.high)} W is ${fmt((POOL_PUMP.inground.high * 8) / 1000, 1)} kWh — and an older single-speed pump for 8 hours uses about ${fmt((POOL_PUMP.singleSpeed * 8) / 1000, 0)} kWh.` },
      { q: "Does a booster pump add much to the bill?", a: `Booster pumps for pressure-side cleaners average about ${fmtInt(POOL_PUMP.booster)} W in the ENERGY STAR list, so 3 hours a day is about ${fmt((POOL_PUMP.booster * 3) / 1000, 1)} kWh — ${fmtMoney(((POOL_PUMP.booster * 3) / 1000) * 30.42 * (US / 100), { cents: true })} a month at the U.S. average price.` },
    ],
    sources: [SOURCES.esPoolPumps, SOURCES.eiaMonthly, SOURCES.eiaTechNotes],
    related: ["electricity/hot-tub-cost-calculator", "electricity/electricity-cost-calculator", "electricity/electricity-rates-by-state", "solar/solar-panel-calculator"],
    updated: ELECTRICITY_CHECKED,
    keywords: ["pool pump cost", "variable speed pool pump", "pool pump electricity", "pool pump watts", "cost to run pool pump"],
  },
  Calculator: PoolPumpCalculator,
  Content,
  presets: POOL_PRESETS,
  presetAnswer,
};
