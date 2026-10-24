"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { FieldSection, NumberField, Segmented, SelectField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt, fmtMoney, fmtMoneyPrecise, fmtPct } from "@/lib/format";
import { annualCost, centsFor, fmtCents, ratesRanked, stateInfo, usageCost } from "./compute";
import { COST_DEFAULTS, computeCostCalc, valuesForAppliance, type CostValues } from "./cost-model";
import { APPLIANCES, LABEL_CENTS, RATES, appliance } from "./data";
import { CostTable, Disclosure, RateFields, RateNote, TipList } from "./ui";

const CALC_KEY = "electricity/electricity-cost-calculator";

export default function ElectricityCostCalculator({ initial }: { initial?: Partial<CostValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, COST_DEFAULTS, initial);
  const c = useMemo(() => computeCostCalc(v), [v]);
  const a = c.appliance;
  const info = stateInfo(v.state);
  const mode = c.rate.mode === "month" ? "month" : "ytd";
  const name = a?.name ?? (c.annual ? `Appliance rated ${fmt(v.kwhYear, 0)} kWh/yr` : `${fmt(c.watts, 0)} W appliance`);

  const compare = useMemo(() => {
    const ranked = ratesRanked(mode);
    const at = (cents: number) =>
      c.annual
        ? annualCost(v.kwhYear, cents, v.qty)
        : usageCost({ kw: c.watts / 1000, hoursPerDay: v.hours, dutyPct: v.duty, daysPerMonth: v.days, monthsPerYear: v.months, qty: v.qty }, cents);
    const lo = ranked[ranked.length - 1];
    const hi = ranked[0];
    return [
      { label: c.rate.mode === "custom" ? "Your rate" : c.rate.name, cents: c.rate.cents, cost: c.cost },
      ...(c.rate.code === "US" && c.rate.mode !== "custom" ? [] : [{ label: "U.S. average", cents: centsFor(RATES.us, mode), cost: c.usCost }]),
      { label: `${lo.state} (cheapest)`, cents: centsFor(lo, mode), cost: at(centsFor(lo, mode)) },
      { label: `${hi.state} (most expensive)`, cents: centsFor(hi, mode), cost: at(centsFor(hi, mode)) },
    ];
  }, [c, mode, v]);

  const shareOfHome = info.kwh > 0 ? c.cost.kwhMonth / info.kwh : 0;
  const tips = [
    ...(a ? [a.tip] : []),
    c.annual
      ? `EnergyGuide labels price electricity at ${LABEL_CENTS}¢/kWh; at your ${fmtCents(c.rate.cents)} the real yearly cost is ${fmtMoney(c.cost.perYear)}, not ${fmtMoney(v.kwhYear * Math.max(1, v.qty) * (LABEL_CENTS / 100))}.`
      : "Nameplate watts are a maximum. For anything with a thermostat or compressor, a plug-in meter (Kill A Watt type, up to 15 A) shows the real kWh over a few days.",
    "Always-on loads run 8,760 hours a year: every 10 W of standby is about 88 kWh.",
  ];

  const items: ShoppingItem[] = [
    { id: "energy-month", name: `${name} — electricity per month`, qty: Math.round(c.cost.kwhMonth * 10) / 10, unit: "kWh", cost: c.cost.perMonth, note: `at ${fmtCents(c.rate.cents)}/kWh` },
  ];

  return (
    <CalcFrame
      showUnitToggle={false}
      dock={{ label: "Costs", value: `${fmtMoney(c.cost.perMonth, { cents: true })}/mo` }}
      inputs={
        <>
          <FieldSection title="What are you running?">
            <SelectField
              label="Appliance"
              value={v.appliance}
              onChange={(id) => {
                const pick = appliance(id);
                set(pick ? valuesForAppliance(pick) : { appliance: "custom" });
              }}
              options={[{ value: "custom", label: "My own wattage or label" }, ...APPLIANCES.map((x) => ({ value: x.id, label: x.name, group: x.group }))]}
              help={a ? `${a.estimate ? "Typical — check your label. " : ""}${a.basis}.` : "Pick an appliance for typical figures, or enter the numbers from its label."}
            />
            <Segmented
              label="Rated by"
              value={v.input}
              options={[
                { value: "watts", label: "Watts" },
                { value: "amps", label: "Amps × volts" },
                { value: "label", label: "kWh per year" },
              ]}
              onChange={(input) => set({ input })}
            />
            {v.input === "watts" ? (
              <NumberField label="Power" value={v.watts} onChange={(watts) => set({ watts, appliance: "custom" })} suffix="W" step={50} max={50000} decimals={1} stepper={false} help="On the label or plate, often near the cord. 1 kW = 1,000 W." />
            ) : v.input === "amps" ? (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Amps" value={v.amps} onChange={(amps) => set({ amps, appliance: "custom" })} suffix="A" step={0.5} max={100} decimals={2} stepper={false} />
                <Segmented label="Volts" value={v.volts} options={[{ value: 120, label: "120 V" }, { value: 240, label: "240 V" }]} onChange={(volts) => set({ volts })} />
                <p className="col-span-2 -mt-1 text-[0.78rem] leading-snug text-ink-3">
                  {fmt(c.watts, 0)} W. Nameplate amps are a maximum, so this is an upper bound.
                </p>
              </div>
            ) : (
              <NumberField label="Energy use" value={v.kwhYear} onChange={(kwhYear) => set({ kwhYear, appliance: "custom" })} suffix="kWh/yr" step={10} max={100000} decimals={1} stepper={false} help="The big number on the yellow EnergyGuide label, or the ENERGY STAR listing." />
            )}
          </FieldSection>

          {c.annual ? null : (
            <FieldSection title="How you use it">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Hours a day" value={v.hours} onChange={(hours) => set({ hours })} step={0.5} max={24} decimals={2} />
                <NumberField label="Days a month" value={v.days} onChange={(days) => set({ days })} step={1} max={31} decimals={2} />
              </div>
            </FieldSection>
          )}

          <Disclosure label="Duty cycle, season & quantity">
            {c.annual ? null : (
              <>
                <NumberField
                  label="Time at full power"
                  value={v.duty}
                  onChange={(duty) => set({ duty })}
                  suffix="%"
                  step={5}
                  max={100}
                  decimals={0}
                  help="100% for kettles, hair dryers and chargers. Thermostat heaters, fridges and AC compressors cycle on and off."
                />
                <NumberField label="Months a year in use" value={v.months} onChange={(months) => set({ months })} step={1} max={12} decimals={0} help="Lower it for seasonal loads like heaters, fans or a pool." />
              </>
            )}
            <NumberField label="How many of them?" value={v.qty} onChange={(qty) => set({ qty: Math.max(1, Math.round(qty)) })} step={1} min={1} max={500} decimals={0} />
          </Disclosure>

          <RateFields state={v.state} rateMode={v.rateMode} cents={v.cents} onChange={(p) => set(p)} />
        </>
      }
      results={
        <>
          <ResultHero
            label={`${name} costs`}
            value={fmtMoney(c.cost.perMonth, { cents: true })}
            unit="a month"
            sub={
              <>
                {fmt(c.cost.kwhMonth, 1)} kWh a month · {fmtMoney(c.cost.perYear)} a year
                {c.annual ? "" : ` · ${fmtMoneyPrecise(c.cost.perHour)} per hour of use`}
              </>
            }
          />
          <RateNote state={v.state} rateMode={v.rateMode} cents={v.cents} />
          <StatGrid
            stats={[
              { label: c.annual ? "Per hour (24/7 average)" : "Per hour of use", value: fmtMoneyPrecise(c.cost.perHour), hint: `${fmt(c.cost.kwhHour, 3)} kWh` },
              { label: "Per day", value: fmtMoneyPrecise(c.cost.perDay), hint: `${fmt(c.cost.kwhDay, 2)} kWh` },
              { label: "Per year", value: fmtMoney(c.cost.perYear), hint: `${fmt(c.cost.kwhYear, 0)} kWh`, emphasis: true },
              { label: `Share of a typical ${info.code === "US" ? "U.S." : info.name} home`, value: fmtPct(shareOfHome, shareOfHome < 0.1 ? 1 : 0), hint: `of ${fmt(info.kwh, 0)} kWh a month (EIA 2025)` },
            ]}
          />
          <CostTable cost={c.cost} hourLabel={c.annual ? "Per hour (avg)" : "Per hour of use"} />

          <ResultsHeading>Same use, other rates</ResultsHeading>
          <OptionTable
            caption="Cost at other electricity prices"
            columns={["Where", "¢/kWh", "Month", "Year"]}
            highlight={0}
            rows={compare.map((r) => [r.label, fmt(r.cents, 2), fmtMoney(r.cost.perMonth, { cents: true }), fmtMoney(r.cost.perYear)])}
          />

          {a?.estimate ? (
            <Callout tone="warn" title="Typical value, not your appliance">
              {a.basis}. Read the label (watts, or amps × volts) or measure it for a few days with a plug-in meter for a real figure.
            </Callout>
          ) : null}
          {a?.calc ? (
            <Callout tone="info" title="There's a dedicated calculator">
              <Link href={`/${a.calc}`} className="font-semibold text-accent underline-offset-2 hover:underline">
                Open the {a.calc.split("/")[1].replace(/-/g, " ")}
              </Link>{" "}
              for sizes, efficiency ratings and climate-based run times.
            </Callout>
          ) : null}
          <TipList tips={tips} />
          <ShoppingList title="Energy budget" items={items} calcKey={CALC_KEY} />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Electricity cost",
            title: `${name} at ${fmtCents(c.rate.cents)}/kWh`,
            summary: `${fmtMoney(c.cost.perMonth, { cents: true })} a month, ${fmtMoney(c.cost.perYear)} a year (${fmt(c.cost.kwhYear, 0)} kWh)`,
            items,
          })}
        />
      }
    />
  );
}
