import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { computeLaundry, dryerKwhPerLoad, fmtCents, ratesRanked, washerKwhPerLoad } from "./compute";
import ClothesDryerCalculator from "./ClothesDryerCalculator";
import { DRYER_DEFAULTS, computeDryerCalc, type DryerValues } from "./clothes-dryer-model";
import { DRYER_CYCLES_PER_YEAR, DRYER_KWH_YEAR, ELECTRICITY_CHECKED, RATES, SOURCES, WASHER_CYCLES_PER_YEAR, WASHER_KWH_YEAR } from "./data";
import { fitTitle, usYtdCents } from "./shared";

const SLUG = "clothes-dryer-cost-calculator";
const US = usYtdCents();
const VENTED = dryerKwhPerLoad("vented", 0);
const HEAT_PUMP = dryerKwhPerLoad("heatpump", 0);

/* ───────── programmatic presets: dryer type, household size, washer ───────── */

const SPECS: { slug: string; label: string; h1: string; group: string; values: Partial<DryerValues> }[] = [
  { slug: "electric-dryer-per-load", label: "Electric dryer, per load", h1: "How much does it cost to run an electric dryer per load?", group: "Dryer type", values: {} },
  { slug: "heat-pump-dryer", label: "Heat pump dryer", h1: "How much does a heat pump dryer cost to run?", group: "Dryer type", values: { dryer: "heatpump" } },
  { slug: "washer-and-dryer", label: "Washer + dryer, per load", h1: "How much does it cost to wash and dry a load of laundry?", group: "Dryer type", values: { washer: "front" } },
  { slug: "top-load-washer-and-dryer", label: "Top-load washer + dryer", h1: "How much does a top-load washer and electric dryer cost per load?", group: "Dryer type", values: { washer: "top" } },
  ...[3, 7, 10, 14].map((n) => ({ slug: `${n}-loads-a-week`, label: `${n} loads a week`, h1: `How much does it cost to dry ${n} loads of laundry a week?`, group: "Loads per week", values: { loads: n } })),
];

export const DRYER_PRESETS: Preset<DryerValues>[] = SPECS.map((s) => {
  const values: DryerValues = { ...DRYER_DEFAULTS, ...s.values };
  const { r } = computeDryerCalc(values);
  return {
    slug: s.slug,
    values,
    group: s.group,
    label: s.label,
    h1: s.h1,
    metaTitle: fitTitle(`${s.label}: ${fmtMoneyPrecise(r.perLoad)} a Load, ${fmtMoney(r.perYear)} a Year`, `${s.label}: ${fmtMoneyPrecise(r.perLoad)} a Load`),
    metaDescription: `${s.label}: ${fmtMoneyPrecise(r.perLoad)} a load and ${fmtMoney(r.perMonth, { cents: true })} a month at the U.S. average ${fmtCents(US)}/kWh, from ENERGY STAR data. Heat pump savings by state.`,
  };
});

function presetAnswer(v: DryerValues): PresetAnswer {
  const { r, rate, kwhLoad } = computeDryerCalc(v);
  const ranked = ratesRanked("ytd");
  const hp = v.dryer === "heatpump";
  const vented = computeLaundry({ dryerKwhLoad: VENTED, washer: v.washer, loadsPerWeek: v.loads, cents: rate.cents });
  const heatPump = computeLaundry({ dryerKwhLoad: HEAT_PUMP, washer: v.washer, loadsPerWeek: v.loads, cents: rate.cents });
  const name = hp ? "a heat pump dryer" : "an electric dryer";
  return {
    headline: `${v.washer !== "none" ? `Washing and drying a load with ${name}` : `Drying a load in ${name}`} costs about ${fmtMoneyPrecise(r.perLoad)} at the U.S. average of ${fmtCents(rate.cents)}/kWh — ${fmtMoney(r.perMonth, { cents: true })} a month at ${fmt(v.loads, 1)} loads a week.`,
    bullets: [
      `${hp ? `ENERGY STAR ventless (heat pump) dryers average ${DRYER_KWH_YEAR.heatpump}` : `ENERGY STAR vented electric dryers average ${DRYER_KWH_YEAR.vented}`} kWh a year over DOE's ${DRYER_CYCLES_PER_YEAR}-load test year: ${fmt(kwhLoad, 2)} kWh a load.`,
      v.washer !== "none"
        ? `The ${v.washer === "front" ? "front-load" : "top-load"} washer adds ${fmt(washerKwhPerLoad(v.washer), 2)} kWh a load (${fmtMoneyPrecise(r.washerPerLoad)}), mostly for hot water from an electric water heater (ENERGY STAR ${WASHER_KWH_YEAR[v.washer === "front" ? "front" : "top"]} kWh over ${WASHER_CYCLES_PER_YEAR} loads).`
        : `${fmtInt(r.loadsPerYear)} loads a year use ${fmtInt(r.kwhYear)} kWh — ${fmtMoney(r.perYear)}.`,
      hp
        ? `A vented electric dryer would cost ${fmtMoney(vented.perYear)} a year for the same laundry; the heat pump saves ${fmtMoney(vented.perYear - heatPump.perYear)}.`
        : `A heat pump dryer would cut that to ${fmtMoney(heatPump.perYear)} a year — ${fmtMoney(vented.perYear - heatPump.perYear)} less, ${fmtMoney((vented.perYear - heatPump.perYear) * 10)} over ten years.`,
      `By state, the same load costs ${fmtMoneyPrecise(kwhLoad * (ranked[ranked.length - 1].ytdCents / 100))} in ${ranked[ranked.length - 1].state} and ${fmtMoneyPrecise(kwhLoad * (ranked[0].ytdCents / 100))} in ${ranked[0].state}.`,
      "Auto-dry (moisture sensing) cycles stop when clothes are dry; timed cycles keep heating until the clock runs out.",
    ],
    table: {
      caption: `Yearly drying cost by loads a week, at ${fmtCents(rate.cents)}/kWh`,
      columns: ["Loads a week", "Vented electric", "Heat pump", "Saving"],
      rows: [3, 5, 7, 10, 14].map((n) => {
        const a = computeLaundry({ dryerKwhLoad: VENTED, washer: "none", loadsPerWeek: n, cents: rate.cents });
        const b = computeLaundry({ dryerKwhLoad: HEAT_PUMP, washer: "none", loadsPerWeek: n, cents: rate.cents });
        return [`${n}`, fmtMoney(a.perYear), fmtMoney(b.perYear), fmtMoney(a.perYear - b.perYear)];
      }),
    },
    notes: [
      `${fmt(kwhLoad, 2)} kWh × ${fmtCents(rate.cents)} = ${fmtMoneyPrecise(r.dryerPerLoad)} a load to dry. × ${fmt(v.loads, 1)} loads × 52.1 weeks = ${fmtMoney(r.perYear - r.washerPerLoad * r.loadsPerYear)} a year.`,
      `Prices are EIA's U.S. average for ${RATES.period}; set your state in the calculator.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const d = US / 100;
  return (
    <>
      <h2>What a load of drying costs</h2>
      <p>
        Dryer energy is measured per load. ENERGY STAR&apos;s certified vented electric dryers average {DRYER_KWH_YEAR.vented} kWh a year over the
        DOE test year of {DRYER_CYCLES_PER_YEAR} loads — <strong>{fmt(VENTED, 2)} kWh a load</strong>. Heat pump (ventless) dryers average{" "}
        {DRYER_KWH_YEAR.heatpump} kWh, or {fmt(HEAT_PUMP, 2)} kWh a load.
      </p>
      <p>
        <strong>Worked example:</strong> {fmt(VENTED, 2)} kWh × {fmtCents(US)} (U.S. average, {RATES.period}) = {fmtMoneyPrecise(VENTED * d)} a load. At
        the DOE&apos;s 5.4 loads a week that&apos;s {fmtMoney(VENTED * 283 * d)} a year; a heat pump dryer does the same laundry for{" "}
        {fmtMoney(HEAT_PUMP * 283 * d)}.
      </p>

      <h2>Cost per load and per year</h2>
      <table>
        <thead>
          <tr>
            <th>Machine</th>
            <th>kWh / load</th>
            <th>Per load</th>
            <th>283 loads / year</th>
          </tr>
        </thead>
        <tbody>
          {[
            { label: "Vented electric dryer", kwh: VENTED, href: "electric-dryer-per-load" },
            { label: "Heat pump dryer", kwh: HEAT_PUMP, href: "heat-pump-dryer" },
            { label: "Front-load washer (incl. hot water)", kwh: washerKwhPerLoad("front"), href: "washer-and-dryer" },
            { label: "Top-load washer (incl. hot water)", kwh: washerKwhPerLoad("top"), href: "top-load-washer-and-dryer" },
          ].map((m) => (
            <tr key={m.label}>
              <td>
                <Link href={`/electricity/${SLUG}/${m.href}`}>{m.label}</Link>
              </td>
              <td>{fmt(m.kwh, 2)}</td>
              <td>{fmtMoneyPrecise(m.kwh * d)}</td>
              <td>{fmtMoney(m.kwh * 283 * d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Washer figures include the electricity to heat the water with an electric water heater, on DOE&apos;s {WASHER_CYCLES_PER_YEAR}-load year.
        Washing in cold water cuts most of that.
      </p>

      <h2>Watts or kWh per load?</h2>
      <p>
        Electric dryer heating elements are rated anywhere from 1,800 to 5,000 W, and most full-size 240 V dryers sit near the top of that range.
        But the element cycles on and off with the thermostat and moisture sensor, so watts × minutes overstates real use. If you know your
        dryer&apos;s kWh per load — from a whole-home energy monitor or the manufacturer — enter it as your own figure.
      </p>

      <h2>Cutting the cost</h2>
      <ul>
        <li>Use the auto-dry (moisture-sensing) setting instead of a timed cycle.</li>
        <li>Spin faster in the washer so there&apos;s less water to drive off.</li>
        <li>Clean the lint screen every load and the duct once a year — a restricted vent lengthens every cycle and is a fire risk.</li>
        <li>Dry full loads back to back while the drum is still warm.</li>
        <li>When replacing, compare the yearly saving of a heat pump dryer against its extra price; it also needs no outside vent.</li>
      </ul>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>Multiplying 5,000 W by the full cycle time.</strong> The element doesn&apos;t run nonstop; use kWh per load.
        </li>
        <li>
          <strong>Forgetting the washer&apos;s hot water.</strong> With an electric water heater, a hot wash adds real cost per load.
        </li>
        <li>
          <strong>Using an old national rate.</strong> At {fmtCents(US)}/kWh in 2026, each kWh costs more than articles from a few years ago assume.
        </li>
      </ul>
      <p>
        Check your water heater and other appliances with the <Link href="/electricity/electricity-cost-calculator">electricity cost calculator</Link>,
        or see your <Link href="/electricity/electricity-rates-by-state">state&apos;s price per kWh</Link>.
      </p>
    </>
  );
}

export const clothesDryerCalculator: CalculatorEntry<DryerValues> = {
  meta: {
    slug: SLUG,
    category: "electricity",
    name: "Clothes Dryer Cost Calculator",
    shortName: "Clothes dryers",
    h1: "Clothes Dryer Cost Calculator",
    metaTitle: "Dryer Cost Calculator: Cost per Load, Electric vs Heat Pump",
    metaDescription: `An electric dryer uses about ${fmt(VENTED, 2)} kWh a load — ${fmtMoneyPrecise(VENTED * (US / 100))} at the U.S. average ${fmtCents(US)}/kWh. Heat pump dryers use ${fmt(HEAT_PUMP, 2)}. Per load, month, year.`,
    summary:
      "Work out what each load of laundry costs to dry — and wash — at your state's electricity rate, how much a heat pump dryer would save, and what a year of laundry adds to your bill.",
    outputs: ["Cost per load", "Monthly & yearly", "Heat pump savings", "Washer included"],
    faq: [
      { q: "How much does it cost to run a dryer per load?", a: `About ${fmtMoneyPrecise(VENTED * (US / 100))} for an average ENERGY STAR electric dryer (${fmt(VENTED, 2)} kWh) at the U.S. average of ${fmtCents(US)}/kWh, and ${fmtMoneyPrecise(HEAT_PUMP * (US / 100))} for a heat pump dryer.` },
      { q: "How many kWh does a clothes dryer use per load?", a: `ENERGY STAR certified vented electric dryers average ${fmt(VENTED, 2)} kWh a load (${DRYER_KWH_YEAR.vented} kWh over DOE's ${DRYER_CYCLES_PER_YEAR}-load year); heat pump models ${fmt(HEAT_PUMP, 2)} kWh. Older dryers without moisture sensors use more.` },
      { q: "How much does a heat pump dryer save?", a: `About ${DRYER_KWH_YEAR.vented - DRYER_KWH_YEAR.heatpump} kWh a year at 283 loads — ${fmtMoney((DRYER_KWH_YEAR.vented - DRYER_KWH_YEAR.heatpump) * (US / 100))} a year at the U.S. average price, roughly 38% of the drying bill.` },
      { q: "How many watts does an electric dryer use?", a: "Heating elements are rated 1,800–5,000 W, with most 240 V full-size dryers near 5,000 W, but the element cycles. Energy per load (about 2.1 kWh on average) is the better figure for cost." },
      { q: "How much does the washer add?", a: `With an electric water heater, an ENERGY STAR front-loader adds about ${fmt(washerKwhPerLoad("front"), 2)} kWh a load and a top-loader ${fmt(washerKwhPerLoad("top"), 2)} kWh — ${fmtMoneyPrecise(washerKwhPerLoad("front") * (US / 100))} and ${fmtMoneyPrecise(washerKwhPerLoad("top") * (US / 100))} at the U.S. average price.` },
      { q: "How many loads of laundry does a typical household do?", a: "DOE's test procedure assumes 283 dryer loads a year, about 5.4 a week. Count a typical week of your own and enter it in the calculator." },
    ],
    sources: [SOURCES.esDryers, SOURCES.esWashers, SOURCES.eiaMonthly, SOURCES.doeTable, SOURCES.eiaTechNotes],
    related: ["electricity/electricity-cost-calculator", "electricity/refrigerator-cost-calculator", "electricity/electricity-rates-by-state"],
    updated: ELECTRICITY_CHECKED,
    keywords: ["dryer cost per load", "clothes dryer electricity", "heat pump dryer", "dryer kwh", "laundry cost"],
  },
  Calculator: ClothesDryerCalculator,
  Content,
  presets: DRYER_PRESETS,
  presetAnswer,
};
