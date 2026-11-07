import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { billFor, fmtCents, pctChange, rateRank, ratesRanked, stateInfo, stateRate } from "./compute";
import { ELECTRICITY_CHECKED, RATES, SOURCES } from "./data";
import RatesCalculator from "./RatesCalculator";
import { RATES_DEFAULTS, computeRatesCalc, type RatesValues } from "./rates-model";
import { fitTitle, ordinal, rankNeighbors, regionGroup, signedPct, stateExtra } from "./shared";
import { STATE_INFO, US_INFO } from "./state-data";

const SLUG = "electricity-rates-by-state";
const US = RATES.us;
/** EIA Short-Term Energy Outlook (Oct 2026): U.S. residential average, cents/kWh. */
const STEO = { y2026: 18.2, y2027: 18.7 };

/* ───────── programmatic presets: every state ───────── */

function statePreset(code: string): Preset<RatesValues> {
  const info = stateInfo(code);
  const row = stateRate(code);
  const values: RatesValues = { ...RATES_DEFAULTS, state: code, kwh: info.kwh };
  const rank = rateRank(code, "month");
  const vs = pctChange(row.cents, US.cents);
  return {
    slug: info.slug,
    values,
    group: regionGroup(code),
    label: info.name,
    h1: `How much does electricity cost in ${info.name}?`,
    metaTitle: fitTitle(`${info.name} Electricity Rate: ${fmtCents(row.cents)}/kWh (${RATES.monthLabel})`, `${info.name} Electricity Rate: ${fmtCents(row.cents)}/kWh (2026)`, `${info.name} Electric Rate: ${fmtCents(row.cents)}/kWh`),
    metaDescription: `${info.name} homes paid ${fmtCents(row.cents)}/kWh in ${RATES.monthLabel}, ${fmt(Math.abs(vs), 0)}% ${vs >= 0 ? "above" : "below"} the U.S. and ${ordinal(rank)} highest. A 1,000 kWh month costs ${fmtMoney(billFor(1000, row.cents))}.`,
  };
}

export const RATES_PRESETS: Preset<RatesValues>[] = STATE_INFO.map((s) => statePreset(s.code));

function presetAnswer(v: RatesValues): PresetAnswer {
  const c = computeRatesCalc({ ...v, rateMode: "ytd" });
  const { row, info } = c;
  const monthRank = rateRank(row.code, "month");
  const vsMonth = pctChange(row.cents, US.cents);
  const trend = pctChange(row.ytdCents, info.cents2025);
  const temps = { hdd: info.hdd.reduce((s, x) => s + x, 0), cdd: info.cdd.reduce((s, x) => s + x, 0) };
  const near = rankNeighbors(row.code);
  return {
    headline: `Electricity in ${info.name} averaged ${fmtCents(row.cents)} per kWh in ${RATES.monthLabel} and ${fmtCents(row.ytdCents)} for ${RATES.period} — the ${ordinal(monthRank)} most expensive state, ${fmt(Math.abs(vsMonth), 0)}% ${vsMonth >= 0 ? "above" : "below"} the U.S. average of ${fmtCents(US.cents)}.`,
    bullets: [
      `Year over year: ${RATES.monthLabel} is ${signedPct(c.yoyMonthPct)} from ${fmtCents(row.centsPrevYear)} a year earlier; the ${RATES.period} average is ${signedPct(c.yoyYtdPct)} from ${fmtCents(row.ytdPrevYearCents)} (U.S. ${signedPct(pctChange(US.ytdCents, US.ytdPrevYearCents))}).`,
      `The 2025 annual average was ${fmtCents(info.cents2025)} (EIA final), so 2026 so far is running ${signedPct(trend)} against it.`,
      `The average ${info.name} home used ${fmtInt(info.kwh)} kWh a month in 2025 and paid ${fmtMoney(info.bill, { cents: true })}; that same use costs ${fmtMoney(c.avgBillNow, { cents: true })} at the ${RATES.period} average.`,
      `For heating comparisons: natural gas averaged $${info.gas.toFixed(2)} per therm (${info.gasYear})${info.propane != null ? `, propane $${info.propane.toFixed(2)}/gal` : ""}${info.oil != null ? `, heating oil $${info.oil.toFixed(2)}/gal` : ""}${info.propane != null || info.oil != null ? " (Oct 19, 2026, before tax)" : ""}.`,
      `Climate drives use: ${fmtInt(temps.hdd)} heating and ${fmtInt(temps.cdd)} cooling degree days in a normal year (U.S. ${fmtInt(US_INFO.hdd.reduce((s, x) => s + x, 0))} and ${fmtInt(US_INFO.cdd.reduce((s, x) => s + x, 0))}).`,
      `Similar prices: ${near.map((s) => `${s.name} ${fmtCents(stateRate(s.code).ytdCents)}`).join(", ")}.`,
    ],
    table: {
      caption: `What a month of electricity costs in ${info.name}`,
      columns: ["Monthly use", RATES.monthLabel, RATES.period, "U.S. average"],
      rows: [500, 1000, 1500, info.kwh].map((k, i) => [i === 3 ? `${fmtInt(k)} kWh (state average)` : `${fmtInt(k)} kWh`, fmtMoney(billFor(k, row.cents), { cents: true }), fmtMoney(billFor(k, row.ytdCents), { cents: true }), fmtMoney(billFor(k, US.ytdCents), { cents: true })]),
    },
    notes: [
      `These are EIA's average residential prices: total revenue from residential customers divided by kWh sold. Delivery charges, fixed monthly customer charges, fuel adjustments and utility-paid taxes are all spread over every kWh, so the figure is close to an all-in rate (bill ÷ kWh). Your own utility, plan and usage tier can put you above or below it.`,
      `${RATES.monthLabel} figures are preliminary and EIA revises them; we refresh this page automatically when EIA publishes a new month (last update ${RATES.updated}).`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const ranked = ratesRanked("month");
  const hi = ranked[0];
  const lo = ranked[ranked.length - 1];
  const byUse = [...STATE_INFO].sort((a, b) => b.kwh - a.kwh);
  const mostUse = byUse[0];
  const leastUse = byUse[byUse.length - 1];
  return (
    <>
      <h2>What the average electricity rate means</h2>
      <p>
        The prices here are the U.S. Energy Information Administration&apos;s average residential price for each state: everything residential
        customers paid their utilities divided by the kWh they used. That spreads delivery charges and the fixed monthly customer charge over
        every kWh, so it lands close to your <em>all-in</em> rate — your total bill divided by the kWh on it. For {RATES.monthLabel} the U.S.
        average was {fmtCents(US.cents)}, and {fmtCents(US.ytdCents)} for {RATES.period}, up {fmt(pctChange(US.ytdCents, US.ytdPrevYearCents), 1)}% on
        the same months of 2025.
      </p>
      <p>
        <strong>Example:</strong> a home using 1,000 kWh in a month at the U.S. average of {fmtCents(US.ytdCents)} pays about{" "}
        {fmtMoney(billFor(1000, US.ytdCents), { cents: true })}. The same month costs {fmtMoney(billFor(1000, lo.cents), { cents: true })} in{" "}
        {lo.state} and {fmtMoney(billFor(1000, hi.cents), { cents: true })} in {hi.state}.
      </p>

      <h2>Electricity rates by state, {RATES.monthLabel}</h2>
      <table>
        <thead>
          <tr>
            <th>State</th>
            <th>{RATES.monthLabel}</th>
            <th>{RATES.period}</th>
            <th>vs 2025 YTD</th>
            <th>Avg use (kWh/mo)</th>
            <th>Bill at avg use</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((s) => {
            const info = stateInfo(s.code);
            return (
              <tr key={s.code}>
                <td>
                  <Link href={`/electricity/${SLUG}/${info.slug}`}>{s.state}</Link>
                </td>
                <td>{fmt(s.cents, 2)}¢</td>
                <td>{fmt(s.ytdCents, 2)}¢</td>
                <td>{signedPct(pctChange(s.ytdCents, s.ytdPrevYearCents))}</td>
                <td>{fmtInt(info.kwh)}</td>
                <td>{fmtMoney(billFor(info.kwh, s.ytdCents))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        Sorted from most to least expensive in {RATES.monthLabel}. Average use is EIA&apos;s 2025 figure per residential customer; the bill
        column prices it at the {RATES.period} average. Source: EIA Electric Power Monthly, Tables 5.6.A and 5.6.B (preliminary), refreshed
        automatically each month.
      </p>

      <h2>Price and usage both vary by state</h2>
      <p>
        The most expensive state pays {fmt(hi.cents / lo.cents, 1)} times as much per kWh as the cheapest. Usage swings just as widely: the
        average home in {mostUse.name} used {fmtInt(mostUse.kwh)} kWh a month in 2025, against {fmtInt(leastUse.kwh)} in {leastUse.name}. So a low rate doesn&apos;t guarantee a low bill —
        compare the bill column, not just the price.
      </p>

      <h2>Reading your own bill</h2>
      <ul>
        <li>
          <strong>Supply (generation)</strong> is the energy itself. In states with retail choice it may come from a separate supplier.
        </li>
        <li>
          <strong>Delivery</strong> pays for the wires and poles, and is usually charged per kWh as well.
        </li>
        <li>
          <strong>Fixed customer charge</strong> doesn&apos;t change with use. California utilities, for example, added a base services charge of about
          $24 a month in 2026.
        </li>
        <li>
          <strong>Tiers and time of use.</strong> Some plans charge more above a baseline or in peak hours (often 4–9 pm), so the cost of extra
          kWh can differ from the average.
        </li>
      </ul>
      <p>
        To price a new appliance, add only the per-kWh lines (supply + delivery) — that is your marginal rate. To compare states or estimate a
        whole bill, the EIA average is the right number.
      </p>

      <h2>Where prices are heading</h2>
      <p>
        The final 2025 U.S. average was 17.23¢/kWh (EIA Electric Power Annual). EIA&apos;s October 2026 Short-Term Energy Outlook projects{" "}
        {STEO.y2026}¢ for all of 2026 and {STEO.y2027}¢ for 2027. Any figure from a 2024 or 2025 article quoting 16–17¢ is out of date.
      </p>

      <h2>Use your state&apos;s rate</h2>
      <p>
        Every calculator on this site starts from these prices. Pick your state in the{" "}
        <Link href="/electricity/electricity-cost-calculator">electricity cost calculator</Link>, or open a state page for the{" "}
        <Link href="/electricity/space-heater-cost-calculator">space heater</Link>, <Link href="/electricity/air-conditioner-cost-calculator">air conditioner</Link>{" "}
        and <Link href="/electricity/ev-charging-cost-calculator">EV charging</Link> calculators. High rate? See whether{" "}
        <Link href="/solar">solar</Link> pays off where you live.
      </p>
    </>
  );
}

const HI = ratesRanked("month")[0];
const LO = ratesRanked("month").slice(-1)[0];

export const ratesCalculator: CalculatorEntry<RatesValues> = {
  meta: {
    slug: SLUG,
    category: "electricity",
    name: "Electricity Rates by State",
    shortName: "Rates by state",
    h1: `Electricity Rates by State (${RATES.monthLabel})`,
    metaTitle: `Electricity Rates by State: ${RATES.monthLabel} Prices per kWh`,
    metaDescription: `Average residential electricity price for all 50 states + DC: U.S. ${fmtCents(US.cents)}/kWh in ${RATES.monthLabel}, from ${fmtCents(LO.cents)} (${LO.code}) to ${fmtCents(HI.cents)} (${HI.code}). Rank, trend, bill.`,
    summary: `The latest EIA residential electricity price for every state — this month and the ${RATES.period} average — with each state's rank, change from last year, average household bill and what any monthly use costs.`,
    outputs: ["Price per kWh", "Rank & vs U.S.", "Year-over-year change", "Bill for your kWh"],
    faq: [
      { q: "What is the average price of electricity in the U.S.?", a: `${fmtCents(US.cents)} per kWh for residential customers in ${RATES.monthLabel} and ${fmtCents(US.ytdCents)} on average for ${RATES.period} (EIA, preliminary). The final 2025 average was 17.23¢.` },
      { q: "Which state has the most expensive electricity?", a: `${HI.state}, at ${fmtCents(HI.cents)} per kWh in ${RATES.monthLabel}. The cheapest was ${LO.state} at ${fmtCents(LO.cents)}.` },
      { q: "How much is the average electric bill?", a: `The average U.S. home used ${fmtInt(US_INFO.kwh)} kWh a month in 2025 and paid $${US_INFO.bill.toFixed(2)} (EIA). At the ${RATES.period} average price the same use costs ${fmtMoney(billFor(US_INFO.kwh, US.ytdCents), { cents: true })}.` },
      { q: "Will electricity prices go up in 2027?", a: `EIA's October 2026 Short-Term Energy Outlook projects the U.S. residential average at ${STEO.y2026}¢/kWh for 2026 and ${STEO.y2027}¢ for 2027, about 2.7% higher.` },
      { q: "Does the average rate include delivery and fixed charges?", a: "Yes. EIA divides all residential revenue — energy, delivery, fixed customer charges, fuel adjustments and utility-paid taxes — by kWh sold, so it's close to an all-in rate. Your marginal cost for extra kWh can be lower." },
      { q: "Why is my rate different from the state average?", a: "Each utility, plan and usage tier differs, and time-of-use plans price peak hours higher. Divide your bill's total by its kWh for your all-in rate, or add up the per-kWh lines for the cost of extra use." },
      { q: "How often is this data updated?", a: `EIA publishes a new month in the Electric Power Monthly late each month, about two months after the fact. This page refreshes automatically; the latest month shown is ${RATES.monthLabel}.` },
    ],
    sources: [SOURCES.eiaMonthly, SOURCES.eiaAnnual, SOURCES.eia861m, SOURCES.eiaTechNotes, SOURCES.eiaGas, SOURCES.eiaHeatingFuels, SOURCES.noaaDegreeDays],
    related: ["electricity/electricity-cost-calculator", "electricity/space-heater-cost-calculator", "electricity/ev-charging-cost-calculator", "solar/solar-payback-calculator", "electricity/electric-bill-calculator"],
    updated: ELECTRICITY_CHECKED,
    keywords: ["electricity rates by state", "price per kwh", "average electric bill", "electricity cost by state", "kwh price 2026", "cheapest electricity state"],
    featured: true,
  },
  Calculator: RatesCalculator,
  Content,
  presets: RATES_PRESETS,
  presetAnswer,
  PresetExtra: stateExtra(SLUG),
};
