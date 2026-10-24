import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeHotTub, fmtCents, spaMaxStandbyW, stateInfo, stateRate } from "./compute";
import { ELECTRICITY_CHECKED, HOT_TUB_KWH_YEAR_RANGE, MONTH_NAME, RATES, SOURCES, SPA } from "./data";
import HotTubCalculator from "./HotTubCalculator";
import { HOT_TUB_DEFAULTS, computeHotTubCalc, spaKind, type HotTubValues } from "./hot-tub-model";
import { fitTitle, usYtdCents } from "./shared";

const SLUG = "hot-tub-cost-calculator";
const US = usYtdCents();
/** Cold-to-warm sample of states for the climate comparison. */
const CLIMATE_STATES = ["MN", "CO", "NY", "OH", "WA", "TX", "CA", "AZ", "FL"];
/** The default 400-gallon tub, used in the FAQ answers. */
const BASE_RUN = computeHotTubCalc(HOT_TUB_DEFAULTS).r;

/* ───────── programmatic presets: fill volumes, inflatable and indoor ───────── */

const SPECS: { slug: string; label: string; title: string; group: string; values: Partial<HotTubValues> }[] = [
  ...[250, 300, 350, 400, 450, 500].map((g) => ({ slug: `${g}-gallon`, label: `${g}-gallon hot tub`, title: `${g}-Gallon Hot Tub`, group: "Hard-shell tubs by size", values: { gallons: g } })),
  { slug: "inflatable-250-gallon", label: "250-gallon inflatable", title: "Inflatable Hot Tub (250 gal)", group: "Inflatable & indoor", values: { kind: "inflatable", gallons: 250 } },
  { slug: "indoor-400-gallon", label: "400-gallon tub indoors", title: "Indoor Hot Tub (400 gal)", group: "Inflatable & indoor", values: { gallons: 400, location: "indoor" } },
];

function preset(s: (typeof SPECS)[number]): Preset<HotTubValues> {
  const values: HotTubValues = { ...HOT_TUB_DEFAULTS, ...s.values, labelW: Math.round(spaMaxStandbyW(s.values.gallons ?? 400, s.values.kind === "inflatable" ? "inflatable" : "standard")) };
  const { r } = computeHotTubCalc(values);
  const what = s.values.kind === "inflatable" ? `a ${s.values.gallons}-gallon inflatable hot tub` : s.values.location === "indoor" ? "an indoor hot tub" : `a ${s.values.gallons}-gallon hot tub`;
  return {
    slug: s.slug,
    values,
    group: s.group,
    label: s.label,
    h1: `How much does it cost to run ${what} per month?`,
    metaTitle: fitTitle(`${s.title} Electricity Cost: ${fmtMoney(r.perMonth)} a Month`, `${s.title} Cost: ${fmtMoney(r.perMonth)} a Month`),
    metaDescription: `Keeping ${what} at 102°F costs about ${fmtMoney(r.perMonth, { cents: true })} a month (${fmtInt(r.kwhYear)} kWh a year) at ${fmtCents(US)}/kWh, more in winter. By state and setpoint.`,
  };
}

export const HOT_TUB_PRESETS: Preset<HotTubValues>[] = SPECS.map(preset);

function presetAnswer(v: HotTubValues): PresetAnswer {
  const c = computeHotTubCalc(v);
  const { r, rate } = c;
  const kind = spaKind(v);
  const indoor = v.location === "indoor";
  const at = (code: string) => computeHotTub({ standbyW: c.standbyW, setpointF: v.setpoint, location: v.location === "indoor" ? "indoor" : "outdoor", indoorF: v.indoorF, info: stateInfo(code), cents: stateRate(code).ytdCents });
  const cooler = computeHotTub({ standbyW: c.standbyW, setpointF: v.setpoint - 2, location: indoor ? "indoor" : "outdoor", indoorF: v.indoorF, info: c.info, cents: rate.cents });
  const otherKind = kind === "inflatable" ? "standard" : "inflatable";
  const otherW = spaMaxStandbyW(v.gallons, otherKind);
  return {
    headline: `A ${fmtInt(v.gallons)}-gallon ${kind === "inflatable" ? "inflatable spa" : "hot tub"}${indoor ? ` indoors at ${fmt(v.indoorF, 0)}°F` : ""} that meets California's standby limit costs about ${fmtMoney(r.perMonth, { cents: true })} a month to keep at ${fmt(v.setpoint, 0)}°F — ${fmtMoney(r.costYear)} a year (${fmtInt(r.kwhYear)} kWh) at the U.S. average ${fmtCents(rate.cents)}/kWh.`,
    bullets: [
      `California Title 20 caps a ${kind === "inflatable" ? "inflatable spa's standby power at 7 × V^(2/3)" : "hard-shell spa's standby power at 3.75 × V^(2/3) + 40"} watts: ${fmtInt(c.maxW)} W for ${fmtInt(v.gallons)} gallons, measured covered with water at 102°F and normalized to a 37°F water–air gap.`,
      indoor
        ? `Indoors the gap stays at ${fmt(v.setpoint - v.indoorF, 0)}°F all year, so the cost is the same every month: ${fmtMoney(r.months[0].cost, { cents: true })}.`
        : `Outdoors it peaks in ${MONTH_NAME[r.worst.idx]} at ${fmtMoney(r.worst.cost, { cents: true })} and falls to ${fmtMoney(Math.min(...r.months.map((m) => m.cost)), { cents: true })} in the warmest month (U.S. population-weighted normals).`,
      `Turning the water down 2°F to ${fmt(v.setpoint - 2, 0)}°F saves about ${fmtMoney(r.costYear - cooler.costYear)} a year.`,
      `The ${otherKind === "inflatable" ? "inflatable" : "hard-shell"} limit for the same volume is ${fmtInt(otherW)} W — ${otherW > c.maxW ? "inflatable spas are allowed to lose more heat" : "hard-shell tubs are allowed slightly more at this small size"}.`,
      `Soaks with the cover off add more. Industry estimates for a full year of use run ${fmtInt(HOT_TUB_KWH_YEAR_RANGE[0])}–${fmtInt(HOT_TUB_KWH_YEAR_RANGE[1])} kWh; many tubs also test well under the legal cap, so enter your tub's listed standby watts for a closer figure.`,
    ],
    table: {
      caption: `The same tub in colder and warmer states, at each state's ${RATES.period} rate`,
      columns: ["State", "¢/kWh", "kWh a year", "Per year", "Coldest month"],
      rows: CLIMATE_STATES.map((code) => {
        const x = at(code);
        return [stateInfo(code).name, fmt(stateRate(code).ytdCents, 2), fmtInt(x.kwhYear), fmtMoney(x.costYear), fmtMoney(x.worst.cost, { cents: true })];
      }),
    },
    notes: [
      `${fmtInt(v.gallons)}^(2/3) = ${fmt(Math.pow(v.gallons, 2 / 3), 1)}; ${kind === "inflatable" ? `× 7 = ${fmtInt(c.maxW)} W` : `× 3.75 + 40 = ${fmtInt(c.maxW)} W`} at a 37°F gap. Heat loss through the cover and shell scales with the gap, so each month we multiply by (${fmt(v.setpoint, 0)}°F − ${indoor ? "room" : "average outdoor"} temperature) ÷ 37 and by the hours in the month.`,
      `Prices: EIA average residential rates for ${RATES.period}. Outdoor temperatures: NOAA Climate Prediction Center population-weighted normals.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const sizes = [250, 300, 350, 400, 450, 500];
  const us = stateInfo("US");
  const year = (g: number, kind: "standard" | "inflatable") =>
    computeHotTub({ standbyW: spaMaxStandbyW(g, kind), setpointF: SPA.testWaterF, location: "outdoor", indoorF: 68, info: us, cents: US });
  return (
    <>
      <h2>What it costs to keep a hot tub hot</h2>
      <p>
        Most of a hot tub&apos;s electricity goes into replacing heat that leaks through the cover and shell while it sits covered at temperature
        — its <strong>standby</strong> loss — plus the filtration cycles that run on their own. California&apos;s Title 20 appliance standard
        limits that standby power for every portable spa sold there, and manufacturers list each model&apos;s tested figure with the California
        Energy Commission. The limit for a hard-shell spa is <strong>3.75 × V^(2/3) + 40 watts</strong>, where V is the fill volume in gallons
        (inflatable spas: 7 × V^(2/3)). It&apos;s measured with the cover on and water at 102°F and normalized to a 37°F gap between water and air.
      </p>
      <p>
        <strong>Worked example — 400 gallons:</strong> 400^(2/3) = 54.3; × 3.75 + 40 = 244 W at a 37°F gap. Heat loss scales with the gap, so in a
        30°F month (a 72°F gap) the tub averages about 474 W — 353 kWh over 31 days. In a 75°F month it averages 178 W. Summed over a U.S.-average
        year that&apos;s {fmtInt(year(400, "standard").kwhYear)} kWh, about {fmtMoney(year(400, "standard").costYear)} at {fmtCents(US)}/kWh.
      </p>

      <h2>Yearly cost by size</h2>
      <table>
        <thead>
          <tr>
            <th>Fill volume</th>
            <th>Max standby (hard shell)</th>
            <th>Per year</th>
            <th>Per month</th>
            <th>Inflatable, per year</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((g) => (
            <tr key={g}>
              <td>
                <Link href={`/electricity/${SLUG}/${g}-gallon`}>{g} gal</Link>
              </td>
              <td>{fmtInt(spaMaxStandbyW(g, "standard"))} W</td>
              <td>{fmtMoney(year(g, "standard").costYear)}</td>
              <td>{fmtMoney(year(g, "standard").perMonth, { cents: true })}</td>
              <td>{fmtMoney(year(g, "inflatable").costYear)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        U.S.-average outdoor climate, water at 102°F, at the legal maximum standby power and the U.S. average price for {RATES.period}. A tub that
        tests below the cap costs proportionally less; enter its listed standby watts in the calculator.
      </p>

      <h2>Climate matters most</h2>
      <p>
        Because loss follows the temperature gap, the same tub costs far more in Minnesota than in Florida — and most of the year&apos;s bill
        lands in the three coldest months. The calculator uses each state&apos;s normal monthly temperatures, derived from NOAA&apos;s
        population-weighted degree days, and its EIA electricity price. An indoor or enclosed tub sees a small, steady gap all year.
      </p>

      <h2>How to run one for less</h2>
      <ul>
        <li>Keep the cover on, latched and dry. A waterlogged or sagging cover loses far more heat than the one the tub was tested with.</li>
        <li>Lower the setpoint when you won&apos;t use the tub for a few days; every degree narrows the gap.</li>
        <li>On a time-of-use plan, set filtration and heating cycles outside peak hours.</li>
        <li>Check the listing before you buy: two tubs of the same size can be rated very differently.</li>
      </ul>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>Using the heater&apos;s kW rating times 24 hours.</strong> The heater cycles; standby power is the honest average.
        </li>
        <li>
          <strong>Ignoring winter.</strong> A summer bill tells you little about January.
        </li>
        <li>
          <strong>Forgetting the soaks.</strong> Each session with the cover off, jets and blower running, adds heat-up time on top of standby.
        </li>
      </ul>
      <p>
        Setting up a pool too? See the <Link href="/electricity/pool-pump-cost-calculator">pool pump cost calculator</Link>. Pouring a pad first?
        The <Link href="/concrete/slab-calculator/10x10-6-inch">concrete for a 10×10 hot tub pad</Link> is worked out here.
      </p>
    </>
  );
}

export const hotTubCalculator: CalculatorEntry<HotTubValues> = {
  meta: {
    slug: SLUG,
    category: "electricity",
    name: "Hot Tub Cost Calculator",
    shortName: "Hot tubs",
    h1: "Hot Tub Electricity Cost Calculator",
    metaTitle: "Hot Tub Cost Calculator: Monthly Electric Cost by State",
    metaDescription: `A 400-gallon hot tub at California's standby limit costs about ${fmtMoney(BASE_RUN.perMonth)} a month at the U.S. average rate. By size, setpoint, climate and state.`,
    summary:
      "Estimate what a hot tub costs to keep hot each month and year from its fill volume, standby rating, water temperature and your state's climate and electricity price.",
    outputs: ["Monthly & yearly cost", "Month-by-month", "Setpoint savings", "By state climate"],
    faq: [
      { q: "How much does a hot tub add to my electric bill?", a: `A 400-gallon tub at California's standby limit uses about ${fmtInt(BASE_RUN.kwhYear)} kWh a year just staying hot in an average U.S. climate — about ${fmtMoney(BASE_RUN.perMonth)} a month at ${fmtCents(US)}/kWh. Soaks add more; industry estimates run 1,500–3,500 kWh a year in total.` },
      { q: "Does a hot tub cost more to run in winter?", a: `Yes — heat loss follows the gap between water and air. For the same 400-gallon tub, January costs about ${fmtMoney(BASE_RUN.months[0].cost)} and July about ${fmtMoney(BASE_RUN.months[6].cost)} at U.S.-average temperatures and prices.` },
      { q: "How much do I save by lowering the water temperature?", a: "Standby loss scales with the water–air gap, so dropping from 102°F to 100°F cuts it by 2 ÷ (the gap). In a 50°F month that's about 4%; in mild weather more." },
      { q: "What is a hot tub's standby power?", a: "The average power a covered spa uses to hold its water at temperature, including default filtration, measured under California's test at 102°F and normalized to a 37°F water–air gap. New spas sold in California list it." },
      { q: "Are inflatable hot tubs cheaper to run?", a: `Usually not. California allows inflatable spas 7 × V^(2/3) watts of standby versus 3.75 × V^(2/3) + 40 for hard-shell tubs — at 250 gallons that's ${fmtInt(spaMaxStandbyW(250, "inflatable"))} W against ${fmtInt(spaMaxStandbyW(250, "standard"))} W.` },
      { q: "How do I find my hot tub's real energy use?", a: "Look up its normalized standby power in the California Energy Commission appliance database or on its energy label, then enter it in the calculator. For a measured figure, read your electric meter before and after a few days with nothing else changing." },
    ],
    sources: [SOURCES.cecSpa, SOURCES.eiaMonthly, SOURCES.noaaDegreeDays, SOURCES.eiaTechNotes],
    related: ["electricity/pool-pump-cost-calculator", "concrete/slab-calculator", "electricity/electricity-rates-by-state", "electricity/electricity-cost-calculator"],
    updated: ELECTRICITY_CHECKED,
    keywords: ["hot tub cost", "hot tub electricity", "spa cost per month", "hot tub electric bill", "inflatable hot tub cost"],
  },
  Calculator: HotTubCalculator,
  Content,
  presets: HOT_TUB_PRESETS,
  presetAnswer,
};
