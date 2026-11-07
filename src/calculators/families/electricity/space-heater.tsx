import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { fmtCents, heatSources, heatingMonthIdx, monthlyMeanTempF, ratesRanked, stateInfo } from "./compute";
import { ELECTRICITY_CHECKED, HEATING_MONTH_BELOW_F, MONTH_NAME, RATES, SOURCES } from "./data";
import { fitTitle, listMonths, rateFacts, regionGroup, stateExtra, usYtdCents } from "./shared";
import SpaceHeaterCalculator from "./SpaceHeaterCalculator";
import { HEATER_DEFAULTS, computeHeaterCalc, type HeaterValues } from "./space-heater-model";
import { STATE_INFO } from "./state-data";

const SLUG = "space-heater-cost-calculator";
const US = usYtdCents();
const perHour = (watts: number, cents: number) => (watts / 1000) * (cents / 100);
const RANKED = ratesRanked("ytd");
const HI = RANKED[0];
const LO = RANKED[RANKED.length - 1];
const US_HEAT = (() => {
  const src = heatSources(stateInfo("US"), US);
  return { resistance: src.find((s) => s.id === "resistance")!.perMMBtu, gas: src.find((s) => s.id === "gas-95")!.perMMBtu };
})();

/* ───────── programmatic presets: wattage settings (national) and every state ───────── */

const WATTAGE_SPECS = [
  { slug: "1500-watt", watts: 1500, hours: 8, label: "1,500 W, 8 hours a day", h1: "How much does it cost to run a 1,500-watt space heater?" },
  { slug: "1500-watt-24-hours", watts: 1500, hours: 24, label: "1,500 W around the clock", h1: "How much does it cost to run a space heater 24 hours a day?" },
  { slug: "900-watt", watts: 900, hours: 8, label: "900 W low setting", h1: "How much does a space heater on low (900 W) cost to run?" },
  { slug: "750-watt", watts: 750, hours: 8, label: "750 W heater", h1: "How much does it cost to run a 750-watt space heater?" },
];

function wattagePreset(s: (typeof WATTAGE_SPECS)[number]): Preset<HeaterValues> {
  const values: HeaterValues = { ...HEATER_DEFAULTS, watts: s.watts, hours: s.hours };
  const { r } = computeHeaterCalc(values);
  return {
    slug: s.slug,
    values,
    group: "By wattage",
    label: s.label,
    h1: s.h1,
    metaTitle: fitTitle(`${fmtInt(s.watts)}W Space Heater Cost: ${fmtMoneyPrecise(r.fullHour)}/Hour, ${fmtMoney(r.cost.perMonth)}/Month`, `${fmtInt(s.watts)}W Space Heater Cost: ${fmtMoney(r.cost.perMonth)}/Month`),
    metaDescription: `A ${fmtInt(s.watts)} W space heater costs ${fmtMoneyPrecise(r.fullHour)} an hour at the U.S. average ${fmtCents(US)}/kWh — ${fmtMoney(r.cost.perMonth, { cents: true })} a month at ${s.hours} h a day. See your state.`,
  };
}

function statePreset(code: string): Preset<HeaterValues> {
  const info = stateInfo(code);
  const values: HeaterValues = { ...HEATER_DEFAULTS, state: code };
  const { r, rate, months } = computeHeaterCalc(values);
  return {
    slug: info.slug,
    values,
    group: regionGroup(code),
    label: info.name,
    h1: `How much does it cost to run a space heater in ${info.name}?`,
    metaTitle: fitTitle(`Space Heater Cost in ${info.name}: ${fmtMoney(r.cost.perMonth)} a Month (2026)`, `Space Heater Cost in ${info.name}: ${fmtMoney(r.cost.perMonth)}/Month`),
    metaDescription: `A 1,500 W heater 8 h a day costs ${fmtMoney(r.cost.perMonth, { cents: true })} a month in ${info.name} at ${fmtCents(rate.cents)}/kWh — ${fmtMoney(r.cost.perYear)} over a ${months}-month season.`,
  };
}

export const HEATER_PRESETS: Preset<HeaterValues>[] = [...WATTAGE_SPECS.map(wattagePreset), ...STATE_INFO.map((s) => statePreset(s.code))];

function presetAnswer(v: HeaterValues): PresetAnswer {
  const { r, rate, months, info } = computeHeaterCalc(v);
  const watts = `${fmtInt(v.watts)}-watt`;
  const band = `${fmtMoney(r.bandMonth[0], { cents: true })}–${fmtMoney(r.bandMonth[1], { cents: true })}`;
  const tableRows = [750, 900, 1500].map((w) => {
    const x = computeHeaterCalc({ ...v, watts: w }).r;
    const full24 = computeHeaterCalc({ ...v, watts: w, hours: 24 }).r;
    return [`${fmtInt(w)} W`, fmtMoneyPrecise(perHour(w, rate.cents)), fmtMoney(x.cost.perMonth, { cents: true }), fmtMoney(full24.cost.perMonth, { cents: true }), fmtMoney(x.cost.perYear)];
  });
  const table = {
    caption: `Space heater cost ${info.code === "US" ? "at the U.S. average price" : `in ${info.name}`} (${fmtCents(rate.cents)}/kWh)`,
    columns: ["Heater", "Per hour", "8 h/day, month", "24 h/day, month", `Season (${months} mo, 8 h)`],
    rows: tableRows,
  };

  if (info.code === "US") {
    return {
      headline: `A ${watts} space heater costs ${fmtMoneyPrecise(r.fullHour)} an hour on full power and about ${fmtMoney(r.cost.perMonth, { cents: true })} a month at ${fmt(v.hours)} hours a day, at the U.S. average of ${fmtCents(rate.cents)}/kWh.`,
      bullets: [
        `${fmtInt(v.watts)} W = ${fmt(v.watts / 1000, 2)} kW, so each hour at full power uses ${fmt(v.watts / 1000, 2)} kWh.`,
        `${fmt(v.hours)} hours a day for a 30-day month is ${fmt(r.cost.kwhMonth, 0)} kWh — ${fmt((r.cost.kwhMonth / info.kwh) * 100, 0)}% of the ${fmtInt(info.kwh)} kWh an average U.S. home uses in a month.`,
        `With a thermostat that cycles the element 40–70% of the time, expect ${band} a month instead.`,
        `It puts out ${fmtInt(r.btuPerHour)} Btu per hour and draws ${fmt(r.amps, 1)} A at 120 V${v.watts >= 1500 ? " — keep it on its own wall outlet, never an extension cord" : ""}.`,
        `Prices run from ${fmtCents(LO.ytdCents)} to ${fmtCents(HI.ytdCents)} per kWh across the states, so the same heater costs ${fmt(HI.ytdCents / LO.ytdCents, 1)} times as much in ${HI.state} as in ${LO.state}.`,
      ],
      table,
      notes: [
        `${fmt(v.watts / 1000, 2)} kW × ${fmt(v.hours)} h = ${fmt(r.cost.kwhDay, 1)} kWh a day; × 30.42 days = ${fmt(r.cost.kwhMonth, 0)} kWh; × ${fmtCents(rate.cents)} (U.S. average, ${RATES.period}, EIA) = ${fmtMoney(r.cost.perMonth, { cents: true })}.`,
        "Full power is the most a heater can cost. A thermostat model in a reasonably insulated room switches off part of every hour — that is the only thing that lowers its draw. The low setting uses less power per hour but also makes less heat.",
      ],
    };
  }

  const f = rateFacts(info.code);
  const idx = heatingMonthIdx(info);
  const temps = monthlyMeanTempF(info);
  const coldest = temps.indexOf(Math.min(...temps));
  const src = heatSources(info, rate.cents);
  const res = src.find((s) => s.id === "resistance")!;
  const gas = src.find((s) => s.id === "gas-95")!;
  const hp = src.find((s) => s.id === "heat-pump")!;
  return {
    headline: `Running a 1,500-watt space heater 8 hours a day in ${info.name} costs about ${fmtMoney(r.cost.perMonth, { cents: true })} a month — ${fmtMoneyPrecise(r.fullHour)} an hour on full power at ${info.name}'s average ${fmtCents(rate.cents)}/kWh.`,
    bullets: [
      `${info.name} pays ${f.sentence}.`,
      idx.length
        ? `${idx.length} month${idx.length === 1 ? "" : "s"} average below ${HEATING_MONTH_BELOW_F}°F there (${listMonths(idx, MONTH_NAME, 6)}), so a full season of this use costs about ${fmtMoney(r.cost.perYear)}.`
        : `No month averages below ${HEATING_MONTH_BELOW_F}°F (the coldest, ${MONTH_NAME[coldest]}, averages ${fmt(temps[coldest], 0)}°F), so we budget one month of cold snaps: ${fmtMoney(r.cost.perYear)}.`,
      `With a thermostat cycling 40–70% of the time it's closer to ${band} a month.`,
      `Heat from resistance costs ${fmtMoney(res.perMMBtu)} per million Btu in ${info.name}, versus ${fmtMoney(gas.perMMBtu)} from a 95% gas furnace at $${info.gas.toFixed(2)}/therm and ${fmtMoney(hp.perMMBtu)} from an average ENERGY STAR heat pump.`,
      `${MONTH_NAME[coldest]} is the coldest month, averaging ${fmt(temps[coldest], 0)}°F (NOAA normals).`,
    ],
    table,
    notes: [
      `1.5 kW × 8 h = 12 kWh a day; × 30.42 days = ${fmt(r.cost.kwhMonth, 0)} kWh a month; × ${fmtCents(rate.cents)} (${info.name} average, ${RATES.period}, EIA) = ${fmtMoney(r.cost.perMonth, { cents: true })}.`,
      res.perMMBtu > gas.perMMBtu
        ? `Because resistance heat costs ${fmt(res.perMMBtu / gas.perMMBtu, 1)}× as much as gas heat in ${info.name}, a space heater saves money only if it lets you turn the whole-house thermostat down and heat just the room you're in. If your home heats with electric baseboards or furnace strips, a space heater costs the same per Btu — the saving comes only from heating fewer rooms.`
        : `In ${info.name} resistance heat costs about the same as or less than gas heat from a 95% furnace, so heating a single occupied room with a space heater is usually cheaper than heating the whole house.`,
      `The average ${info.name} home used ${fmtInt(info.kwh)} kWh a month in 2025 (EIA); this heater adds ${fmt((r.cost.kwhMonth / info.kwh) * 100, 0)}% to that while it runs.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const us = stateInfo("US");
  const src = heatSources(us, US);
  const res = src.find((s) => s.id === "resistance")!;
  const gas = src.find((s) => s.id === "gas-95")!;
  const hp = src.find((s) => s.id === "heat-pump")!;
  const pick = [...RANKED.slice(0, 3), ...RANKED.slice(-3)];
  return (
    <>
      <h2>How much a space heater costs to run</h2>
      <p>
        Nearly every plug-in space heater — ceramic, oil-filled radiator or infrared — turns electricity into heat at the same rate:{" "}
        <strong>1 watt makes 3.412 Btu per hour</strong>, regardless of style. So the cost comes down to the wattage setting, the hours it runs,
        how much of each hour the thermostat keeps the element on, and your price per kWh.
      </p>
      <p>
        <strong>Worked example:</strong> a 1,500 W heater on high is 1.5 kW. Running 8 hours uses 12 kWh. At the U.S. average residential price of{" "}
        {fmtCents(US)}/kWh ({RATES.period}, EIA) that&apos;s {fmtMoney(12 * (US / 100), { cents: true })} a day and{" "}
        {fmtMoney(12 * 30.42 * (US / 100))} over a 30-day month.
      </p>
      <table>
        <thead>
          <tr>
            <th>Setting</th>
            <th>Per hour</th>
            <th>8 h a day, per month</th>
            <th>24 h a day, per month</th>
          </tr>
        </thead>
        <tbody>
          {[1500, 900, 750].map((w) => (
            <tr key={w}>
              <td>{fmtInt(w)} W</td>
              <td>{fmtMoneyPrecise(perHour(w, US))}</td>
              <td>{fmtMoney(perHour(w, US) * 8 * 30.42, { cents: true })}</td>
              <td>{fmtMoney(perHour(w, US) * 24 * 30.42, { cents: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Those are full-power figures at the U.S. average price. Where you live changes them a lot:</p>
      <table>
        <thead>
          <tr>
            <th>State</th>
            <th>¢/kWh ({RATES.period})</th>
            <th>1,500 W, per hour</th>
            <th>8 h a day, per month</th>
          </tr>
        </thead>
        <tbody>
          {pick.map((s) => {
            const info = stateInfo(s.code);
            return (
              <tr key={s.code}>
                <td>
                  <Link href={`/electricity/${SLUG}/${info.slug}`}>{s.state}</Link>
                </td>
                <td>{fmt(s.ytdCents, 2)}</td>
                <td>{fmtMoneyPrecise(perHour(1500, s.ytdCents))}</td>
                <td>{fmtMoney(perHour(1500, s.ytdCents) * 8 * 30.42, { cents: true })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Thermostats: why real bills are lower than the maximum</h2>
      <p>
        A heater with a thermostat switches its element off once the room reaches the set temperature and back on as it cools. In a closed,
        reasonably insulated room it may run only 40–70% of each hour; in a drafty room on a cold night it can run nonstop. The calculator shows
        the full-power figure and the thermostat range side by side. The low setting (often 900 or 750 W) uses less per hour but also delivers
        less heat, so it only saves money if the room still stays warm enough.
      </p>

      <h2>Space heater or central heat?</h2>
      <p>
        Compare the cost of the heat itself. At U.S. average prices, resistance heat costs {fmtMoney(res.perMMBtu)} per million Btu, against{" "}
        {fmtMoney(gas.perMMBtu)} from a 95%-efficient gas furnace at ${us.gas.toFixed(2)}/therm and about {fmtMoney(hp.perMMBtu)} from an
        average ENERGY STAR heat pump (HSPF2 8.44). Per unit of heat, a space heater is the most expensive way to warm a house that has gas or a
        heat pump. It wins only when it lets you turn the whole-house thermostat down several degrees while you heat the one room you&apos;re
        using. In a home with electric baseboards or furnace heat strips, a space heater costs the same per Btu — the saving comes from heating
        fewer rooms, not from the heater.
      </p>
      <p>
        Each state page above works out that comparison with local electricity, natural gas, propane and heating-oil prices, and counts how many
        months average below {HEATING_MONTH_BELOW_F}°F there using NOAA climate normals.
      </p>

      <h2>Safety rules that also save money</h2>
      <ul>
        <li>A 1,500 W heater draws 12.5 A at 120 V. Plug it straight into a wall outlet — never an extension cord or power strip.</li>
        <li>Two 1,500 W heaters on one 15 A household circuit will trip the breaker or overheat the wiring.</li>
        <li>Keep 3 feet of clearance and choose a model with tip-over and overheat shut-off.</li>
        <li>Don&apos;t shut the central heat off completely in freezing weather: pipes in outside walls can freeze.</li>
        <li>Never heat a room with a gas oven or range.</li>
      </ul>

      <h2>Common mistakes when estimating</h2>
      <ul>
        <li>
          <strong>Assuming the low setting is &quot;efficient.&quot;</strong> Every resistance heater is 100% efficient; low just makes less heat.
        </li>
        <li>
          <strong>Using an old national rate.</strong> Many articles still use the 16–17¢/kWh averages of 2024–2025; the U.S. average for {RATES.period} is {fmtCents(US)}.
        </li>
        <li>
          <strong>Ignoring the season.</strong> A month of nightly use in a cold state is the norm; in Florida a heater may run only on a handful of
          cold nights.
        </li>
      </ul>
      <p>
        Comparing whole-house options? See what the electricity for <Link href="/electricity/air-conditioner-cost-calculator">heat pump cooling</Link>{" "}
        costs, check your state&apos;s <Link href="/electricity/electricity-rates-by-state">electricity rate</Link>, or price any other appliance with
        the <Link href="/electricity/electricity-cost-calculator">electricity cost calculator</Link>.
      </p>
    </>
  );
}

export const spaceHeaterCalculator: CalculatorEntry<HeaterValues> = {
  meta: {
    slug: SLUG,
    category: "electricity",
    name: "Space Heater Cost Calculator",
    shortName: "Space heaters",
    h1: "Space Heater Cost Calculator",
    metaTitle: "Space Heater Cost Calculator: Per Hour, Month & State",
    metaDescription: `A 1,500 W space heater costs ${fmtMoneyPrecise(perHour(1500, US))} an hour at the U.S. average ${fmtCents(US)}/kWh. Your state's rate, thermostat cycling, season and gas comparison.`,
    summary:
      "See what a space heater costs per hour, day, month and heating season at your state's electricity rate — with thermostat cycling, local heating-season length and how it compares with gas, propane or a heat pump.",
    outputs: ["Cost per hour & month", "Heating season cost", "vs gas & heat pump", "Circuit check"],
    faq: [
      { q: "How much does it cost to run a 1,500-watt space heater per hour?", a: `It uses 1.5 kWh an hour on high, so it costs ${fmtMoneyPrecise(perHour(1500, US))} an hour at the U.S. average of ${fmtCents(US)}/kWh. In ${LO.state} and ${HI.state}, the cheapest and priciest states, the same hour is ${fmtMoneyPrecise(perHour(1500, LO.ytdCents))} and ${fmtMoneyPrecise(perHour(1500, HI.ytdCents))}.` },
      { q: "How much does a space heater add to my electric bill each month?", a: `Eight hours a day on full power is about ${fmtInt(1.5 * 8 * 30.42)} kWh a month — ${fmtMoney(1.5 * 8 * 30.42 * (US / 100))} at the U.S. average price and ${fmt(((1.5 * 8 * 30.42) / stateInfo("US").kwh) * 100, 0)}% of an average home's ${fmtInt(stateInfo("US").kwh)} kWh. A thermostat that cycles 40–70% of the time cuts that proportionally.` },
      { q: "Is it cheaper to use a space heater or central heat?", a: `Per unit of heat, no: at U.S. average prices resistance heat costs about ${fmtMoney(US_HEAT.resistance)} per million Btu versus ${fmtMoney(US_HEAT.gas)} from a 95% gas furnace. A space heater saves money only if it lets you turn the whole-house thermostat down while you heat one room.` },
      { q: "Does the low setting save money?", a: "Low (often 900 or 750 W) uses 40–50% less electricity per hour, but it also makes proportionally less heat. All resistance heaters are 100% efficient, so you only save if the room stays comfortable on low." },
      { q: "Can I run two space heaters on the same circuit?", a: "Not two 1,500 W heaters on a standard 15 A circuit: together they draw 25 A at 120 V and will trip the breaker or overheat the wiring. Put each on its own circuit and plug directly into wall outlets." },
      { q: "How many BTUs does a 1,500-watt space heater put out?", a: "5,118 Btu per hour (1,500 × 3.412). Every electric resistance heater converts power to heat at that same rate, whatever its style." },
      { q: "Do oil-filled or infrared heaters cost less to run?", a: "Not per hour at the same wattage — a 1,500 W radiator and a 1,500 W ceramic heater use the same 1.5 kWh an hour. Oil-filled models hold heat and may cycle more evenly; infrared models warm people in their line of sight. Watts and run time set the cost." },
    ],
    sources: [SOURCES.eiaMonthly, SOURCES.lasko, SOURCES.eiaBtu, SOURCES.eiaGas, SOURCES.eiaHeatingFuels, SOURCES.esHeatPumps, SOURCES.noaaDegreeDays, SOURCES.eia861m, SOURCES.eiaTechNotes],
    related: ["electricity/electricity-rates-by-state", "electricity/air-conditioner-cost-calculator", "electricity/electricity-cost-calculator", "electricity/hot-tub-cost-calculator", "walls/insulation-calculator", "electricity/heating-btu-calculator", "electricity/watts-to-amps-calculator"],
    updated: ELECTRICITY_CHECKED,
    keywords: ["space heater cost", "1500 watt heater", "cost to run a space heater", "electric heater cost", "heater per hour", "space heater vs central heat"],
    featured: true,
  },
  Calculator: SpaceHeaterCalculator,
  Content,
  presets: HEATER_PRESETS,
  presetAnswer,
  PresetExtra: stateExtra(SLUG),
};
