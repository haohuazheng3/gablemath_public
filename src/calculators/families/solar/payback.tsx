import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { verdictFor, type Verdict } from "./compute";
import {
  BATTERY_KWH,
  COST_PER_W_LBNL_US,
  ESCALATION_RECENT_PCT,
  FEDERAL,
  RATE_PERIOD,
  SOLAR_CHECKED,
  STATES,
  US_RATE_CENTS,
  US_TYPICAL,
  exportLabel,
  solarSources,
  stateSolar,
  type StateSolar,
} from "./data";
import PaybackCalculator from "./PaybackCalculator";
import { PAYBACK_DEFAULTS, computePaybackCalc, paybackPresetValues, type PaybackValues } from "./payback-model";

const SLUG = "solar-payback-calculator";
const BASE = `/solar/${SLUG}`;

export const displayName = (s: StateSolar) => (s.code === "DC" ? "Washington, D.C." : s.code === "US" ? "the U.S." : s.name);

function ordinal(n: number) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

const lowest = (k: number) => (k === 1 ? "the lowest" : `the ${ordinal(k)}-lowest`);

const pbText = (pb: number | null) => (pb != null ? `${fmt(pb, 1)} years` : "more than 25 years");

const VERDICT_WORD: Record<Verdict, string> = { strong: "a strong investment", solid: "a solid investment", marginal: "a marginal investment", weak: "hard to justify on savings alone" };

/* ───────── presets: every state + DC (each carries state-specific data) ───────── */

export const PAYBACK_PRESETS: Preset<PaybackValues>[] = [...STATES]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((s) => {
    const v = paybackPresetValues(s.code);
    const r = computePaybackCalc(v);
    const n = displayName(s);
    return {
      slug: s.slug,
      values: v,
      group: `${s.region} states`,
      label: n,
      h1: `Is solar worth it in ${n} in 2026?`,
      metaTitle: `Is Solar Worth It in ${n}? 2026 Payback`,
      metaDescription: `${n} solar in 2026: ${fmt(r.kw, 1)} kW costs about ${fmtMoney(r.netCost)} with no federal credit, saves ${fmtMoney(r.savings1)} in year 1, pays back in ${r.paybackYears != null ? `${fmt(r.paybackYears, 1)} yrs` : "25+ yrs"}.`,
    };
  });

function conclusion(s: StateSolar, r: ReturnType<typeof computePaybackCalc>): string {
  const n = displayName(s);
  const v = verdictFor(r.paybackYears);
  const drivers: string[] = [];
  if (s.rateRank <= 12) drivers.push(s.rateRank === 1 ? "the most expensive electricity in the country" : `electricity that costs more than in all but ${s.rateRank === 2 ? "one state" : `${s.rateRank - 1} states`}`);
  else if (s.rateRank >= 40) drivers.push(`cheap power (${lowest(52 - s.rateRank)} price of 51), which caps what each kWh saves`);
  if (s.sunRank <= 10) drivers.push(`strong sun (${s.sunRank === 1 ? "the best" : `the ${ordinal(s.sunRank)}-best`} yield of 51)`);
  else if (s.sunRank >= 42) drivers.push(`weak sun (${lowest(52 - s.sunRank)} yield of 51)`);
  if (s.export.mode !== "retail") drivers.push(`export credits below retail (${exportLabel(s)}), so only the solar you use yourself earns full value`);
  else if (!s.export.estimate) drivers.push("1:1 net metering, which credits every exported kWh at the full retail price");
  if (r.stateTotal > 0) drivers.push(`a state incentive worth about ${fmtMoney(r.stateTotal)}`);
  if (s.perf) drivers.push(`performance payments (${s.perf.label})`);
  const why = drivers.length ? ` The main reasons: ${drivers.join("; ")}.` : "";
  const tail =
    v === "weak"
      ? " Unless your quote comes in well below the state average or your rate is higher than average, it makes more sense to cut usage first or wait for better export terms."
      : v === "marginal"
        ? " Get at least three quotes: every $0.25/W you shave off the price moves payback by roughly a year or more here."
        : " Pay cash if you can: Berkeley Lab found loan-financed systems priced about $1.50/W above cash installs in 2025, which can add years to the payback.";
  return `Verdict: at average ${n} numbers, solar is ${VERDICT_WORD[v]} in 2026 — payback takes ${pbText(r.paybackYears)}, leaving you ${r.netAfterYears >= 0 ? `${fmtMoney(r.netAfterYears)} ahead` : `${fmtMoney(-r.netAfterYears)} short`} after 25 years.${why}${tail}`;
}

function presetAnswer(v: PaybackValues): PresetAnswer {
  const s = stateSolar(v.state);
  const n = displayName(s);
  const r = computePaybackCalc(v);
  const panels = Math.round((r.kw * 1000) / 440);
  const yoy = s.ratePrev > 0 ? ((s.rate - s.ratePrev) / s.ratePrev) * 100 : 0;
  const scen = (label: string, patch: Partial<PaybackValues>) => {
    const x = computePaybackCalc({ ...v, ...patch });
    return [label, fmtMoney(x.netCost), fmtMoney(x.savings1), x.paybackYears != null ? `${fmt(x.paybackYears, 1)} yr` : "25+ yr", fmtMoney(x.netAfterYears)];
  };
  const lbnl = s.lbnlW ?? COST_PER_W_LBNL_US;
  const withBatt = computePaybackCalc({ ...v, battery: true });
  const annualProd = r.production1;
  const srecLine = s.srec
    ? `SRECs: ${n} solar renewable energy certificates trade around $${s.srec[0]}${s.srec[1] !== s.srec[0] ? `–${s.srec[1]}` : ""}/MWh — roughly ${fmtMoney((annualProd / 1000) * s.srec[0])}${s.srec[1] !== s.srec[0] ? `–${fmtMoney((annualProd / 1000) * s.srec[1])}` : ""} a year for this system. Not counted in the payback above because prices and terms change.`
    : "";
  return {
    headline: `In ${n}, a ${fmt(r.kw, 1)}-kW system for an average home costs about ${fmtMoney(r.netCost)} after incentives in 2026, saves about ${fmtMoney(r.savings1)} in the first year and pays back in ${pbText(r.paybackYears)}.`,
    bullets: [
      `Sun: ${s.city} gets ${fmt(s.psh, 2)} peak sun hours a day, so each kW of panels makes about ${fmtInt(s.yield)} kWh a year — ${ordinal(s.sunRank)} of 51 (${s.yieldSrc === "pvwatts" ? "PVWatts v8" : "PVGIS estimate"}). This ${fmt(r.kw, 2)}-kW array (${panels} × 440-W panels) makes ${fmtInt(annualProd)} kWh, ${fmt(r.offset1 * 100, 0)}% of the state's average ${fmtInt(s.avgKwh)} kWh/month home.`,
      `Electricity: ${fmt(s.rate, 2)}¢/kWh (EIA, ${RATE_PERIOD}), ${yoy >= 0 ? "up" : "down"} ${fmt(Math.abs(yoy), 1)}% from ${fmt(s.ratePrev, 2)}¢ a year earlier — ${ordinal(s.rateRank)} highest of 51 and ${s.rate >= US_RATE_CENTS ? "above" : "below"} the U.S. average of ${fmt(US_RATE_CENTS, 2)}¢. Prices here rose ${fmt(s.cagr, 1)}% a year over 2015–2025.`,
      `Price: $${fmt(s.costPerW, 2)}/W ${s.costIsNational ? "(national EnergySage median — no state figure)" : "(EnergySage state average, Oct 2026)"} → ${fmtMoney(r.grossSolar)} before incentives.`,
      `Export rules: ${exportLabel(s)}${s.export.estimate ? " (estimate — verify with your utility)" : ""}; the system is sized to ${v.offset}% of use.`,
      `Incentives: no federal credit for a 2026 purchase. ${s.incentives}`,
      srecLine,
    ].filter(Boolean),
    table: {
      caption: `${n}: how the answer changes`,
      columns: ["Scenario", "Net cost", "Year-1 savings", "Payback", "25-yr net"],
      rows: [
        scen("State averages (above)", {}),
        scen(`Rates rise ${fmt(ESCALATION_RECENT_PCT, 1)}%/yr (2020–25 pace)`, { esc: ESCALATION_RECENT_PCT }),
        scen("Rates stay flat", { esc: 0 }),
        scen(`Survey price $${fmt(lbnl, 2)}/W (LBNL)`, { costW: lbnl }),
        scen(`Add ${fmt(BATTERY_KWH, 1)}-kWh battery`, { battery: true }),
        s.export.mode === "retail" ? scen("Exports cut to 50% of retail", { exportMode: "pct", exportVal: 50, offset: 70 }) : scen("Size to 100% of use instead", { offset: 100 }),
      ],
    },
    notes: [
      conclusion(s, r),
      `Net metering and exports in ${n}: ${s.policy}`,
      `Battery: a ${fmt(BATTERY_KWH, 1)}-kWh battery at the ${n} average of $${fmtInt(s.batteryPerKwh)}/kWh adds ${fmtMoney(withBatt.grossBattery)} and ${s.export.mode === "retail" ? "saves almost nothing extra under 1:1 net metering — buy it for backup, not payback" : `shifts about ${fmtInt(withBatt.split1.shifted)} kWh a year from low-paid exports to your own use`}; payback becomes ${pbText(withBatt.paybackYears)}.`,
      s.esPayback != null
        ? `EnergySage's ${n} page lists a ${fmt(s.esPayback, 1)}-year payback. Its method is not fully published; ours uses EIA's ${RATE_PERIOD} price, ${s.export.mode === "retail" ? "1:1 net metering" : "40% self-use and the state's export credit"}, 3%/yr rate growth and 0.5%/yr panel aging, with no federal credit.`
        : `Lease or PPA instead? The owner can still claim the ${FEDERAL.tpoRatePct}% 48E credit if construction began by July 4, 2026 or the system is in service by Dec 31, 2027 — ask whether that discount is in the monthly price.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const us = computePaybackCalc(PAYBACK_DEFAULTS);
  const ex = us.rows[0];
  const sorted = [...STATES].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <h2>How solar payback is calculated</h2>
      <p>
        Payback is the year your cumulative savings catch up with what you paid. Start with the <strong>net cost</strong> — system size × price per watt, plus any
        battery, minus credits and rebates. Then add up each year&apos;s <strong>savings</strong>: the kWh the panels make × what each kWh is worth on your bill. That
        value rises as utility rates climb (3%/yr is EIA&apos;s 20-year nominal average) and falls slightly as panels age (about 0.5%/yr).
      </p>
      <p>
        <strong>Worked example (U.S. typical):</strong> an {fmtInt(US_TYPICAL.avgKwh)} kWh/month home needs {fmt(us.kw, 2)} kW to cover its use at {fmtInt(US_TYPICAL.yield)} kWh per kW
        a year. At ${fmt(US_TYPICAL.costPerW, 2)}/W that costs {fmtMoney(us.netCost)} with no federal credit. Year one: {fmtInt(us.production1)} kWh × {fmt(US_RATE_CENTS, 2)}¢ ={" "}
        {fmtMoney(ex.billSavings)}. With rates up 3% a year the system breaks even in about <strong>{pbText(us.paybackYears)}</strong> and is {fmtMoney(us.netAfterYears)} ahead
        after 25 years.
      </p>

      <h2>The 2026 federal tax credit: what changed</h2>
      <ul>
        <li>
          <strong>Buying (cash or loan): 0%.</strong> The 30% residential clean energy credit (25D) ended for systems whose installation is completed after December 31, 2025.
          The date that counts is when installation is finished, not when you signed or paid a deposit.
        </li>
        <li>
          <strong>Lease or PPA: maybe.</strong> The company that owns the panels can still claim the commercial 48E credit (normally {FEDERAL.tpoRatePct}% for home-size systems) if
          construction began by July 4, 2026 or the system is placed in service by December 31, 2027. EnergySage found lease quotes about {FEDERAL.leaseGapPct}% and prepaid PPAs
          about {FEDERAL.ppaGapPct}% cheaper than cash in early 2026 — compare the total you will pay over the contract, including the escalator.
        </li>
        <li>Old schedules showing 26% in 2033 and 22% in 2034 no longer apply; that phase-down was repealed.</li>
      </ul>

      <h2>Net metering vs. net billing</h2>
      <p>
        How your utility pays for the power you send back matters as much as sunshine. Under <strong>1:1 net metering</strong> every exported kWh offsets a kWh you buy later, so
        sizing to 100% of use makes sense. Under <strong>net billing</strong> exports earn a lower rate and only the solar you use as it&apos;s made saves the full price — size to
        roughly 70% and consider shifting loads to midday.
      </p>
      <table>
        <thead>
          <tr>
            <th>State</th>
            <th>Retail price</th>
            <th>Export credit (2026)</th>
          </tr>
        </thead>
        <tbody>
          {["CA", "AZ", "UT", "GA", "NV", "NC", "NJ", "MA"].map((c) => {
            const s = stateSolar(c);
            return (
              <tr key={c}>
                <td>
                  <Link href={`${BASE}/${s.slug}`}>{s.name}</Link>
                </td>
                <td>{fmt(s.rate, 1)}¢</td>
                <td>{exportLabel(s)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Solar payback by state, 2026</h2>
      <p>
        Average-home numbers at each state&apos;s EIA {RATE_PERIOD} price and EnergySage price per watt, no federal credit, state incentives included. Open a state for the
        details.
      </p>
      <table>
        <thead>
          <tr>
            <th>State</th>
            <th>¢/kWh</th>
            <th>kWh per kW</th>
            <th>$/W</th>
            <th>Payback</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const r = computePaybackCalc(paybackPresetValues(s.code));
            return (
              <tr key={s.code}>
                <td>
                  <Link href={`${BASE}/${s.slug}`}>{displayName(s)}</Link>
                </td>
                <td>{fmt(s.rate, 1)}</td>
                <td>{fmtInt(s.yield)}</td>
                <td>{fmt(s.costPerW, 2)}</td>
                <td>{r.paybackYears != null ? `${fmt(r.paybackYears, 1)} yr` : "25+ yr"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>What moves payback the most</h2>
      <ul>
        <li>
          <strong>Your quote.</strong> Berkeley Lab found installer prices from $2.4 to $6.3/W in 2025. Every $0.25/W on an 8-kW system is $2,000.
        </li>
        <li>
          <strong>Your rate and how exports are credited.</strong> A 30¢ rate with net metering pays back several times faster than a 13¢ rate with 3–4¢ exports.
        </li>
        <li>
          <strong>Rate growth.</strong> Prices rose {fmt(ESCALATION_RECENT_PCT, 2)}%/yr in 2020–2025 versus about 3% over 20 years; test both in the calculator.
        </li>
        <li>
          <strong>Batteries.</strong> At about $1,130/kWh before incentives, a battery mostly pays for itself only where exports earn little and evening rates are high.
        </li>
      </ul>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>Using your all-in average rate.</strong> EIA averages include fixed monthly charges that solar can&apos;t erase. California&apos;s $24.15/month Base Services
          Charge, for example, lowered the per-kWh price solar actually offsets.
        </li>
        <li>
          <strong>Comparing different price-per-watt numbers.</strong> Marketplace quotes ($2.57/W) run below surveyed installed prices ($3.36–$3.60/W), and loan-financed
          systems averaged $4.50/W.
        </li>
        <li>
          <strong>Ignoring the inverter.</strong> String inverters are often replaced once, around year 12–15; microinverters usually carry 25-year warranties.
        </li>
        <li>
          <strong>Counting the 30% credit.</strong> Quotes or blogs written before 2026 may still include it.
        </li>
      </ul>
      <p>
        Need the system size first? Use the <Link href="/solar/solar-panel-calculator">solar panel calculator</Link>. Check your state&apos;s price on{" "}
        <Link href="/electricity/electricity-rates-by-state">electricity rates by state</Link>, or see what an EV adds with the{" "}
        <Link href="/electricity/ev-charging-cost-calculator">EV charging cost calculator</Link>.
      </p>
    </>
  );
}

const us = computePaybackCalc(PAYBACK_DEFAULTS);
const ca = computePaybackCalc(paybackPresetValues("CA"));
const caBatt = computePaybackCalc({ ...paybackPresetValues("CA"), battery: true });

export const solarPaybackCalculator: CalculatorEntry<PaybackValues> = {
  meta: {
    slug: SLUG,
    category: "solar",
    name: "Solar Payback Calculator",
    shortName: "Solar payback",
    h1: "Solar Payback Calculator (2026)",
    metaTitle: "Solar Payback Calculator 2026: Is Solar Worth It?",
    metaDescription: `Solar payback by state for 2026 with no federal tax credit: a typical ${fmt(us.kw, 1)} kW system breaks even in ${us.paybackYears != null ? fmt(us.paybackYears, 1) : "25+"} years. Net metering, rates, batteries.`,
    summary: "Pick your state to see net cost, first-year savings, break-even year and 25-year return — with 2026 tax rules, your state's export credits and incentives built in.",
    outputs: ["Payback years", "Net cost", "Year-1 savings", "25-year return", "Break-even chart"],
    faq: [
      {
        q: "Is solar worth it in 2026 without the 30% tax credit?",
        a: `Often, yes. A typical ${fmt(us.kw, 1)} kW system at the $2.57/W national median costs about ${fmtMoney(us.netCost)} and pays back in about ${pbText(us.paybackYears)} with 1:1 net metering and the U.S. average ${fmt(US_RATE_CENTS, 1)}¢ rate. States with cheap power and low export credits can take 15–25+ years.`,
      },
      {
        q: "Can I still get the federal solar tax credit in 2026?",
        a: "Not if you buy the system. The 30% residential credit (25D) is 0% for systems whose installation is completed after December 31, 2025 — even if you signed or paid a deposit in 2025.",
      },
      {
        q: "Does the solar tax credit apply to leased panels or PPAs in 2026?",
        a: `It can. The company that owns the system may claim the ${FEDERAL.tpoRatePct}% 48E credit if construction began by July 4, 2026 or the system is placed in service by December 31, 2027. Ask whether the discount is reflected in your lease or PPA price.`,
      },
      {
        q: "What is a good solar payback period?",
        a: "Under about 8 years is strong and 8–12 is solid, since panels typically carry 25-year performance warranties. Beyond about 16 years, the savings depend heavily on rates rising and the equipment lasting.",
      },
      {
        q: "Do I need a battery with NEM 3.0 in California?",
        a: `It helps, but it is not required. With exports worth about 4.1¢ against a ${fmt(ca.year1.rateCents, 1)}¢ retail rate, a solar-only system sized to 70% of use pays back in about ${pbText(ca.paybackYears)}; adding a 13.5 kWh battery at California's average price changes that to about ${pbText(caBatt.paybackYears)}.`,
      },
      {
        q: "What is a fair price per watt for solar in 2026?",
        a: "EnergySage's H1 2026 marketplace median is $2.57/W before incentives, while surveyed installed prices run $3.36–$3.60/W. Berkeley Lab saw installer prices from $2.4 to $6.3/W, so get several quotes.",
      },
    ],
    sources: solarSources("irs25d", "obbba", "n2542", "tpo", "pvwatts", "pvgis", "eiaEpm", "eia861", "eiaMer", "esCost", "esReport", "lbnl", "esIncent", "caNbt", "esStorage", "enphase", "osti"),
    related: ["solar/solar-panel-calculator", "electricity/electricity-rates-by-state", "electricity/ev-charging-cost-calculator", "electricity/electricity-cost-calculator", "solar/solar-battery-calculator"],
    updated: SOLAR_CHECKED,
    keywords: ["solar payback", "is solar worth it", "solar roi", "solar savings", "net metering", "solar tax credit 2026", "solar battery payback"],
    featured: true,
  },
  Calculator: PaybackCalculator,
  Content,
  presets: PAYBACK_PRESETS,
  presetAnswer,
};
