import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { acWatts, computeAc, fmtCents, stateInfo, windowSize } from "./compute";
import { AC_DEFAULTS, computeAcCalc, regionMinSeer2, type AcValues } from "./air-conditioner-model";
import AirConditionerCalculator from "./AirConditionerCalculator";
import { EER2_TYPICAL, ELECTRICITY_CHECKED, MINI_SPLIT, MONTH_NAME, RATES, ROOM_AC_HOURS_PER_YEAR, SEER2_REGION_MIN, SOURCES, US_CDD_NORMAL, WINDOW_AC } from "./data";
import { fitTitle, rateFacts, regionGroup, stateExtra, usYtdCents } from "./shared";
import { STATE_INFO } from "./state-data";

const SLUG = "air-conditioner-cost-calculator";
const US = usYtdCents();

/* ───────── programmatic presets: sizes (national) and every state ───────── */

type SizeSpec = { slug: string; label: string; h1: string; title: string; values: Partial<AcValues> };

const SIZE_SPECS: SizeSpec[] = [
  ...[5000, 8000, 12000, 18000].map((btu) => ({
    slug: `${btu}-btu-window`,
    label: `${fmtInt(btu)} BTU window unit`,
    h1: `How much does it cost to run a ${fmtInt(btu)} BTU window air conditioner?`,
    title: `${fmtInt(btu)} BTU Window AC`,
    values: { type: "window", btu, ceerMode: "es" },
  })),
  ...[2, 3, 4, 5].map((tons) => ({
    slug: `${tons}-ton-central`,
    label: `${tons}-ton central AC`,
    h1: `How much does it cost to run a ${tons}-ton central air conditioner?`,
    title: `${tons}-Ton Central AC`,
    values: { type: "central", tons, seer2: 14.3 },
  })),
  {
    slug: "12000-btu-mini-split",
    label: "12,000 BTU mini-split",
    h1: "How much does it cost to run a 12,000 BTU mini-split?",
    title: "12,000 BTU Mini-Split",
    values: { type: "minisplit", msBtu: 12000 },
  },
];

function sizePreset(s: SizeSpec): Preset<AcValues> {
  const values: AcValues = { ...AC_DEFAULTS, ...s.values };
  const { r } = computeAcCalc(values);
  return {
    slug: s.slug,
    values,
    group: "By size",
    label: s.label,
    h1: s.h1,
    metaTitle: fitTitle(`${s.title} Cost to Run: ${fmtMoneyPrecise(r.perHour)}/Hour (2026)`, `${s.title} Cost: ${fmtMoneyPrecise(r.perHour)} an Hour`),
    metaDescription: `A ${s.label} costs ${fmtMoneyPrecise(r.perHour)} an hour running and about ${fmtMoney(r.annualCost)} a year at the U.S. average ${fmtCents(US)}/kWh. Pick your state and efficiency.`,
  };
}

function statePreset(code: string): Preset<AcValues> {
  const info = stateInfo(code);
  const values: AcValues = { ...AC_DEFAULTS, state: code, type: "central", tons: 3, seer2: regionMinSeer2(code) };
  const { r, rate } = computeAcCalc(values);
  return {
    slug: info.slug,
    values,
    group: regionGroup(code),
    label: info.name,
    h1: `How much does it cost to run an air conditioner in ${info.name}?`,
    metaTitle: fitTitle(`Air Conditioner Cost in ${info.name}: ${fmtMoney(r.annualCost)} a Year`, `AC Cost in ${info.name}: ${fmtMoney(r.annualCost)} a Year`),
    metaDescription: `A 3-ton central AC in ${info.name} costs about ${fmtMoney(r.peak.cost)} in ${MONTH_NAME[r.peak.idx]} and ${fmtMoney(r.annualCost)} a year at ${fmtCents(rate.cents)}/kWh, from local cooling degree days.`,
  };
}

export const AC_PRESETS: Preset<AcValues>[] = [...SIZE_SPECS.map(sizePreset), ...STATE_INFO.map((s) => statePreset(s.code))];

function presetAnswer(v: AcValues): PresetAnswer {
  const c = computeAcCalc(v);
  const { r, info, rate } = c;

  if (info.code === "US") {
    const sizes =
      c.type === "window"
        ? WINDOW_AC.map((w) => ({ label: `${fmtInt(w.btu)} BTU`, btuh: w.btu, eff: w.esCeer, effLabel: `CEER ${w.esCeer}` }))
        : c.type === "minisplit"
          ? [9000, 12000, 18000, 24000].map((b) => ({ label: `${fmtInt(b)} BTU`, btuh: b, eff: MINI_SPLIT.seer2, effLabel: `SEER2 ${MINI_SPLIT.seer2}` }))
          : [1.5, 2, 2.5, 3, 3.5, 4, 5].map((t) => ({ label: `${fmt(t)} ton`, btuh: t * 12000, eff: v.seer2, effLabel: `SEER2 ${v.seer2}` }));
    return {
      headline: `A ${c.type === "central" ? `${fmt(v.tons)}-ton central air conditioner` : c.type === "window" ? `${fmtInt(v.btu)} BTU window AC` : `${fmtInt(v.msBtu)} BTU mini-split`} draws about ${fmt(r.watts / 1000, 2)} kW and costs ${fmtMoneyPrecise(r.perHour)} an hour running — about ${fmtMoney(r.annualCost)} over a ${fmtInt(r.annualHours)}-hour U.S.-average cooling year at ${fmtCents(rate.cents)}/kWh.`,
      bullets: [
        `Power = capacity ÷ efficiency: ${fmtInt(c.capacity)} BTU/h ÷ ${c.type === "window" ? "CEER" : "SEER2"} ${fmt(c.efficiency, 2)} = ${fmtInt(r.watts)} W.`,
        `DOE rates room air conditioners on ${ROOM_AC_HOURS_PER_YEAR} full-load hours a year; spread by U.S. cooling degree days that peaks in ${MONTH_NAME[r.peak.idx]} at about ${fmt(r.peak.hoursPerDay, 1)} hours a day — ${fmtMoney(r.peak.cost, { cents: true })} that month.`,
        c.type === "central"
          ? `On a 95°F afternoon a typical system (EER2 ${EER2_TYPICAL}) draws more: about ${fmt((v.tons * 12000) / EER2_TYPICAL / 1000, 1)} kW, or ${fmtMoneyPrecise(((v.tons * 12000) / EER2_TYPICAL / 1000) * (rate.cents / 100))} an hour.`
          : c.type === "window"
            ? `Window units made since May 26, 2026 must meet CEER ${WINDOW_AC.find((w) => w.btu === v.btu)?.minCeer ?? 16}, so a new unit of this size draws at most ${fmtInt(acWatts(v.btu, WINDOW_AC.find((w) => w.btu === v.btu)?.minCeer ?? 16))} W.`
            : `Inverter mini-splits run at part speed most of the time, which is why their seasonal rating is so much higher than their full-speed EER2 (${MINI_SPLIT.eer2}).`,
        `In a hot state the same unit runs far more: Texas has ${fmt(cddRatio("TX"), 1)}× the U.S. cooling degree days, Florida ${fmt(cddRatio("FL"), 1)}×. Pick your state in the calculator.`,
      ],
      table: {
        caption: `Every size at ${fmtCents(rate.cents)}/kWh and ${fmtInt(r.annualHours)} full-load hours a year`,
        columns: ["Size", "Efficiency", "Watts", "Per hour", "Per year"],
        rows: sizes.map((s) => {
          const w = acWatts(s.btuh, s.eff);
          return [s.label, s.effLabel, fmtInt(w), fmtMoneyPrecise((w / 1000) * (rate.cents / 100)), fmtMoney((w / 1000) * r.annualHours * (rate.cents / 100))];
        }),
      },
      notes: [
        `${fmtInt(c.capacity)} BTU/h ÷ ${fmt(c.efficiency, 2)} = ${fmtInt(r.watts)} W = ${fmt(r.watts / 1000, 3)} kW. × ${fmtCents(rate.cents)} = ${fmtMoneyPrecise(r.perHour)} per running hour. × ${fmtInt(r.annualHours)} hours = ${fmtMoney(r.annualCost)} a year.`,
        `Prices are EIA's U.S. average residential price for ${RATES.period}. Efficiency figures are ENERGY STAR certified averages (window units) or the federal minimum shown.`,
      ],
    };
  }

  const f = rateFacts(info.code);
  const cdd = info.cdd.reduce((s, x) => s + x, 0);
  const minSeer = SEER2_REGION_MIN[info.seer2];
  const window8k = computeAc({ btuh: 8000, efficiency: windowSize(8000).esCeer, qty: 1, usage: "climate", hoursPerDay: 0, daysPerYear: 0, info, cents: rate.cents });
  const es17 = computeAc({ btuh: c.capacity, efficiency: 17, qty: 1, usage: "climate", hoursPerDay: 0, daysPerYear: 0, info, cents: rate.cents });
  const coolMonths = r.months.map((m, i) => ({ m, i })).filter((x) => x.m.hours >= 1);
  return {
    headline: `A 3-ton central air conditioner in ${info.name} costs about ${fmtMoney(r.peak.cost, { cents: true })} in ${MONTH_NAME[r.peak.idx]} and ${fmtMoney(r.annualCost)} a year at ${fmtCents(rate.cents)}/kWh; an 8,000 BTU window unit about ${fmtMoney(window8k.peak.cost, { cents: true })} in ${MONTH_NAME[window8k.peak.idx]}.`,
    bullets: [
      `${info.name} pays ${f.sentence}.`,
      `${info.name} averages ${fmtInt(cdd)} cooling degree days a year against ${fmtInt(US_CDD_NORMAL)} nationally (NOAA), so we estimate ${fmtInt(r.annualHours)} full-load cooling hours — ${fmt(r.peak.hoursPerDay, 1)} a day in ${MONTH_NAME[r.peak.idx]}.`,
      `A new 3-ton split system sold for ${info.name} must reach at least SEER2 ${minSeer} (DOE ${info.seer2 === "north" ? "northern" : info.seer2} region); it draws about ${fmt(r.watts / 1000, 2)} kW on average and ${fmtMoneyPrecise(r.perHour)} an hour.`,
      `Moving up to the ENERGY STAR average of about SEER2 17 would cut the yearly bill to ${fmtMoney(es17.annualCost)} — ${fmtMoney(r.annualCost - es17.annualCost)} a year less.`,
      `The average ${info.name} home used ${fmtInt(info.kwh)} kWh a month in 2025; this system adds ${fmtInt(r.months[r.peak.idx].kwh)} kWh in ${MONTH_NAME[r.peak.idx]}.`,
    ],
    table: {
      caption: `Estimated monthly cooling cost in ${info.name}`,
      columns: ["Month", "Full-load hours", "3-ton central", "8,000 BTU window"],
      rows: coolMonths.map(({ m, i }) => [MONTH_NAME[i], fmt(m.hours, 0), fmtMoney(m.cost, { cents: true }), fmtMoney(window8k.months[i].cost, { cents: true })]),
    },
    notes: [
      `DOE's room-AC test assumes ${ROOM_AC_HOURS_PER_YEAR} full-load hours a year for a typical U.S. home. We scale it by ${info.name}'s population-weighted cooling degree days (${fmtInt(cdd)} ÷ ${fmtInt(US_CDD_NORMAL)}) and spread it over the months the same way: ${fmtInt(r.annualHours)} hours a year. Your thermostat setting and insulation move this a lot — switch the calculator to your own hours if you know them.`,
      `3 tons = 36,000 BTU/h ÷ SEER2 ${minSeer} = ${fmtInt(r.watts)} W. × ${fmtInt(r.annualHours)} h = ${fmtInt(r.annualKwh)} kWh × ${fmtCents(rate.cents)} = ${fmtMoney(r.annualCost)}.`,
    ],
  };
}

function cddRatio(code: string): number {
  return stateInfo(code).cdd.reduce((s, x) => s + x, 0) / US_CDD_NORMAL;
}

/* ───────── long-form guide ───────── */

function Content() {
  const hours = ROOM_AC_HOURS_PER_YEAR;
  const d = US / 100;
  return (
    <>
      <h2>How to work out what an air conditioner costs</h2>
      <p>
        Every efficiency rating on an air conditioner is BTUs of cooling per watt-hour of electricity, so the running power is simply{" "}
        <strong>capacity ÷ efficiency</strong>. Window units use CEER, central systems SEER2 (seasonal average) and EER2 (a 95°F afternoon).
        Multiply the watts by the hours the compressor actually runs and by your price per kWh.
      </p>
      <p>
        <strong>Worked example — a 3-ton central AC at SEER2 14.3:</strong> 3 tons is 36,000 BTU/h. 36,000 ÷ 14.3 = 2,517 W, or 2.52 kW. At the
        U.S. average of {fmtCents(US)}/kWh that&apos;s {fmtMoneyPrecise(2.517 * d)} for every hour it runs. Over DOE&apos;s {hours}-hour cooling
        year: {fmtInt(2.517 * hours)} kWh, about {fmtMoney(2.517 * hours * d)}.
      </p>

      <h2>Window AC wattage and cost by size</h2>
      <table>
        <thead>
          <tr>
            <th>Size</th>
            <th>ENERGY STAR avg CEER</th>
            <th>Watts</th>
            <th>Per hour</th>
            <th>Per {hours} h year</th>
          </tr>
        </thead>
        <tbody>
          {WINDOW_AC.map((w) => {
            const watts = acWatts(w.btu, w.esCeer);
            return (
              <tr key={w.btu}>
                <td>
                  {[5000, 8000, 12000, 18000].includes(w.btu) ? <Link href={`/electricity/${SLUG}/${w.btu}-btu-window`}>{fmtInt(w.btu)} BTU</Link> : `${fmtInt(w.btu)} BTU`}
                </td>
                <td>{w.esCeer}</td>
                <td>{fmtInt(watts)}</td>
                <td>{fmtMoneyPrecise((watts / 1000) * d)}</td>
                <td>{fmtMoney((watts / 1000) * hours * d)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        Averages are from ENERGY STAR&apos;s certified window units. A federal standard for units made from May 26, 2026 raises the minimum to CEER
        16.0 for 8,000–19,900 BTU — higher than today&apos;s ENERGY STAR average at those sizes, which still includes older models.
      </p>

      <h2>Central air by tonnage</h2>
      <table>
        <thead>
          <tr>
            <th>Size</th>
            <th>SEER2 13.4</th>
            <th>SEER2 14.3</th>
            <th>SEER2 17</th>
          </tr>
        </thead>
        <tbody>
          {[2, 3, 4, 5].map((t) => (
            <tr key={t}>
              <td>
                <Link href={`/electricity/${SLUG}/${t}-ton-central`}>{t} ton</Link>
              </td>
              {[13.4, 14.3, 17].map((s) => (
                <td key={s}>{fmtMoney(((t * 12000) / s / 1000) * hours * d)} / yr</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Yearly cost over {hours} full-load hours at {fmtCents(US)}/kWh. New split systems must reach SEER2 13.4 in the North and 14.3 in the
        Southeast and Southwest (13.8 for systems of 45,000 BTU/h and up there). ENERGY STAR&apos;s certified 3-ton systems average SEER2 17.06.
      </p>

      <h2>How many hours will it run where you live?</h2>
      <p>
        Run time is the biggest unknown. The calculator starts from DOE&apos;s {hours} full-load hours a year — the basis of every room-AC energy
        label — and scales it by your state&apos;s cooling degree days from NOAA. Florida has {fmt(cddRatio("FL"), 1)} times the U.S. average,
        Texas {fmt(cddRatio("TX"), 1)}, Arizona {fmt(cddRatio("AZ"), 1)}, while Washington has {fmt(cddRatio("WA"), 2)}. The result is spread over
        the months in proportion to each month&apos;s degree days, so you can see what July costs as well as the year. If you know your own
        habits, switch to custom hours: count the hours the compressor runs, not the hours the system is set to &quot;cool.&quot;
      </p>

      <h2>Ways to cut the cooling bill</h2>
      <ul>
        <li>Raise the setpoint and use ceiling fans; an ENERGY STAR fan averages 35 W on high, about 1/70 of a 3-ton system.</li>
        <li>Change filters on schedule and keep the outdoor coil clear so the system delivers its rated efficiency.</li>
        <li>Shade sun-facing windows in the afternoon, when the cooling load and many time-of-use peak prices both land.</li>
        <li>When replacing, compare the yearly cost at SEER2 14.3 and 17+ for your state — the difference repeats every summer.</li>
        <li>For one or two rooms, a correctly sized window unit or mini-split costs far less than cooling the whole house.</li>
      </ul>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>Using EER2 for the whole season.</strong> EER2 is measured at 95°F. Over a season the average draw is closer to capacity ÷ SEER2.
        </li>
        <li>
          <strong>Counting hours the system is &quot;on.&quot;</strong> A thermostat cycles the compressor; only running hours cost money.
        </li>
        <li>
          <strong>Old SEER ratings.</strong> Minimums like &quot;13 SEER&quot; or &quot;14 SEER&quot; predate the 2023 SEER2 test; use SEER2 numbers with SEER2 minimums.
        </li>
      </ul>
      <p>
        Also see the <Link href="/electricity/dehumidifier-cost-calculator">dehumidifier cost calculator</Link> for damp summers, your state&apos;s{" "}
        <Link href="/electricity/electricity-rates-by-state">electricity rate</Link>, and the <Link href="/solar">solar calculators</Link> if a big
        cooling bill has you thinking about panels.
      </p>
    </>
  );
}

export const airConditionerCalculator: CalculatorEntry<AcValues> = {
  meta: {
    slug: SLUG,
    category: "electricity",
    name: "Air Conditioner Cost Calculator",
    shortName: "Air conditioning",
    h1: "Air Conditioner Cost Calculator",
    metaTitle: "AC Cost Calculator: Window, Central & Mini-Split (2026)",
    metaDescription: `A 3-ton central AC at SEER2 14.3 costs ${fmtMoneyPrecise((36000 / 14.3 / 1000) * (US / 100))} an hour at the U.S. average ${fmtCents(US)}/kWh. Monthly cost from your state's climate and rate.`,
    summary:
      "Pick window, central or mini-split, size and efficiency rating, and see the cost per hour, in your hottest month and for the whole cooling season — with run hours estimated from your state's cooling degree days.",
    outputs: ["Cost per hour", "Monthly cost by climate", "Season total", "SEER2 upgrade savings"],
    faq: [
      { q: "How much does it cost to run central air per hour?", a: `A 3-ton system at SEER2 14.3 averages about 2.5 kW, or ${fmtMoneyPrecise((36000 / 14.3 / 1000) * (US / 100))} an hour at the U.S. average of ${fmtCents(US)}/kWh. On a 95°F afternoon a typical unit (EER2 ${EER2_TYPICAL}) draws about 3.1 kW — ${fmtMoneyPrecise((36000 / EER2_TYPICAL / 1000) * (US / 100))} an hour.` },
      { q: "How much does a window air conditioner cost to run per month?", a: `An 8,000 BTU ENERGY STAR window unit draws about 525 W. Eight hours a day for 30 days is 128 kWh — ${fmtMoney(0.525 * 8 * 30.42 * (US / 100), { cents: true })} at the U.S. average price.` },
      { q: "How many watts does a window AC use?", a: "Divide BTU by CEER. ENERGY STAR averages: 5,000 BTU ≈ 355 W, 8,000 BTU ≈ 525 W, 12,000 BTU ≈ 789 W, 18,000 BTU ≈ 1,182 W and 24,000 BTU ≈ 1,798 W." },
      { q: "What SEER2 rating is required for a new central AC?", a: "Split systems must meet SEER2 13.4 in northern states and 14.3 in the Southeast and Southwest (13.8 for 45,000 BTU/h and larger there), under 10 CFR 430.32. ENERGY STAR requires at least 15.2." },
      { q: "How much does a higher SEER2 save?", a: `For a 3-ton system over DOE's 750-hour year, going from SEER2 14.3 to 17 saves about ${fmtMoney((36000 / 14.3 - 36000 / 17) / 1000 * 750 * (US / 100))} a year at the U.S. average price — more in hot states with longer seasons.` },
      { q: "How many hours a year does an air conditioner run?", a: `DOE's room-AC label assumes 750 full-load hours. Scaled by cooling degree days, that becomes roughly ${fmtInt(750 * cddRatio("FL"))} hours in Florida and ${fmtInt(750 * cddRatio("TX"))} in Texas, but only about ${fmtInt(750 * cddRatio("WA"))} in Washington.` },
    ],
    sources: [SOURCES.eiaMonthly, SOURCES.esRoomAc, SOURCES.esHeatPumps, SOURCES.ecfr, SOURCES.noaaDegreeDays, SOURCES.eia861m, SOURCES.eiaTechNotes],
    related: ["electricity/dehumidifier-cost-calculator", "electricity/electricity-rates-by-state", "electricity/space-heater-cost-calculator", "solar/solar-panel-calculator", "walls/blown-in-insulation-calculator", "electricity/btu-calculator"],
    updated: ELECTRICITY_CHECKED,
    keywords: ["air conditioner cost", "ac cost per hour", "window ac cost", "central air cost", "seer2", "cost to run ac", "mini split cost"],
    featured: true,
  },
  Calculator: AirConditionerCalculator,
  Content,
  presets: AC_PRESETS,
  presetAnswer,
  PresetExtra: stateExtra(SLUG),
};
