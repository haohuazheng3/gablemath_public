import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeEv, fmtCents, ratesRanked, stateInfo } from "./compute";
import { CHARGER_KW, ELECTRICITY_CHECKED, EV_MODELS, EV_RATE_PLANS, GAS_MPG_DEFAULT, L1_EXTRA_LOSS, RATES, SOURCES, type EvModel } from "./data";
import EvChargingCalculator from "./EvChargingCalculator";
import { EV_DEFAULTS, computeEvCalc, type EvValues } from "./ev-charging-model";
import { fitTitle, rateFacts, regionGroup, stateExtra, usYtdCents } from "./shared";
import { STATE_INFO, US_INFO } from "./state-data";

const SLUG = "ev-charging-cost-calculator";
const US = usYtdCents();
const short = (m: EvModel) => m.name.replace(/^20\d\d /, "").replace(/ \(.*\)$/, "");

/* ───────── programmatic presets: popular EVs (national) and every state ───────── */

const MODEL_SLUGS: Record<string, string> = {
  "model-y-lr": "tesla-model-y-long-range",
  "model-y-std": "tesla-model-y",
  "model-3-std": "tesla-model-3",
  "model-3-awd": "tesla-model-3-awd",
  "model-s": "tesla-model-s",
  "model-x": "tesla-model-x",
  cybertruck: "tesla-cybertruck",
  "equinox-ev": "chevy-equinox-ev",
  "ioniq-5": "hyundai-ioniq-5",
  "mach-e": "ford-mustang-mach-e",
  ev9: "kia-ev9",
  leaf: "nissan-leaf",
  prologue: "honda-prologue",
  r1s: "rivian-r1s",
  "f150-lightning": "ford-f-150-lightning",
};

function modelPreset(m: EvModel): Preset<EvValues> {
  const values: EvValues = { ...EV_DEFAULTS, vehicle: m.id };
  const { r } = computeEvCalc(values);
  const name = short(m);
  return {
    slug: MODEL_SLUGS[m.id],
    values,
    group: "By vehicle",
    label: name,
    h1: `How much does it cost to charge a ${name} at home?`,
    metaTitle: fitTitle(`Cost to Charge a ${name}: ${fmtMoney(r.costMonth)}/Month`, `${name} Charging Cost: ${fmtMoney(r.costMonth)}/Month`, `${name.replace("Tesla ", "")} Charging: ${fmtMoney(r.costMonth)}/Mo`),
    metaDescription: `At ${m.kwh100} kWh/100 mi, 1,000 miles a month costs ${fmtMoney(r.costMonth, { cents: true })} to charge at home (U.S. avg ${fmtCents(US)}/kWh) — ${fmt(r.costPerMile * 100, 1)}¢ a mile vs ${fmt(r.gasPerMile * 100, 1)}¢ for gas.`,
  };
}

function statePreset(code: string): Preset<EvValues> {
  const info = stateInfo(code);
  const values: EvValues = { ...EV_DEFAULTS, state: code };
  const { r } = computeEvCalc(values);
  return {
    slug: info.slug,
    values,
    group: regionGroup(code),
    label: info.name,
    h1: `How much does it cost to charge an EV at home in ${info.name}?`,
    metaTitle: fitTitle(`EV Charging Cost in ${info.name}: ${fmtMoney(r.costMonth)} a Month (2026)`, `EV Charging Cost in ${info.name}: ${fmtMoney(r.costMonth)}/Month`),
    metaDescription: `Charging an EV at home in ${info.name} costs ${fmt(r.costPerMile * 100, 1)}¢ a mile — ${fmtMoney(r.costMonth, { cents: true })} for 1,000 miles vs ${fmtMoney(r.gasMonth, { cents: true })} of gas at $${info.gasoline.toFixed(2)}/gal.`,
  };
}

export const EV_PRESETS: Preset<EvValues>[] = [...EV_MODELS.map(modelPreset), ...STATE_INFO.map((s) => statePreset(s.code))];

function presetAnswer(v: EvValues): PresetAnswer {
  const c = computeEvCalc(v);
  const { r, rate, info } = c;
  const m = c.model ?? EV_MODELS[0];
  const name = short(m);
  const ranked = ratesRanked("ytd");
  const lo = ranked[ranked.length - 1];
  const hi = ranked[0];
  const at = (cents: number, model = m) => computeEv({ kwh100: model.kwh100, miles: v.miles, level: "l2", cents, gasPrice: c.gasPrice, mpg: v.mpg, range: model.range });
  const l1 = computeEv({ kwh100: m.kwh100, miles: v.miles, level: "l1", cents: rate.cents, gasPrice: c.gasPrice, mpg: v.mpg });

  if (info.code === "US") {
    return {
      headline: `Charging a ${name} at home costs about ${fmtMoney(r.costMonth, { cents: true })} a month for ${fmtInt(v.miles)} miles (${fmtInt(r.kwhMonth)} kWh) at the U.S. average of ${fmtCents(rate.cents)}/kWh — ${fmt(r.costPerMile * 100, 1)}¢ a mile versus ${fmt(r.gasPerMile * 100, 1)}¢ for a ${GAS_MPG_DEFAULT} mpg gas car.`,
      bullets: [
        `EPA rates the ${m.name} at ${m.kwh100} kWh per 100 miles, measured from the wall, so Level 2 charging losses are already counted.`,
        r.fullCharge
          ? `A full charge for its ${fmtInt(m.range ?? 0)}-mile EPA range takes about ${fmt(r.fullCharge.kwh, 0)} kWh from the wall — ${fmtMoney(r.fullCharge.cost, { cents: true })}.`
          : `Per 100 miles that is ${fmtMoney(r.costPerMile * 100, { cents: true })} at the U.S. average price.`,
        `Against gas at the U.S. average $${US_INFO.gasoline.toFixed(2)}/gal and ${GAS_MPG_DEFAULT} mpg (${fmtMoney(r.gasMonth, { cents: true })} a month), home charging saves about ${fmtMoney(r.savingsYear)} a year.`,
        `On a Level 2 charger (~${CHARGER_KW.l2} kW) ${fmtInt(v.miles)} miles a month needs about ${fmt(r.chargeHoursPerDay, 1)} hours of charging a day; on Level 1 about ${fmt(l1.chargeHoursPerDay, 1)} hours, and ~${fmt(L1_EXTRA_LOSS * 100, 0)}% more electricity (${fmtMoney(l1.costMonth, { cents: true })}).`,
        `The same driving costs ${fmtMoney(at(lo.ytdCents).costMonth, { cents: true })} a month in ${lo.state} and ${fmtMoney(at(hi.ytdCents).costMonth, { cents: true })} in ${hi.state}.`,
      ],
      table: {
        caption: `${name}: home charging cost by miles driven (${fmtCents(rate.cents)}/kWh)`,
        columns: ["Miles a month", "kWh", "Per month", "Per year", "Gas car, per month"],
        rows: [500, 1000, 1250, 1500, 2000].map((mi) => {
          const x = computeEv({ kwh100: m.kwh100, miles: mi, level: "l2", cents: rate.cents, gasPrice: c.gasPrice, mpg: v.mpg });
          return [fmtInt(mi), fmtInt(x.kwhMonth), fmtMoney(x.costMonth, { cents: true }), fmtMoney(x.costYear), fmtMoney(x.gasMonth, { cents: true })];
        }),
      },
      notes: [
        `${fmtInt(v.miles)} mi × ${m.kwh100} kWh ÷ 100 = ${fmtInt(r.kwhMonth)} kWh; × ${fmtCents(rate.cents)} (U.S. average, ${RATES.period}, EIA) = ${fmtMoney(r.costMonth, { cents: true })}.`,
        "Only home charging is counted. Public fast chargers set their own prices — enter one as a custom rate to compare.",
      ],
    };
  }

  const f = rateFacts(info.code);
  const plans = EV_RATE_PLANS.filter((p) => (info.code === "CA" && p.id !== "fpl-tou") || (info.code === "FL" && p.id === "fpl-tou"));
  const sorted = [...EV_MODELS].sort((a, b) => a.kwh100 - b.kwh100);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  return {
    headline: `Charging an EV at home in ${info.name} costs about ${fmtMoney(r.costMonth, { cents: true })} a month for ${fmtInt(v.miles)} miles in a ${name} — ${fmt(r.costPerMile * 100, 1)}¢ a mile, versus ${fmt(r.gasPerMile * 100, 1)}¢ for a ${GAS_MPG_DEFAULT} mpg car on $${info.gasoline.toFixed(2)} gas.`,
    bullets: [
      `${info.name} pays ${f.sentence}.`,
      `Regular gasoline averaged $${info.gasoline.toFixed(2)}/gal in ${info.gasolineArea === info.name ? info.name : `the ${info.gasolineArea} region`} (EIA, week of Oct 19, 2026), so home charging saves about ${fmtMoney(r.savingsYear)} a year at ${fmtInt(v.miles * 12)} miles.`,
      `Efficiency matters as much as price: a ${short(best)} (${best.kwh100} kWh/100 mi) costs ${fmtMoney(at(rate.cents, best).costMonth, { cents: true })} a month here, a ${short(worst)} (${worst.kwh100}) ${fmtMoney(at(rate.cents, worst).costMonth, { cents: true })}.`,
      plans.length
        ? `On an off-peak plan it drops further: ${plans.map((p) => `${p.label} at ${p.cents}¢ → ${fmtMoney(at(p.cents).costMonth, { cents: true })} a month`).join("; ")}.`
        : "Ask your utility about a time-of-use or EV rate: overnight energy is often priced well below the average shown here.",
      `${fmtInt(r.kwhMonth)} kWh a month is ${fmt((r.kwhMonth / info.kwh) * 100, 0)}% on top of the ${fmtInt(info.kwh)} kWh an average ${info.name} home used each month in 2025.`,
    ],
    table: {
      caption: `Home charging cost in ${info.name}, ${fmtInt(v.miles)} miles a month at ${fmtCents(rate.cents)}/kWh`,
      columns: ["Vehicle", "kWh/100 mi", "Per month", "Per mile"],
      rows: sorted.map((x) => {
        const e = at(rate.cents, x);
        return [short(x), fmt(x.kwh100, 0), fmtMoney(e.costMonth, { cents: true }), `${fmt(e.costPerMile * 100, 1)}¢`];
      }),
    },
    notes: [
      `${fmtInt(v.miles)} mi × ${m.kwh100} kWh/100 mi = ${fmtInt(r.kwhMonth)} kWh; × ${fmtCents(rate.cents)} (${info.name} average, ${RATES.period}, EIA) = ${fmtMoney(r.costMonth, { cents: true })}. Gas: ${fmtInt(v.miles)} ÷ ${GAS_MPG_DEFAULT} mpg × $${info.gasoline.toFixed(2)} = ${fmtMoney(r.gasMonth, { cents: true })}.`,
      "EIA's state average includes delivery and fixed customer charges spread over every kWh; your marginal cost for extra kWh may be a little lower. Enter your own rate in the calculator.",
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const d = US / 100;
  const sorted = [...EV_MODELS].sort((a, b) => a.kwh100 - b.kwh100);
  const gasPerMile = US_INFO.gasoline / GAS_MPG_DEFAULT;
  return (
    <>
      <h2>How to calculate EV charging cost</h2>
      <p>
        Home charging cost is <strong>miles × kWh per mile × your price per kWh</strong>. The efficiency figure to use is the EPA&apos;s kWh per
        100 miles from fueleconomy.gov. It is measured from the wall during recharging, so ordinary Level 2 charging losses are already included —
        don&apos;t add them again.
      </p>
      <p>
        <strong>Worked example — 2026 Tesla Model Y Long Range, 1,000 miles a month:</strong> 1,000 × 27 ÷ 100 = 270 kWh. At the U.S. average of{" "}
        {fmtCents(US)}/kWh ({RATES.period}, EIA) that&apos;s {fmtMoney(270 * d, { cents: true })} a month, or {fmt(0.27 * d * 100, 1)}¢ a mile.
        A {GAS_MPG_DEFAULT} mpg gas car on ${US_INFO.gasoline.toFixed(2)} gas costs {fmt(gasPerMile * 100, 1)}¢ a mile — {fmtMoney(gasPerMile * 1000)} for the same
        1,000 miles.
      </p>

      <h2>Charging cost by model</h2>
      <table>
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>kWh / 100 mi</th>
            <th>Per mile</th>
            <th>1,000 mi / month</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr key={m.id}>
              <td>
                <Link href={`/electricity/${SLUG}/${MODEL_SLUGS[m.id]}`}>{m.name}</Link>
              </td>
              <td>{m.kwh100}</td>
              <td>{fmt(m.kwh100 * d, 1)}¢</td>
              <td>{fmtMoney(m.kwh100 * 10 * d, { cents: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        EPA combined figures, re-checked on fueleconomy.gov in October 2026. Wheel size and trim change them: a Model Y on 19-inch wheels is
        rated 26 kWh/100 mi against 24 on 18-inch wheels. The F-150 Lightning&apos;s last model year is 2025.
      </p>

      <h2>Level 1 or Level 2?</h2>
      <p>
        DOE&apos;s Alternative Fuels Data Center puts Level 1 (a 120 V outlet) at about 1.9 kW — roughly 5 miles of range per hour — and
        residential Level 2 (240 V) typically up to 7.2 kW, about 25 miles per hour. Level 2 covers a 1,000-mile month in well under two hours a
        night. Level 1 is slower and somewhat less efficient; fueleconomy.gov puts charging efficiency at 84–93%, so the calculator adds{" "}
        {fmt(L1_EXTRA_LOSS * 100, 0)}% for Level 1 as an estimate. A Level 2 charger idles at about 7 W (ENERGY STAR average) — around 60 kWh a
        year.
      </p>

      <h2>Your rate plan matters more than the charger</h2>
      <p>
        State averages from EIA include delivery and fixed charges. Many utilities sell cheaper overnight power on time-of-use or EV plans:
        PG&amp;E&apos;s EV2-A off-peak price is 23¢/kWh against a 54¢ summer peak (4–9 pm); FPL&apos;s time-of-use plan prices off-peak hours around 9¢. Peak
        windows such as 4–9 pm are when charging costs the most, so schedule the car or charger to start later. The calculator has these plans
        as one-tap rates, or enter your own.
      </p>

      <h2>No federal credits in 2026</h2>
      <p>
        The IRS clean vehicle credit (30D) ended for vehicles acquired after September 30, 2025, and the charger credit (30C) for equipment
        placed in service after June 30, 2026. Utility rebates for chargers and EV rate plans are where savings remain.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>Adding 10–15% losses on top of the EPA figure.</strong> For Level 2 they&apos;re already in it.
        </li>
        <li>
          <strong>Using battery size to price a &quot;fill-up.&quot;</strong> Use miles driven instead; you rarely charge from empty to full.
        </li>
        <li>
          <strong>Forgetting public charging.</strong> Fast-charging networks set their own prices per kWh or per minute; if you rely on them,
          price those miles separately with the network&apos;s rate.
        </li>
        <li>
          <strong>Using a stale gas price.</strong> Each state page uses EIA&apos;s weekly regular gasoline price for that state or region.
        </li>
      </ul>
      <p>
        See every state&apos;s price on <Link href="/electricity/electricity-rates-by-state">electricity rates by state</Link>, or check whether{" "}
        <Link href="/solar">solar panels</Link> could cover your charging.
      </p>
    </>
  );
}

export const evChargingCalculator: CalculatorEntry<EvValues> = {
  meta: {
    slug: SLUG,
    category: "electricity",
    name: "EV Charging Cost Calculator",
    shortName: "EV charging",
    h1: "EV Charging Cost Calculator",
    metaTitle: "EV Charging Cost Calculator: Home Charging vs Gas (2026)",
    metaDescription: `Home charging cost for 15 popular EVs at your state's 2026 rate: a Model Y at 1,000 mi/month is ${fmtMoney(27 * 10 * (US / 100), { cents: true })} at the U.S. average. Per mile vs gas, Level 1 vs 2.`,
    summary:
      "Choose your EV (EPA efficiency from fueleconomy.gov), miles and charger, and see the monthly cost to charge at home at your state's rate or an off-peak EV plan — plus cost per mile, charging time and savings versus gas at your state's pump price.",
    outputs: ["Monthly charging cost", "Cost per mile", "vs gasoline", "Level 1 vs 2"],
    faq: [
      { q: "How much does it cost to charge an EV at home?", a: `At the U.S. average of ${fmtCents(US)}/kWh, an EV using 30 kWh per 100 miles costs ${fmt(30 * (US / 100), 1)}¢ a mile — ${fmtMoney(300 * (US / 100), { cents: true })} for 1,000 miles a month. Efficient sedans use 24–27 kWh/100 mi; big trucks 43–48.` },
      { q: "How much does it cost to charge a Tesla Model Y?", a: `The 2026 Model Y Long Range AWD is rated 27 kWh/100 mi, so 1,000 miles takes 270 kWh — ${fmtMoney(270 * (US / 100), { cents: true })} at the U.S. average price. The Standard RWD (24 kWh/100 mi) uses about 11% less.` },
      { q: "Is charging an EV cheaper than buying gas?", a: `Usually. At U.S. averages a 27 kWh/100 mi EV costs ${fmt(27 * (US / 100), 1)}¢ a mile versus ${fmt((US_INFO.gasoline / GAS_MPG_DEFAULT) * 100, 1)}¢ for a ${GAS_MPG_DEFAULT} mpg car on $${US_INFO.gasoline.toFixed(2)} gas. In the states with the highest electricity prices the gap narrows unless you charge on an off-peak plan.` },
      { q: "Does Level 1 or Level 2 charging cost more?", a: "Per mile, Level 1 costs slightly more because more energy is lost as heat; we add about 10% as an estimate. The bigger difference is time: about 5 miles of range per hour on Level 1 versus about 25 on Level 2 (DOE AFDC)." },
      { q: "Should I add charging losses to the EPA kWh per 100 miles?", a: "Not for Level 2. EPA's kWh/100 mi is measured from the wall while recharging, so normal charging losses are already included. Add some only for slow Level 1 charging." },
      { q: "Are there federal tax credits for EVs or home chargers in 2026?", a: "No. The new clean vehicle credit (30D) ended for vehicles acquired after Sept 30, 2025, and the charger credit (30C) for chargers placed in service after June 30, 2026. Check your utility for rebates." },
    ],
    sources: [SOURCES.eiaMonthly, SOURCES.fuelEconomy, SOURCES.afdc, SOURCES.eiaGasoline, SOURCES.epaTrends, SOURCES.utilityRates, SOURCES.esOther, SOURCES.irs, SOURCES.eia861m],
    related: ["electricity/electricity-rates-by-state", "solar/solar-panel-calculator", "electricity/electricity-cost-calculator", "solar/solar-payback-calculator"],
    updated: ELECTRICITY_CHECKED,
    keywords: ["ev charging cost", "cost to charge tesla", "electric car charging cost", "level 2 charging cost", "ev vs gas", "charging cost per mile"],
    featured: true,
  },
  Calculator: EvChargingCalculator,
  Content,
  presets: EV_PRESETS,
  presetAnswer,
  PresetExtra: stateExtra(SLUG),
};
