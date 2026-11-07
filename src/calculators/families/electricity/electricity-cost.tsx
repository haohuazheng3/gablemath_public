import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { centsFor, fmtCents, ratesRanked, stateInfo } from "./compute";
import { COST_DEFAULTS, computeCostCalc, valuesForAppliance, type CostValues } from "./cost-model";
import { ELECTRICITY_CHECKED, LABEL_CENTS, RATES, SOURCES, appliance } from "./data";
import ElectricityCostCalculator from "./ElectricityCostCalculator";
import { usYtdCents } from "./shared";

const SLUG = "electricity-cost-calculator";
const US = usYtdCents();

/* ───────── programmatic presets: popular appliances and round wattages ───────── */

const APPLIANCE_PRESETS: { id: string; title: string; slug: string; h1: string; group: string }[] = [
  { id: "tv-55", title: "55-Inch TV", slug: "55-inch-tv", h1: "How much does it cost to run a 55-inch TV?", group: "TVs & electronics" },
  { id: "tv-65", title: "65-Inch TV", slug: "65-inch-tv", h1: "How much does it cost to run a 65-inch TV?", group: "TVs & electronics" },
  { id: "tv-75", title: "75-Inch TV", slug: "75-inch-tv", h1: "How much does it cost to run a 75-inch TV?", group: "TVs & electronics" },
  { id: "gaming-pc", title: "Gaming PC", slug: "gaming-pc", h1: "How much does it cost to run a gaming PC?", group: "TVs & electronics" },
  { id: "ps5", title: "PS5", slug: "ps5", h1: "How much does it cost to run a PS5?", group: "TVs & electronics" },
  { id: "router", title: "Wi-Fi Router", slug: "wifi-router", h1: "How much does it cost to run a Wi-Fi router 24/7?", group: "TVs & electronics" },
  { id: "crypto-miner", title: "Bitcoin Miner", slug: "bitcoin-miner", h1: "How much does it cost to run a bitcoin miner?", group: "TVs & electronics" },
  { id: "water-heater", title: "Electric Water Heater", slug: "electric-water-heater", h1: "How much does an electric water heater cost to run?", group: "Around the house" },
  { id: "water-heater-hp", title: "Heat Pump Water Heater", slug: "heat-pump-water-heater", h1: "How much does a heat pump water heater cost to run?", group: "Around the house" },
  { id: "ceiling-fan", title: "Ceiling Fan", slug: "ceiling-fan", h1: "How much does it cost to run a ceiling fan?", group: "Around the house" },
  { id: "electric-blanket", title: "Electric Blanket", slug: "electric-blanket", h1: "How much does it cost to run an electric blanket?", group: "Around the house" },
  { id: "led-bulb", title: "LED Light Bulb", slug: "led-light-bulb", h1: "How much does it cost to run an LED light bulb?", group: "Around the house" },
  { id: "electric-oven", title: "Electric Oven", slug: "electric-oven", h1: "How much does it cost to run an electric oven?", group: "Kitchen" },
  { id: "microwave", title: "Microwave", slug: "microwave", h1: "How much does it cost to run a microwave?", group: "Kitchen" },
  { id: "dishwasher", title: "Dishwasher", slug: "dishwasher", h1: "How much does it cost to run a dishwasher?", group: "Kitchen" },
  { id: "sauna", title: "Sauna", slug: "sauna", h1: "How much does it cost to run a sauna?", group: "Around the house" },
];

const WATTS = [100, 500, 1000, 2000, 5000];

function appliancePreset(p: (typeof APPLIANCE_PRESETS)[number]): Preset<CostValues> {
  const a = appliance(p.id)!;
  const values: CostValues = { ...COST_DEFAULTS, ...valuesForAppliance(a) };
  const c = computeCostCalc(values);
  return {
    slug: p.slug,
    values,
    group: p.group,
    label: a.name,
    h1: p.h1,
    metaTitle: `${p.title} Cost to Run: ${fmtMoney(c.cost.perMonth, { cents: true })} a Month (2026)`,
    metaDescription: `${p.title}: about ${fmt(c.cost.kwhMonth, 1)} kWh a month, ${fmtMoney(c.cost.perMonth, { cents: true })} at the U.S. average ${fmtCents(US)}/kWh. Cost per hour, day and year in your state.`,
  };
}

function wattPreset(w: number): Preset<CostValues> {
  const values: CostValues = { ...COST_DEFAULTS, watts: w, hours: 1 };
  const perHour = (w / 1000) * (US / 100);
  return {
    slug: `${w}-watts`,
    values,
    group: "By wattage",
    label: `${fmtInt(w)} watts for an hour`,
    h1: `How much does it cost to run ${fmtInt(w)} watts for an hour?`,
    metaTitle: `Cost of ${fmtInt(w)} Watts per Hour: ${fmtMoneyPrecise(perHour)} (2026)`,
    metaDescription: `${fmtInt(w)} W for one hour is ${fmt(w / 1000, 1)} kWh — ${fmtMoneyPrecise(perHour)} at the U.S. average ${fmtCents(US)}/kWh. Per day, month and year, and in every state.`,
  };
}

export const COST_PRESETS: Preset<CostValues>[] = [...APPLIANCE_PRESETS.map(appliancePreset), ...WATTS.map(wattPreset)];

function presetAnswer(v: CostValues): PresetAnswer {
  const c = computeCostCalc(v);
  const a = c.appliance;
  const ranked = ratesRanked("ytd");
  const hi = ranked[0];
  const lo = ranked[ranked.length - 1];
  const at = (cents: number) => computeCostCalc({ ...v, rateMode: "custom", cents }).cost;
  const home = stateInfo("US");

  if (!a) {
    const kw = c.watts / 1000;
    return {
      headline: `Running ${fmtInt(c.watts)} watts for one hour uses ${fmt(kw, 2)} kWh and costs ${fmtMoneyPrecise(c.cost.perHour)} at the U.S. average of ${fmtCents(US)}/kWh.`,
      bullets: [
        `Watts ÷ 1,000 × hours = kWh: ${fmtInt(c.watts)} ÷ 1,000 × 1 h = ${fmt(kw, 2)} kWh. Multiply by your price per kWh for the cost.`,
        `Left on 24 hours a day it would use ${fmt(kw * 24, 1)} kWh a day — ${fmtMoney(kw * 24 * (US / 100), { cents: true })} a day, ${fmtMoney(kw * 24 * 30.42 * (US / 100))} a month.`,
        `The same hour costs ${fmtMoneyPrecise(at(centsFor(lo, "ytd")).perHour)} in ${lo.state} (${fmtCents(lo.ytdCents)}) and ${fmtMoneyPrecise(at(centsFor(hi, "ytd")).perHour)} in ${hi.state} (${fmtCents(hi.ytdCents)}).`,
        c.watts >= 1500
          ? `${fmtInt(c.watts)} W is ${fmt(c.watts / 120, 1)} A at 120 V — ${c.watts > 1800 ? "more than a standard 15 A outlet can supply, so loads this big are 240 V appliances" : "close to the limit of a standard 15 A outlet"}.`
          : `An hour a day for a month (30.4 days) adds ${fmt(kw * 30.42, 1)} kWh to your bill — ${fmtMoney(kw * 30.42 * (US / 100), { cents: true })}.`,
      ],
      table: {
        caption: `${fmtInt(c.watts)} watts by hours of use, at ${fmtCents(US)}/kWh`,
        columns: ["Hours a day", "kWh a day", "Per day", "Per month", "Per year"],
        rows: [1, 4, 8, 12, 24].map((h) => {
          const kwh = kw * h;
          const d = US / 100;
          return [`${h} h`, fmt(kwh, 2), fmtMoneyPrecise(kwh * d), fmtMoney(kwh * 30.42 * d, { cents: true }), fmtMoney(kwh * 365 * d)];
        }),
      },
      notes: [
        `kWh is what you pay for: power (kW) times hours. ${fmtInt(c.watts)} W is ${fmt(kw, 2)} kW, so every hour at full power is ${fmt(kw, 2)} kWh. The U.S. average residential price for ${RATES.period} is ${fmtCents(US)} per kWh (EIA), which already spreads delivery and fixed charges over every kWh.`,
        "Appliances with a thermostat or compressor only draw full power part of the time; use the duty-cycle field in the calculator for those.",
      ],
    };
  }

  const usage = c.annual
    ? `${fmtInt(a.kwhYear ?? 0)} kWh a year (rated)`
    : `${fmt(a.watts ?? 0, 1)} W for ${fmt(a.hours)} hour${a.hours === 1 ? "" : "s"} a day${a.duty < 100 ? ` at ${a.duty}% duty` : ""}`;
  return {
    headline: `${a.name} costs about ${fmtMoney(c.cost.perMonth, { cents: true })} a month (${fmtMoney(c.cost.perYear)} a year) at the U.S. average of ${fmtCents(US)}/kWh, using ${usage}.`,
    bullets: [
      `Where the number comes from: ${a.basis}.${a.estimate ? " This is a typical figure — check your own label." : ""}`,
      c.annual
        ? `${fmtInt(c.cost.kwhYear)} kWh a year is ${fmt(c.cost.kwhDay, 2)} kWh a day — ${fmtMoneyPrecise(c.cost.perDay)} a day around the clock.`
        : `Per hour of use: ${fmt(c.cost.kwhHour, 3)} kWh, ${fmtMoneyPrecise(c.cost.perHour)}. Per day: ${fmtMoneyPrecise(c.cost.perDay)}.`,
      `That is ${fmt((c.cost.kwhMonth / home.kwh) * 100, 1)}% of the ${fmtInt(home.kwh)} kWh an average U.S. home used each month in 2025.`,
      `In ${lo.state} (${fmtCents(lo.ytdCents)}) it costs ${fmtMoney(at(lo.ytdCents).perMonth, { cents: true })} a month; in ${hi.state} (${fmtCents(hi.ytdCents)}) ${fmtMoney(at(hi.ytdCents).perMonth, { cents: true })}.`,
      a.tip,
    ],
    table: {
      caption: `${a.name}: monthly and yearly cost in the cheapest and priciest states`,
      columns: ["State", "¢/kWh", "Per month", "Per year"],
      rows: [...ranked.slice(0, 4), RATES.us, ...ranked.slice(-4)].map((s) => {
        const x = at(s.ytdCents);
        return [s.code === "US" ? "U.S. average" : s.state, fmt(s.ytdCents, 2), fmtMoney(x.perMonth, { cents: true }), fmtMoney(x.perYear)];
      }),
    },
    notes: [
      c.annual
        ? `Rated appliances list annual energy (kWh/yr) measured on a federal test. Yearly cost = ${fmtInt(c.cost.kwhYear)} kWh × ${fmtCents(US)} = ${fmtMoney(c.cost.perYear)}. The EnergyGuide label's own dollar figure assumes ${LABEL_CENTS}¢/kWh, so it reads ${fmtMoney((c.cost.kwhYear * LABEL_CENTS) / 100)} — below today's average price.`
        : `${fmt(a.watts ?? 0, 1)} W ÷ 1,000 = ${fmt((a.watts ?? 0) / 1000, 4)} kW. × ${fmt(a.hours)} h${a.duty < 100 ? ` × ${a.duty}%` : ""} = ${fmt(c.cost.kwhDay, 3)} kWh a day; × 30.42 days = ${fmt(c.cost.kwhMonth, 2)} kWh a month; × ${fmtCents(US)} = ${fmtMoney(c.cost.perMonth, { cents: true })}.`,
      `Prices are EIA's average residential price for ${RATES.period}. Pick your state in the calculator for your local figure.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

const TABLE_IDS = ["fridge-french-door", "water-heater", "dryer-electric", "space-heater", "window-ac-8000", "dehumidifier", "tv-55", "gaming-pc", "ps5", "router", "ceiling-fan", "led-bulb", "ev-level-2"];

function Content() {
  const rows = TABLE_IDS.map((id) => appliance(id)!).map((a) => ({ a, c: computeCostCalc({ ...COST_DEFAULTS, ...valuesForAppliance(a) }) }));
  const ranked = ratesRanked("ytd");
  return (
    <>
      <h2>How to calculate what an appliance costs to run</h2>
      <p>
        Your utility bills you for energy in kilowatt-hours (kWh). An appliance&apos;s cost is just three numbers multiplied together:
        <strong> kilowatts × hours × price per kWh</strong>. Watts on a label divide by 1,000 to give kilowatts.
      </p>
      <p>
        <strong>Worked example — a 1,500 W space heater for 8 hours:</strong> 1,500 ÷ 1,000 = 1.5 kW. 1.5 kW × 8 h = 12 kWh a day. At the U.S.
        average of {fmtCents(US)} per kWh ({RATES.period}, EIA) that is {fmtMoney(12 * (US / 100), { cents: true })} a day, or{" "}
        {fmtMoney(12 * 30.42 * (US / 100))} over a 30-day month.
      </p>

      <h2>Finding the watts</h2>
      <ul>
        <li>
          <strong>Watts on the label</strong> — usually on a plate near the cord or on the back. That is the maximum the appliance draws.
        </li>
        <li>
          <strong>Only amps and volts?</strong> Multiply them: a 12.5 A heater on 120 V is 1,500 W. Nameplate amps are a ceiling, so the result
          is an upper bound.
        </li>
        <li>
          <strong>A yellow EnergyGuide label</strong> gives energy use in kWh per year from a federal test. Use that number directly — it already
          accounts for cycling. Ignore the label&apos;s dollar figure: it assumes {LABEL_CENTS}¢ per kWh, and older labels assumed even less.
        </li>
        <li>
          <strong>Measure it.</strong> A plug-in meter (the Kill A Watt type handles up to 15 A) records real kWh over a few days. It&apos;s the only
          reliable answer for an old fridge, a dehumidifier or a PC.
        </li>
      </ul>

      <h2>Why the real cost is often lower than watts × hours</h2>
      <p>
        Anything with a thermostat or compressor switches itself on and off. A refrigerator&apos;s compressor, a space heater with a thermostat
        and an air conditioner all spend part of each hour idle. The calculator&apos;s <em>time at full power</em> field handles that: 100% for a
        kettle, hair dryer or EV charger, much less for cycling appliances. When you have a rated kWh-per-year figure, use it instead.
      </p>

      <h2>What common appliances cost a month</h2>
      <p>At the U.S. average price of {fmtCents(US)}/kWh, using the typical hours shown:</p>
      <table>
        <thead>
          <tr>
            <th>Appliance</th>
            <th>Assumed use</th>
            <th>kWh / month</th>
            <th>Cost / month</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ a, c }) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.kwhYear != null ? `${fmtInt(a.kwhYear)} kWh/yr rated` : `${fmt(a.watts ?? 0, 1)} W × ${fmt(a.hours)} h/day`}</td>
              <td>{fmt(c.cost.kwhMonth, 1)}</td>
              <td>{fmtMoney(c.cost.perMonth, { cents: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Refrigerator, water heater, dryer and TV figures are ENERGY STAR certified averages; older or larger models can use considerably more.
        Heating and cooling dominate most bills: EIA&apos;s household survey attributes 19% of home electricity to air conditioning, 12% to space
        heating and 12% to water heating.
      </p>

      <h2>Which price per kWh to use</h2>
      <p>
        The calculator defaults to EIA&apos;s average residential price for your state — total residential revenue divided by kWh sold. Because
        it spreads delivery and fixed customer charges over every kWh, it is close to your <em>all-in</em> rate (total bill ÷ kWh used). Prices
        range from {fmtCents(ranked[ranked.length - 1].ytdCents)} in {ranked[ranked.length - 1].state} to {fmtCents(ranked[0].ytdCents)} in{" "}
        {ranked[0].state} so far in 2026. For the cost of <em>adding</em> one appliance, the more precise number is your marginal rate: add up
        only the per-kWh lines on your bill, since the fixed monthly charge doesn&apos;t change. See every state on the{" "}
        <Link href="/electricity/electricity-rates-by-state">electricity rates by state</Link> page.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>Mixing up kW and kWh.</strong> kW is how fast power is drawn; kWh is the amount used. A 1 kW heater running 3 hours uses 3 kWh.
        </li>
        <li>
          <strong>Using the power-supply rating.</strong> A 1,000 W PC power supply or a console&apos;s brick rating is a ceiling. Sony&apos;s own
          figures put a PS5 at roughly 200–220 W while gaming.
        </li>
        <li>
          <strong>Forgetting always-on loads.</strong> A device left on 24/7 runs 8,760 hours a year; 10 W of standby is 88 kWh.
        </li>
        <li>
          <strong>Trusting old wattage tables.</strong> Lists that put a fridge at 725 W or a ceiling fan at 65–175 W come from decades-old
          tables. Today&apos;s ENERGY STAR ceiling fans average 35 W on high.
        </li>
      </ul>
      <p>
        For the biggest loads, use the dedicated calculators: <Link href="/electricity/space-heater-cost-calculator">space heater</Link>,{" "}
        <Link href="/electricity/air-conditioner-cost-calculator">air conditioner</Link>, <Link href="/electricity/ev-charging-cost-calculator">EV charging</Link>,{" "}
        <Link href="/electricity/refrigerator-cost-calculator">refrigerator</Link>, <Link href="/electricity/clothes-dryer-cost-calculator">clothes dryer</Link>,{" "}
        <Link href="/electricity/dehumidifier-cost-calculator">dehumidifier</Link>, <Link href="/electricity/pool-pump-cost-calculator">pool pump</Link> and{" "}
        <Link href="/electricity/hot-tub-cost-calculator">hot tub</Link>. Thinking about solar? Start with the <Link href="/solar">solar calculators</Link>.
      </p>
    </>
  );
}

export const electricityCostCalculator: CalculatorEntry<CostValues> = {
  meta: {
    slug: SLUG,
    category: "electricity",
    name: "Electricity Cost Calculator",
    shortName: "Any appliance",
    h1: "Electricity Cost Calculator",
    metaTitle: "Electricity Cost Calculator: Any Appliance, by State (2026)",
    metaDescription: `What any appliance costs per hour, day, month and year at your state's 2026 rate (U.S. average ${fmtCents(US)}/kWh). 60+ appliances with ENERGY STAR data.`,
    summary:
      "Pick an appliance or enter its watts, amps or yearly kWh, choose your state, and see the cost per hour, day, month and year — with typical figures for 60+ appliances and the latest EIA price for every state.",
    outputs: ["Cost per hour to year", "kWh used", "Your state vs U.S.", "60+ appliances"],
    faq: [
      { q: "How do I calculate the cost to run an appliance?", a: `Multiply kilowatts by hours by your price per kWh. Watts ÷ 1,000 = kW. A 1,500 W heater for 8 hours uses 12 kWh; at the U.S. average of ${fmtCents(US)}/kWh that is ${fmtMoney(12 * (US / 100), { cents: true })} a day.` },
      { q: "How much does 1 kWh of electricity cost?", a: `The U.S. average residential price for ${RATES.period} is ${fmtCents(US)} per kWh (EIA). States range from ${fmtCents(ratesRanked("ytd").slice(-1)[0].ytdCents)} in ${ratesRanked("ytd").slice(-1)[0].state} to ${fmtCents(ratesRanked("ytd")[0].ytdCents)} in ${ratesRanked("ytd")[0].state}.` },
      { q: "How much does it cost to run 1,000 watts for an hour?", a: `1,000 W for one hour is 1 kWh, so it costs your price per kWh — ${fmtCents(US)} at the U.S. average, or ${fmtMoney(24 * (US / 100), { cents: true })} if left on for a full day.` },
      { q: "How do I convert amps to watts?", a: "Multiply amps by volts: 12.5 A × 120 V = 1,500 W, and 30 A × 240 V = 7,200 W. Nameplate amps are a maximum, so this gives an upper bound on power." },
      { q: "Why is my appliance's real cost lower than watts × hours?", a: "Appliances with thermostats or compressors — fridges, heaters, air conditioners, dehumidifiers — cycle on and off, so they draw full power only part of the time. Use the label's kWh per year or measure with a plug-in meter for those." },
      { q: "What uses the most electricity in a home?", a: "Heating and cooling. In EIA's household energy survey, air conditioning accounts for 19% of residential electricity, space heating 12% and water heating 12%. An electric tank water heater alone uses about 3,530 kWh a year on the federal test." },
      { q: "Is the dollar figure on the EnergyGuide label accurate?", a: `It assumes a national ${LABEL_CENTS}¢/kWh (and older labels less), well below the ${fmtCents(US)} average in 2026. Multiply the label's kWh per year by your own rate instead.` },
    ],
    sources: [SOURCES.eiaMonthly, SOURCES.eiaTechNotes, SOURCES.eia861m, SOURCES.esOther, SOURCES.esFridges, SOURCES.esRoomAc, SOURCES.esDryers, SOURCES.lasko, SOURCES.sony, SOURCES.doeTable, SOURCES.ftcLabel, SOURCES.killAWatt],
    related: ["electricity/electricity-rates-by-state", "electricity/space-heater-cost-calculator", "electricity/air-conditioner-cost-calculator", "solar/solar-panel-calculator", "walls/blown-in-insulation-calculator", "electricity/kwh-calculator", "electricity/watts-to-amps-calculator", "electricity/electric-bill-calculator"],
    updated: ELECTRICITY_CHECKED,
    keywords: ["electricity cost", "cost to run", "kwh calculator", "watts to cost", "appliance energy", "electric bill", "energy cost calculator"],
    featured: true,
  },
  Calculator: ElectricityCostCalculator,
  Content,
  presets: COST_PRESETS,
  presetAnswer,
};

