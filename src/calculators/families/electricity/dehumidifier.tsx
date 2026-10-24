import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { dehumidifierIef, dehumidifierWatts, fmtCents, ratesRanked, usageCost } from "./compute";
import { DAYS_PER_MONTH, DEHUM_ES_IEF, DEHUM_RATING_CROSSWALK, ELECTRICITY_CHECKED, LITERS_PER_PINT, RATES, SOURCES, dehumMinIef } from "./data";
import DehumidifierCalculator from "./DehumidifierCalculator";
import { DEHUM_DEFAULTS, computeDehumCalc, type DehumValues } from "./dehumidifier-model";
import { fitTitle, usYtdCents } from "./shared";

const SLUG = "dehumidifier-cost-calculator";
const US = usYtdCents();

/* ───────── programmatic presets: capacities, old ratings, schedules ───────── */

const SPECS: { slug: string; label: string; title: string; noun: string; h1: string; group: string; values: Partial<DehumValues> }[] = [
  ...[20, 30, 35, 50].map((p) => ({
    slug: `${p}-pint`,
    label: `${p}-pint dehumidifier`,
    title: `${p}-Pint Dehumidifier`,
    noun: `${p}-pint dehumidifier`,
    h1: `How much does it cost to run a ${p}-pint dehumidifier?`,
    group: "By capacity",
    values: { pints: p },
  })),
  { slug: "50-pint-old-rating", label: "Older 50-pint (pre-2019)", title: "Older 50-Pint Dehumidifier", noun: "pre-2019 50-pint dehumidifier", h1: "How much does an older 50-pint dehumidifier cost to run?", group: "Older ratings & whole-home", values: { pints: 50, rating: "2012" } },
  { slug: "70-pint-old-rating", label: "Older 70-pint (pre-2019)", title: "Older 70-Pint Dehumidifier", noun: "pre-2019 70-pint dehumidifier", h1: "How much does an older 70-pint dehumidifier cost to run?", group: "Older ratings & whole-home", values: { pints: 70, rating: "2012" } },
  { slug: "whole-house-70-pint", label: "Whole-house, 70 pints", title: "Whole-House Dehumidifier", noun: "70-pint whole-house dehumidifier", h1: "How much does a whole-house dehumidifier cost to run?", group: "Older ratings & whole-home", values: { kind: "wholehome", pints: 70 } },
  { slug: "12-hours-a-day", label: "50-pint, 12 hours a day", title: "Dehumidifier 12 Hours a Day", noun: "50-pint dehumidifier", h1: "How much does it cost to run a dehumidifier 12 hours a day?", group: "By capacity", values: { pints: 50, hours: 12 } },
];

export const DEHUM_PRESETS: Preset<DehumValues>[] = SPECS.map((s) => {
  const values: DehumValues = { ...DEHUM_DEFAULTS, ...s.values };
  const c = computeDehumCalc(values);
  return {
    slug: s.slug,
    values,
    group: s.group,
    label: s.label,
    h1: s.h1,
    metaTitle: fitTitle(`${s.title} Cost: ${fmtMoney(c.cost.perMonth)} a Month Nonstop`, `${s.title} Cost: ${fmtMoney(c.cost.perMonth)}/Month`),
    metaDescription: `A ${s.noun} draws about ${fmtInt(c.watts)} W: ${fmtMoney(c.cost.perMonth, { cents: true })} a month running ${values.hours} h a day at ${fmtCents(US)}/kWh, ${fmtMoney(c.band[0])}–${fmtMoney(c.band[1])} with a humidistat.`,
  };
});

function presetAnswer(v: DehumValues): PresetAnswer {
  const c = computeDehumCalc(v);
  const { rate } = c;
  const ranked = ratesRanked("ytd");
  const wholeHome = v.kind === "wholehome";
  const minIef = dehumMinIef(c.pints, wholeHome);
  const minW = dehumidifierWatts(c.pints, minIef);
  const usage = (duty: number) => usageCost({ kw: c.watts / 1000, hoursPerDay: v.hours, dutyPct: duty, daysPerMonth: DAYS_PER_MONTH, monthsPerYear: 12, qty: v.qty }, rate.cents);
  return {
    headline: `A ${fmt(v.pints, 0)}-pint ${wholeHome ? "whole-house" : "portable"} dehumidifier${v.rating === "2012" ? " (pre-2019 rating)" : ""} draws about ${fmtInt(c.watts)} W and costs ${fmtMoney(c.cost.perMonth, { cents: true })} a month if the compressor runs ${fmt(v.hours)} hours a day, at the U.S. average of ${fmtCents(rate.cents)}/kWh — ${fmtMoney(c.band[0], { cents: true })}–${fmtMoney(c.band[1], { cents: true })} with a humidistat cycling it.`,
    bullets: [
      `Power = pints × 0.4732 L ÷ IEF ÷ 24 h: ${fmt(c.pints, 1)} × ${LITERS_PER_PINT} ÷ ${fmt(c.ief, 2)} ÷ 24 = ${fmtInt(c.watts)} W (${fmt((c.watts * 24) / 1000, 1)} kWh a day nonstop).`,
      v.rating === "2012"
        ? `Dehumidifiers rated before June 2019 were tested at 80°F; on today's 65°F test the same machine rates lower. ENERGY STAR equates an old ${v.pints}-pint unit to about ${fmt(c.pints, 0)} pints now, which is the capacity the efficiency figures use.`
        : `The capacity is on today's DOE test (65°F); a box from before mid-2019 shows a higher number for the same machine.`,
      wholeHome
        ? `Whole-home ENERGY STAR units average IEF ${DEHUM_ES_IEF.wholeHome}; the federal minimum for a compact whole-home unit is ${minIef}.`
        : `At the federal minimum IEF for this size (${minIef}) it would draw ${fmtInt(minW)} W instead${minW > c.watts ? ` — ${fmtMoney(usageCost({ kw: minW / 1000, hoursPerDay: v.hours, dutyPct: 100, daysPerMonth: DAYS_PER_MONTH, monthsPerYear: 12, qty: v.qty }, rate.cents).perMonth - c.cost.perMonth, { cents: true })} a month more nonstop` : ""}.`,
      `The same use costs ${fmtMoney(c.cost.perMonth * (ranked[ranked.length - 1].ytdCents / rate.cents), { cents: true })} a month in ${ranked[ranked.length - 1].state} and ${fmtMoney(c.cost.perMonth * (ranked[0].ytdCents / rate.cents), { cents: true })} in ${ranked[0].state}.`,
      `For reference, ENERGY STAR's average portable unit over 30 pints is rated at 460 kWh a year on DOE's test hours — ${fmtMoney((460 * rate.cents) / 100)} a year.`,
    ],
    table: {
      caption: `${fmt(v.pints, 0)}-pint dehumidifier by how often the compressor runs (${fmt(v.hours)} h plugged in a day)`,
      columns: ["Compressor on", "kWh a day", "Per day", "Per month", "Per year"],
      rows: [100, 75, 50, 25].map((d) => {
        const x = usage(d);
        return [`${d}%`, fmt(x.kwhDay, 1), fmtMoneyPrecise(x.perDay), fmtMoney(x.perMonth, { cents: true }), fmtMoney(x.perYear)];
      }),
    },
    notes: [
      `IEF (Integrated Energy Factor) is liters of water removed per kWh on the DOE test, so watts at rated capacity = liters per day ÷ IEF ÷ 24. With a humidistat the compressor stops once the air is dry enough, so real use depends on how damp the space is.`,
      `Prices: EIA U.S. average for ${RATES.period}. Efficiency: ENERGY STAR certified averages and 10 CFR 430.32 minimums.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const d = US / 100;
  const rows = [20, 30, 35, 50].map((p) => ({ p, w: dehumidifierWatts(p, dehumidifierIef(p, false, "es", 0)), ief: dehumidifierIef(p, false, "es", 0) }));
  return (
    <>
      <h2>How much power a dehumidifier draws</h2>
      <p>
        Dehumidifier efficiency is rated as an <strong>Integrated Energy Factor (IEF)</strong>: liters of water removed per kWh on the DOE test. So
        the power while the compressor runs is <strong>pints per day × 0.4732 ÷ IEF ÷ 24</strong> kilowatts.
      </p>
      <p>
        <strong>Worked example — 50 pints at IEF 2.02:</strong> 50 × 0.4732 = 23.7 L a day; ÷ 2.02 = 11.7 kWh a day; ÷ 24 h = 0.488 kW. Running
        nonstop at the U.S. average of {fmtCents(US)}/kWh that&apos;s {fmtMoneyPrecise(11.71 * d)} a day and {fmtMoney(11.71 * 30.42 * d)} a month.
        With a humidistat switching the compressor off half the time, half that.
      </p>
      <table>
        <thead>
          <tr>
            <th>Capacity (pints/day)</th>
            <th>IEF used</th>
            <th>Watts running</th>
            <th>24/7, per month</th>
            <th>Half the time, per month</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, w, ief }) => (
            <tr key={p}>
              <td>
                <Link href={`/electricity/${SLUG}/${p}-pint`}>{p} pints</Link>
              </td>
              <td>{fmt(ief, 2)}</td>
              <td>{fmtInt(w)}</td>
              <td>{fmtMoney((w / 1000) * 24 * 30.42 * d, { cents: true })}</td>
              <td>{fmtMoney((w / 1000) * 12 * 30.42 * d, { cents: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        IEF values are ENERGY STAR certified averages: {DEHUM_ES_IEF.portableAll} across all portables and {DEHUM_ES_IEF.portableLarge} for units over 30
        pints. Federal minimums since June 2019 are 1.30 up to 25 pints, 1.60 for 25–50 pints and 2.80 above 50 pints.
      </p>

      <h2>The pint ratings changed in 2019</h2>
      <p>
        Before June 2019 dehumidifiers were tested in 80°F air; now the test runs at 65°F, closer to a basement, and the same machine removes less
        water — so it carries a smaller number. ENERGY STAR&apos;s rough crosswalk: an old {DEHUM_RATING_CROSSWALK[0].old}-pint unit ≈{" "}
        {DEHUM_RATING_CROSSWALK[0].now} pints today, {DEHUM_RATING_CROSSWALK[1].old} ≈ {DEHUM_RATING_CROSSWALK[1].now}, and{" "}
        {DEHUM_RATING_CROSSWALK[2].old} ≈ 40–45. Mixing an old pint rating with a new IEF overstates the watts, which is why the calculator asks which
        test the box uses.
      </p>

      <h2>How long will it run?</h2>
      <p>
        Plugged in around the clock, a dehumidifier on a humidistat runs its compressor only while the air is above the set point. A damp basement in
        summer may keep it running most of the time; a drier space far less. The calculator shows nonstop as the worst case plus a 25–75% range,
        or measure it: a plug-in meter over a few days gives the real kWh.
      </p>

      <h2>Ways to spend less</h2>
      <ul>
        <li>Set the humidistat to around 50% instead of continuous.</li>
        <li>Drain to a floor drain or pump so the unit never sits idle on a full bucket and then has to catch up.</li>
        <li>Keep doors and windows to the space closed, and fix the moisture source — gutters, grading, a dryer vent — where you can.</li>
        <li>Clean the air filter regularly so the coil gets full airflow.</li>
        <li>When buying, compare IEF: a higher number removes more water per kWh.</li>
      </ul>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>Assuming 24/7 means full power 24/7.</strong> With a humidistat it cycles.
        </li>
        <li>
          <strong>Comparing an old 70-pint box to a new 50-pint one.</strong> On today&apos;s test the old unit is roughly a 40–45-pint machine.
        </li>
        <li>
          <strong>Ignoring the air conditioner.</strong> In living spaces central AC already removes moisture, and every watt a dehumidifier uses ends up as heat in the room.
        </li>
      </ul>
      <p>
        See also the <Link href="/electricity/air-conditioner-cost-calculator">air conditioner cost calculator</Link> and your{" "}
        <Link href="/electricity/electricity-rates-by-state">state&apos;s electricity rate</Link>.
      </p>
    </>
  );
}

export const dehumidifierCalculator: CalculatorEntry<DehumValues> = {
  meta: {
    slug: SLUG,
    category: "electricity",
    name: "Dehumidifier Cost Calculator",
    shortName: "Dehumidifiers",
    h1: "Dehumidifier Cost Calculator",
    metaTitle: "Dehumidifier Cost Calculator: Per Day, Month & 24/7",
    metaDescription: `A 50-pint dehumidifier draws about ${fmtInt(dehumidifierWatts(50, DEHUM_ES_IEF.portableLarge))} W — ${fmtMoney((dehumidifierWatts(50, DEHUM_ES_IEF.portableLarge) / 1000) * 24 * 30.42 * (US / 100))} a month nonstop at the U.S. average. By capacity, IEF, rating year and state.`,
    summary:
      "Enter your dehumidifier's capacity and efficiency (or pick ENERGY STAR or federal-minimum values) and see what it costs per day, month and year — nonstop or cycling on a humidistat — at your state's rate.",
    outputs: ["Watts from pints & IEF", "Cost 24/7 vs cycling", "Old vs new pint ratings", "Monthly & yearly"],
    faq: [
      { q: "How much does it cost to run a dehumidifier 24/7?", a: `A 50-pint unit at IEF 2.02 draws about 488 W, so running nonstop uses 11.7 kWh a day — ${fmtMoney(11.71 * 30.42 * (US / 100))} a month at the U.S. average of ${fmtCents(US)}/kWh. On a humidistat it usually costs a fraction of that.` },
      { q: "How many watts does a dehumidifier use?", a: "Pints per day × 0.4732 ÷ IEF ÷ 24 gives kilowatts. Typical results: about 200 W for 20 pints, 300 W for 30 pints and 490 W for 50 pints at ENERGY STAR-level efficiency." },
      { q: "Why does my new 30-pint dehumidifier look like my old 50-pint one?", a: "Because the DOE test changed in June 2019 from 80°F to 65°F air. ENERGY STAR equates an old 50-pint rating to about 30 pints on the new test, and an old 70-pint to about 40–45." },
      { q: "How much electricity does a dehumidifier use per year?", a: `ENERGY STAR's average certified portable unit over 30 pints is rated at 460 kWh a year on DOE's test hours — ${fmtMoney(460 * (US / 100))} at the U.S. average price. Running more hours costs proportionally more.` },
      { q: "Is a bigger dehumidifier more expensive to run?", a: "Not necessarily. A larger unit removes the moisture faster and then cycles off, and above 50 pints the federal minimum efficiency (IEF 2.80) is much higher than for mid-size units (1.60)." },
      { q: "What is a good IEF for a dehumidifier?", a: `Higher is better. ENERGY STAR certified portables average ${DEHUM_ES_IEF.portableAll} overall and ${DEHUM_ES_IEF.portableLarge} above 30 pints; whole-home units average ${DEHUM_ES_IEF.wholeHome}.` },
    ],
    sources: [SOURCES.esDehumidifiers, SOURCES.ecfr, SOURCES.eiaMonthly, SOURCES.killAWatt, SOURCES.eiaTechNotes],
    related: ["electricity/air-conditioner-cost-calculator", "electricity/electricity-cost-calculator", "electricity/electricity-rates-by-state", "electricity/btu-calculator"],
    updated: ELECTRICITY_CHECKED,
    keywords: ["dehumidifier cost", "dehumidifier watts", "cost to run dehumidifier 24/7", "50 pint dehumidifier", "dehumidifier electricity"],
  },
  Calculator: DehumidifierCalculator,
  Content,
  presets: DEHUM_PRESETS,
  presetAnswer,
};
