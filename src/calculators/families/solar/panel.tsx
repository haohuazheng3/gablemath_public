import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computePanels, panelAreaFt2 } from "./compute";
import { COST_PER_W_US, DEFAULT_PANEL_W, MEDIAN_KW, ROOF_SHARE_MEDIAN, SOLAR_CHECKED, SYSTEM_LOSSES_PCT, US_TYPICAL, solarSources, stateSolar } from "./data";
import PanelCalculator from "./PanelCalculator";
import { PANEL_DEFAULTS, computePanelCalc, type PanelValues } from "./panel-model";

const SLUG = "solar-panel-calculator";
const BASE = `/solar/${SLUG}`;
const PAYBACK = "/solar/solar-payback-calculator";

/* ───────── presets: monthly use ───────── */

const USE_NOTES: Record<number, string> = {
  500: "500 kWh a month is a small home, condo or efficient household — well under the 2025 U.S. average of 874 kWh.",
  750: "750 kWh a month is a little below average: a mid-size home with gas heat or a mild climate.",
  1000: "1,000 kWh a month is above the U.S. average and typical of southern homes with central air.",
  1500: "1,500 kWh a month usually means a large home, electric heat, a pool pump or an EV on top of normal use.",
  2000: "2,000 kWh a month is a large all-electric home, or one charging two EVs; check roof space and the 25 kW net-metering limit many states use.",
};

const COMPARE = ["AZ", "CA", "TX", "FL", "NC", "NY", "MA", "IL", "WA"];

export const PANEL_PRESETS: Preset<PanelValues>[] = [500, 750, 1000, 1500, 2000].map((kwh) => {
  const v: PanelValues = { ...PANEL_DEFAULTS, kwh };
  const r = computePanelCalc(v);
  return {
    slug: `${kwh}-kwh-per-month`,
    values: v,
    group: "By monthly use",
    label: `${fmtInt(kwh)} kWh/month`,
    h1: `How many solar panels do I need for ${fmtInt(kwh)} kWh a month?`,
    metaTitle: `Solar Panels for ${fmtInt(kwh)} kWh a Month: Size & Count`,
    metaDescription: `${fmtInt(kwh)} kWh a month takes about ${fmt(r.kw, 1)} kW of solar — ${fmtInt(r.panels)} × 440-W panels and ~${fmtInt(r.roofFt2)} sq ft of roof at a typical U.S. site. See your state.`,
  };
});

function presetAnswer(v: PanelValues): PresetAnswer {
  const r = computePanelCalc(v);
  const s = stateSolar(v.state);
  const where = s.code === "US" ? `a typical U.S. location (median state, ${fmtInt(s.yield)} kWh per kW a year)` : `${s.name} (${fmtInt(s.yield)} kWh per kW a year)`;
  const cmp = COMPARE.map((c) => {
    const x = stateSolar(c);
    return { x, p: computePanels({ monthlyKwh: v.kwh, yieldKwhPerKw: x.yield, offsetPct: v.offset, panelW: DEFAULT_PANEL_W, psh: x.psh }) };
  });
  const rows = cmp.map(({ x, p }) => [x.name, fmtInt(x.yield), fmt(p.kw, 1), fmtInt(p.panels), fmtInt(p.roofFt2)]);
  const az = cmp[0].p.panels;
  const wa = cmp[cmp.length - 1].p.panels;
  const lo = r.byWattage[0];
  const hi = r.byWattage[r.byWattage.length - 1];
  return {
    headline: `To cover ${fmtInt(v.kwh)} kWh a month (${fmtInt(r.annualUse)} kWh a year) at ${where}, you need about ${fmt(r.kw, 1)} kW — ${fmtInt(r.panels)} × ${v.panelW}-W panels on roughly ${fmtInt(r.roofFt2)} sq ft of roof.`,
    bullets: [
      `Math: ${fmtInt(r.annualUse)} kWh ÷ ${fmtInt(s.yield)} kWh per kW = ${fmt(r.kwNeeded, 2)} kW, rounded up to ${fmtInt(r.panels)} whole ${v.panelW}-W panels (${fmt(r.kw, 2)} kW).`,
      `Production: about ${fmtInt(r.annualProd)} kWh a year, ${fmtInt(r.monthlyProd)} a month on average — more in summer, less in winter.`,
      `Panel size matters: ${fmtInt(lo.panels)} × ${lo.w}-W or ${fmtInt(hi.panels)} × ${hi.w}-W panels do the same job.`,
      `Typical price: about ${fmtMoney(r.kw * 1000 * COST_PER_W_US)} at the $${fmt(COST_PER_W_US, 2)}/W national median, with no federal credit for a 2026 purchase.`,
      USE_NOTES[v.kwh] ?? "",
    ].filter(Boolean),
    table: {
      caption: `${fmtInt(v.kwh)} kWh a month in different states (440-W panels, ${v.offset}% offset)`,
      columns: ["State", "kWh per kW", "System kW", "Panels", "Roof sq ft"],
      rows,
    },
    notes: [
      `Location changes the answer by about ${fmt(az > 0 ? (wa / az - 1) * 100 : 0, 0)}%: the same ${fmtInt(v.kwh)} kWh takes ${fmtInt(az)} panels in Arizona but ${fmtInt(wa)} in Washington. ${r.kw > MEDIAN_KW.energysage ? `At ${fmt(r.kw, 1)} kW this is bigger than the 12 kW median system quoted on EnergySage in 2026.` : r.kw < MEDIAN_KW.lbnl ? `At ${fmt(r.kw, 1)} kW this is smaller than the 7.7 kW median U.S. install (Berkeley Lab, 2025).` : `At ${fmt(r.kw, 1)} kW this sits between the 7.7 kW median install (Berkeley Lab) and the 12 kW median quote (EnergySage).`}`,
      `Sun-hours check: ${fmtInt(v.kwh)} kWh a month is ${fmt(r.annualUse / 365, 1)} kWh a day. With ${fmt(s.psh, 2)} peak sun hours and the ${fmt(r.impliedDerate, 2)} derate factor implied by the modeled yield (losses, inverter, heat), ${fmt(r.annualUse / 365, 1)} ÷ (${fmt(s.psh, 2)} × ${fmt(r.impliedDerate, 2)}) = ${fmt(r.kwNeeded, 2)} kW — the same answer.`,
      `Where exports earn less than retail (California, Arizona, Utah, Georgia and others), many installers size to about 70% of use: ${fmt(computePanelCalc({ ...v, offset: 70 }).kw, 1)} kW here. Run the numbers in the solar payback calculator.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const ex = computePanelCalc({ ...PANEL_DEFAULTS, kwh: 1000 });
  const area440 = panelAreaFt2(440);
  const uses = [500, 1000, 1500, 2000];
  return (
    <>
      <h2>How to size a solar system</h2>
      <p>
        Solar is sized by energy, not by roof or house size. Add up a year of kWh from your bills, decide how much of it you want solar to cover, and divide by how many kWh one
        kilowatt of panels makes where you live:
      </p>
      <p>
        <strong>kW needed = annual kWh × offset ÷ kWh per kW per year</strong>, then <strong>panels = kW × 1,000 ÷ panel watts</strong>, rounded up.
      </p>
      <p>
        <strong>Worked example:</strong> 1,000 kWh a month is 12,000 kWh a year. A typical U.S. site makes {fmtInt(US_TYPICAL.yield)} kWh per kW, so 12,000 ÷{" "}
        {fmtInt(US_TYPICAL.yield)} = {fmt(ex.kwNeeded, 2)} kW. With 440-W panels that is {fmt(ex.kwNeeded * 1000, 0)} ÷ 440 = {fmt(ex.kwNeeded / 0.44, 1)} →{" "}
        <strong>{fmtInt(ex.panels)} panels</strong> ({fmt(ex.kw, 2)} kW), producing about {fmtInt(ex.annualProd)} kWh a year.
      </p>

      <h2>Find your real usage first</h2>
      <p>
        Your bill lists kWh used each month; many utilities also show a 12-month history online. Add up all twelve months rather than doubling a summer or winter bill. If
        you only know your dollar total, divide it by your all-in price per kWh — the calculator does this in &ldquo;Monthly bill&rdquo; mode using your state&apos;s 2026
        average. For scale: the U.S. average home used 874 kWh a month in 2025, from {fmtInt(stateSolar("CA").avgKwh)} in California to{" "}
        {fmtInt(stateSolar("LA").avgKwh)} in Louisiana.
      </p>

      <h2>Where the kWh-per-kW numbers come from</h2>
      <p>
        Each state uses a representative city modeled for a fixed roof at 20° tilt facing south with {SYSTEM_LOSSES_PCT}% system losses (wiring, soiling, shading, heat and
        inverter) — the defaults of PVWatts v8 from the National Laboratory of the Rockies (formerly NREL). Ten states come straight from PVWatts; the rest use the European
        PVGIS model, which landed within about 7% of PVWatts where both were run. Results range from about {fmtInt(stateSolar("WA").yield)} kWh per kW in Seattle to{" "}
        {fmtInt(stateSolar("NM").yield)} in Albuquerque.
      </p>
      <p>
        <strong>Peak sun hours</strong> are the same idea in different units: the day&apos;s sunlight on the panels expressed as hours at 1,000 W/m². Phoenix averages{" "}
        {fmt(stateSolar("AZ").psh, 2)}, Boston {fmt(stateSolar("MA").psh, 2)}. Sun-hour tables based on 1961–1990 weather data still circulate; the numbers here use the NSRDB
        typical year behind PVWatts v8, or ERA5 data for the PVGIS states.
      </p>

      <h2>Panels needed by monthly use</h2>
      <table>
        <thead>
          <tr>
            <th>Monthly use</th>
            <th>System (U.S. typical)</th>
            <th>440-W panels</th>
            <th>Arizona</th>
            <th>Washington</th>
          </tr>
        </thead>
        <tbody>
          {uses.map((k) => {
            const r = computePanelCalc({ ...PANEL_DEFAULTS, kwh: k });
            const az = computePanels({ monthlyKwh: k, yieldKwhPerKw: stateSolar("AZ").yield, offsetPct: 100, panelW: 440, psh: 0 });
            const wa = computePanels({ monthlyKwh: k, yieldKwhPerKw: stateSolar("WA").yield, offsetPct: 100, panelW: 440, psh: 0 });
            return (
              <tr key={k}>
                <td>
                  <Link href={`${BASE}/${k}-kwh-per-month`}>{fmtInt(k)} kWh</Link>
                </td>
                <td>{fmt(r.kw, 1)} kW</td>
                <td>{fmtInt(r.panels)}</td>
                <td>{fmtInt(az.panels)}</td>
                <td>{fmtInt(wa.panels)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Panel wattage and roof space</h2>
      <p>
        Residential panels in 2026 are mostly 430–460 W and 22–23% efficient; 250–400 W figures in older guides overstate the panel count. A 440-W panel covers about{" "}
        {fmt(area440, 1)} sq ft. Add roughly 25% for fire-code access paths, ridge setbacks and gaps — the calculator divides the panel area by 0.8. Berkeley Lab found
        arrays cover a median {ROOF_SHARE_MEDIAN.oneStory}% of a one-story roof and {ROOF_SHARE_MEDIAN.multiStory}% of a multi-story roof, so south- and west-facing planes
        without shade are what count, not total roof area.
      </p>

      <h2>How much should solar cover?</h2>
      <ul>
        <li>
          <strong>1:1 net metering:</strong> size to about 100% of use. Exports bank credits at the full retail price.
        </li>
        <li>
          <strong>Net billing (California, Arizona, Utah, Georgia, Idaho and others):</strong> exports earn a fraction of retail, so about 70% often pays back faster.
        </li>
        <li>
          <strong>Plan ahead:</strong> an EV or heat pump can add thousands of kWh a year. Adding panels later costs more per watt than sizing for it now.
        </li>
      </ul>

      <h2>Common mistakes</h2>
      <ul>
        <li>Sizing from one summer bill. Use a 12-month total; usage swings a lot by season.</li>
        <li>Using square footage. Two 2,000 sq ft homes can differ by 2× in kWh depending on heating, cooling and appliances.</li>
        <li>Oversizing past 100%. Most utilities pay little for surplus at year-end, and many cap system size at your annual use.</li>
        <li>Forgetting shade and orientation. West-facing arrays produce less in total but more in the evening, which helps under time-of-use rates.</li>
      </ul>
      <p>
        Next: see the cost, 2026 tax-credit status and break-even year in the <Link href={PAYBACK}>solar payback calculator</Link>, or jump to{" "}
        <Link href={`${PAYBACK}/california`}>California</Link>, <Link href={`${PAYBACK}/texas`}>Texas</Link>, <Link href={`${PAYBACK}/florida`}>Florida</Link> or{" "}
        <Link href={`${PAYBACK}/arizona`}>Arizona</Link>. Check your rate on <Link href="/electricity/electricity-rates-by-state">electricity rates by state</Link>.
      </p>
    </>
  );
}

const f1000 = computePanelCalc({ ...PANEL_DEFAULTS, kwh: 1000 });
// EIA RECS 2020: 2,000–2,499 sq ft homes average 12,173 kWh/yr.
const f2000sf = computePanelCalc({ ...PANEL_DEFAULTS, kwh: 12173 / 12 });
const azAvg = computePanelCalc({ ...PANEL_DEFAULTS, state: "AZ", kwh: stateSolar("AZ").avgKwh });
const perPanelDay = (440 / 1000) * (US_TYPICAL.yield / 365);

export const solarPanelCalculator: CalculatorEntry<PanelValues> = {
  meta: {
    slug: SLUG,
    category: "solar",
    name: "Solar Panel Calculator",
    shortName: "Solar panels needed",
    h1: "Solar Panel Calculator: How Many Panels Do I Need?",
    metaTitle: "Solar Panel Calculator: How Many Panels Do I Need?",
    metaDescription: `Size a solar system from your kWh or bill and state sun data. 1,000 kWh/month takes about ${fmt(f1000.kw, 1)} kW (${fmtInt(f1000.panels)} × 440-W panels) at a typical U.S. site.`,
    summary: "Enter your monthly kWh or bill and your state to get the system size in kW, how many panels, how much roof they need and how much they will produce.",
    outputs: ["System kW", "Panel count", "Roof area", "Annual production", "Offset %"],
    faq: [
      {
        q: "How many solar panels do I need for a 2,000 sq ft house?",
        a: `Homes of 2,000–2,499 sq ft use about 12,173 kWh a year on average (EIA RECS), which takes about ${fmt(f2000sf.kw, 1)} kW — ${fmtInt(f2000sf.panels)} × 440-W panels at a typical U.S. site. Your own bills matter more than square footage.`,
      },
      {
        q: "How many kWh does a 440-watt solar panel produce per day?",
        a: `About ${fmt(perPanelDay, 2)} kWh a day (${fmtInt(perPanelDay * 365)} a year) at a typical U.S. location after ${SYSTEM_LOSSES_PCT}% losses — from about 1.3 kWh in Seattle to 2.1 kWh in the Southwest.`,
      },
      {
        q: "How many solar panels to power a house in Arizona?",
        a: `An average Arizona home uses ${fmtInt(stateSolar("AZ").avgKwh)} kWh a month (EIA 2025). At ${fmtInt(stateSolar("AZ").yield)} kWh per kW, covering 100% takes about ${fmt(azAvg.kw, 1)} kW, or ${fmtInt(azAvg.panels)} × 440-W panels; with Arizona's net billing many owners size to about 70%.`,
      },
      {
        q: "What are peak sun hours?",
        a: `The day's sunlight on the panels expressed as hours of 1,000 W/m². U.S. states range from about ${fmt(stateSolar("AK").psh, 1)} (Alaska) to ${fmt(stateSolar("NM").psh, 1)} (New Mexico) on a 20° south-facing roof.`,
      },
      {
        q: "How much roof space do I need for solar panels?",
        a: `A 440-W panel is about ${fmt(panelAreaFt2(440), 1)} sq ft. Allow about 27 sq ft per panel including setbacks, so a ${fmt(f1000.kw, 1)} kW, ${fmtInt(f1000.panels)}-panel system needs roughly ${fmtInt(f1000.roofFt2)} sq ft of unshaded roof.`,
      },
      {
        q: "How long do solar panels last and how much do they degrade?",
        a: "Panels typically lose about 0.5% of output a year (0.88% in hot-climate fleet data), and 2026 top-brand warranties guarantee 85–93.8% of rated output after 25 years.",
      },
    ],
    sources: solarSources("pvwatts", "pvgis", "esPanels", "lbnl", "eia861", "eiaEpm", "esReport", "esIncent", "osti"),
    related: ["solar/solar-payback-calculator", "electricity/electricity-rates-by-state", "electricity/ev-charging-cost-calculator", "roofing/roofing-calculator", "solar/solar-battery-calculator", "electricity/electric-bill-calculator"],
    updated: SOLAR_CHECKED,
    keywords: ["how many solar panels", "solar system size", "solar calculator", "kw solar", "peak sun hours", "solar panels for house"],
    featured: true,
  },
  Calculator: PanelCalculator,
  Content,
  presets: PANEL_PRESETS,
  presetAnswer,
};
