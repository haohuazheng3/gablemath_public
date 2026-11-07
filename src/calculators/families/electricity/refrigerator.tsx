import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { annualCost, fmtCents, ratesRanked } from "./compute";
import { ELECTRICITY_CHECKED, FRIDGES, LABEL_CENTS, RATES, SOURCES } from "./data";
import RefrigeratorCalculator from "./RefrigeratorCalculator";
import { FRIDGE_DEFAULTS, computeFridgeCalc, type FridgeValues } from "./refrigerator-model";
import { fitTitle, usYtdCents } from "./shared";

const SLUG = "refrigerator-cost-calculator";
const US = usYtdCents();
const TOP_FREEZER = FRIDGES.find((f) => f.id === "top-freezer")!;

/* ───────── programmatic presets: one per configuration ───────── */

/** How each type reads in a sentence ("French-door refrigerator"). */
const NOUN: Record<string, string> = {
  "french-door": "French-door refrigerator",
  "top-freezer": "top-freezer refrigerator",
  "side-by-side": "side-by-side refrigerator",
  freezerless: "freezerless refrigerator",
  compact: "mini fridge",
  "wine-cooler": "wine cooler",
  "chest-freezer": "chest freezer",
  "upright-freezer": "upright freezer",
  "compact-freezer": "compact freezer",
};
const nounOf = (id: string) => NOUN[id] ?? "refrigerator";

export const FRIDGE_PRESETS: Preset<FridgeValues>[] = FRIDGES.map((f) => {
  const values: FridgeValues = { ...FRIDGE_DEFAULTS, type: f.id, labelKwh: f.kwhYear };
  const { r } = computeFridgeCalc(values);
  return {
    slug: f.id === "compact" ? "mini-fridge" : f.id,
    values,
    group: f.id.includes("freezer") && f.id !== "top-freezer" ? "Freezers" : "Refrigerators & coolers",
    label: f.short,
    h1: `How much does it cost to run ${f.id === "upright-freezer" ? "an" : "a"} ${nounOf(f.id)}?`,
    metaTitle: fitTitle(`${f.short} Electricity Cost: ${fmtMoney(r.cost.perYear)} a Year (2026)`, `${f.short} Cost to Run: ${fmtMoney(r.cost.perYear)} a Year`),
    metaDescription: `The average new ${nounOf(f.id)} uses ${fmtInt(f.kwhYear)} kWh a year (ENERGY STAR average) — ${fmtMoney(r.cost.perYear)} a year, ${fmtMoney(r.cost.perMonth, { cents: true })} a month at ${fmtCents(US)}/kWh.`,
  };
});

function presetAnswer(v: FridgeValues): PresetAnswer {
  const c = computeFridgeCalc(v);
  const { r, type, rate } = c;
  const ranked = ratesRanked("ytd");
  const vsTop = type.kwhYear - TOP_FREEZER.kwhYear;
  return {
    headline: `The average new ${nounOf(type.id)} uses ${fmtInt(type.kwhYear)} kWh a year — about ${fmtMoney(r.cost.perYear)} a year or ${fmtMoney(r.cost.perMonth, { cents: true })} a month at the U.S. average of ${fmtCents(rate.cents)}/kWh.`,
    bullets: [
      `That's the average of ${fmtInt(type.n)} ENERGY STAR certified ${type.name.toLowerCase()} models: ${fmt(r.cost.kwhDay, 2)} kWh and ${fmtMoneyPrecise(r.cost.perDay)} a day, an average draw of about ${fmtInt((r.cost.kwhDay / 24) * 1000)} W as the compressor cycles.`,
      `Its EnergyGuide label would say ${fmtMoney(r.labelCostYear)} a year — it prices electricity at ${LABEL_CENTS}¢/kWh, not today's ${fmtCents(rate.cents)}.`,
      type.id === "top-freezer"
        ? "Top-freezer models are the most efficient full-size style in the ENERGY STAR list."
        : vsTop > 0
          ? `It uses ${fmtInt(vsTop)} kWh a year more than an average top-freezer model — ${fmtMoney((vsTop * rate.cents) / 100)} a year.`
          : `It uses ${fmtInt(-vsTop)} kWh a year less than an average full-size top-freezer refrigerator.`,
      `In ${ranked[ranked.length - 1].state} it costs ${fmtMoney(annualCost(type.kwhYear, ranked[ranked.length - 1].ytdCents).perYear)} a year; in ${ranked[0].state} ${fmtMoney(annualCost(type.kwhYear, ranked[0].ytdCents).perYear)}.`,
      "An older unit can use much more than these new-model averages — a plug-in meter left on for 2–3 days tells you exactly.",
    ],
    table: {
      caption: `${type.short}: yearly running cost in the cheapest and priciest states`,
      columns: ["State", "¢/kWh", "Per month", "Per year"],
      rows: [...ranked.slice(0, 4), RATES.us, ...ranked.slice(-4)].map((s) => {
        const x = annualCost(type.kwhYear, s.ytdCents);
        return [s.code === "US" ? "U.S. average" : s.state, fmt(s.ytdCents, 2), fmtMoney(x.perMonth, { cents: true }), fmtMoney(x.perYear)];
      }),
    },
    notes: [
      `${fmtInt(type.kwhYear)} kWh × ${fmtCents(rate.cents)} = ${fmtMoney(r.cost.perYear)} a year; ÷ 12 = ${fmtMoney(r.cost.perMonth, { cents: true })} a month. The kWh figure comes from the federal test behind the EnergyGuide label, so it already includes the compressor cycling on and off.`,
      `Prices are EIA's U.S. average for ${RATES.period}; choose your state in the calculator.`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  return (
    <>
      <h2>How much electricity a refrigerator uses</h2>
      <p>
        A refrigerator&apos;s compressor runs on and off all day, so its wattage tells you little. The useful number is the annual energy on the
        yellow EnergyGuide label, measured on the federal test: <strong>kWh per year × your price per kWh = yearly cost</strong>.
      </p>
      <p>
        <strong>Example:</strong> a French-door model at the ENERGY STAR average of 557 kWh a year, at the U.S. average of {fmtCents(US)}/kWh,
        costs {fmtMoney((557 * US) / 100)} a year — {fmtMoney((557 * US) / 1200, { cents: true })} a month, or about{" "}
        {fmtMoneyPrecise((557 * US) / 36500)} a day.
      </p>

      <h2>Average energy use and cost by type</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>kWh / year</th>
            <th>Per month</th>
            <th>Per year</th>
          </tr>
        </thead>
        <tbody>
          {FRIDGES.map((f) => (
            <tr key={f.id}>
              <td>
                <Link href={`/electricity/${SLUG}/${f.id === "compact" ? "mini-fridge" : f.id}`}>{f.name}</Link>
              </td>
              <td>{fmtInt(f.kwhYear)}</td>
              <td>{fmtMoney((f.kwhYear * US) / 1200, { cents: true })}</td>
              <td>{fmtMoney((f.kwhYear * US) / 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Averages of ENERGY STAR certified models at the U.S. average price for {RATES.period}. Side-by-sides use the most per cubic foot;
        top-freezer models the least among full-size styles. The chest-freezer figure comes from a small sample of certified models.
      </p>

      <h2>Don&apos;t trust the label&apos;s dollar figure</h2>
      <p>
        EnergyGuide labels since January 2023 convert kWh to dollars at a national {LABEL_CENTS}¢/kWh, and older labels used even lower prices — one
        compact refrigerator label still on a retailer&apos;s site is priced at a 2001 average of 8.29¢. With electricity averaging{" "}
        {fmtCents(US)} in 2026, multiply the kWh by your own rate instead; the calculator shows both.
      </p>

      <h2>Is your old refrigerator worth replacing?</h2>
      <p>
        The ENERGY STAR averages describe new models. A refrigerator that is 15 or 20 years old, has worn door seals or lives in a hot garage can
        use a great deal more. Measure before you decide: plug it into a meter (a Kill A Watt-type meter handles up to 15 A) for two or three days
        of normal use, divide the kWh by the days and enter it in the calculator&apos;s <em>Plug-in meter</em> mode. It shows the yearly cost
        difference against a new model of the same style, which you can weigh against the price of a replacement.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>Using a nameplate wattage × 24 hours.</strong> Old tables list refrigerators at 725 W; that would be over 6,000 kWh a year, more
          than ten times what a new model uses.
        </li>
        <li>
          <strong>Forgetting the second fridge.</strong> A garage refrigerator or chest freezer runs all year — set the quantity to count it.
        </li>
        <li>
          <strong>Measuring for an hour.</strong> Defrost cycles and door openings vary; measure over days, not minutes.
        </li>
      </ul>
      <p>
        Price every other appliance in your kitchen with the <Link href="/electricity/electricity-cost-calculator">electricity cost calculator</Link>, or
        see your state&apos;s <Link href="/electricity/electricity-rates-by-state">price per kWh</Link>.
      </p>
    </>
  );
}

export const refrigeratorCalculator: CalculatorEntry<FridgeValues> = {
  meta: {
    slug: SLUG,
    category: "electricity",
    name: "Refrigerator Cost Calculator",
    shortName: "Refrigerators & freezers",
    h1: "Refrigerator & Freezer Cost Calculator",
    metaTitle: "Refrigerator Cost Calculator: kWh & Cost per Year (2026)",
    metaDescription: `A typical new French-door fridge uses 557 kWh a year — ${fmtMoney((557 * US) / 100)} at the U.S. average ${fmtCents(US)}/kWh. Any fridge or freezer, label or meter reading.`,
    summary:
      "See what a refrigerator or freezer costs per day, month and year — from ENERGY STAR averages, your EnergyGuide label or a plug-in meter reading — at your state's electricity rate.",
    outputs: ["Cost per month & year", "kWh per day", "Label vs real cost", "Old vs new"],
    faq: [
      { q: "How much does it cost to run a refrigerator per month?", a: `A typical new French-door model (557 kWh a year) costs ${fmtMoney((557 * US) / 1200, { cents: true })} a month at the U.S. average of ${fmtCents(US)}/kWh; a top-freezer model (366 kWh) ${fmtMoney((366 * US) / 1200, { cents: true })}.` },
      { q: "How many kWh does a refrigerator use per day?", a: "About 1.5 kWh for an average new French-door or bottom-freezer model, 1.0 kWh for a top-freezer and 0.7 kWh for a mini fridge, based on ENERGY STAR certified averages. Older units often use more." },
      { q: "How many watts does a refrigerator use?", a: "Averaged over the day, a new full-size fridge draws about 40–75 W as the compressor cycles (366–636 kWh a year). The compressor itself draws more while running, and old tables listing 725 W are far out of date." },
      { q: "Is it worth replacing an old refrigerator?", a: "Measure it first: a plug-in meter over 2–3 days gives its real kWh. Enter that in the calculator to see the yearly cost difference against a new model of the same style." },
      { q: "Does a chest freezer use less than an upright freezer?", a: "In ENERGY STAR data, yes: certified chest freezers average 263 kWh a year against 450 kWh for uprights, which are mostly auto-defrost." },
      { q: "Is the EnergyGuide label cost accurate?", a: `The kWh figure is; the dollars aren't. Labels since 2023 assume ${LABEL_CENTS}¢/kWh (older ones less), while the 2026 U.S. average is ${fmtCents(US)}.` },
    ],
    sources: [SOURCES.esFridges, SOURCES.eiaMonthly, SOURCES.ftcLabel, SOURCES.killAWatt, SOURCES.eiaTechNotes],
    related: ["electricity/electricity-cost-calculator", "electricity/electricity-rates-by-state", "electricity/clothes-dryer-cost-calculator", "electricity/generator-size-calculator"],
    updated: ELECTRICITY_CHECKED,
    keywords: ["refrigerator cost", "fridge kwh per day", "refrigerator watts", "freezer cost", "mini fridge cost", "refrigerator electricity"],
  },
  Calculator: RefrigeratorCalculator,
  Content,
  presets: FRIDGE_PRESETS,
  presetAnswer,
};
