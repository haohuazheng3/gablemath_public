"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { FieldSection, NumberField, Segmented } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { dehumidifierIef, dehumidifierWatts, fmtCents, usageCost } from "./compute";
import { DAYS_PER_MONTH, DEHUM_PINTS, DEHUM_RATING_CROSSWALK, dehumMinIef } from "./data";
import { DEHUM_DEFAULTS, computeDehumCalc, type DehumValues } from "./dehumidifier-model";
import { CostTable, Disclosure, RateFields, RateNote, TipList } from "./ui";

const CALC_KEY = "electricity/dehumidifier-cost-calculator";
const DUTY = [
  { value: 100, label: "Nonstop", sub: "24/7 worst case" },
  { value: 75, label: "Damp", sub: "75%" },
  { value: 50, label: "Cycling", sub: "50%" },
  { value: 25, label: "Light", sub: "25%" },
];
const COMPARE_PINTS = [20, 30, 35, 50];

export default function DehumidifierCalculator({ initial }: { initial?: Partial<DehumValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, DEHUM_DEFAULTS, initial);
  const c = useMemo(() => computeDehumCalc(v), [v]);
  const { cost, rate } = c;
  const wholeHome = v.kind === "wholehome";
  const name = `${fmt(v.pints, 0)}-pint ${wholeHome ? "whole-home" : "portable"} dehumidifier`;
  const esIef = dehumidifierIef(c.pints, wholeHome, "es", 0);
  const minIef = dehumMinIef(c.pints, wholeHome);

  const items: ShoppingItem[] = [
    { id: "dehum-month", name: `${name} — electricity per month`, qty: Math.round(cost.kwhMonth), unit: "kWh", cost: cost.perMonth, note: `${fmt(v.hours)} h/day, compressor ${fmt(v.duty, 0)}% · ${fmtCents(rate.cents)}/kWh` },
  ];

  return (
    <CalcFrame
      showUnitToggle={false}
      dock={{ label: "Per month", value: fmtMoney(cost.perMonth, { cents: true }) }}
      inputs={
        <>
          <FieldSection title="Your dehumidifier">
            <Segmented
              label="Type"
              value={wholeHome ? "wholehome" : "portable"}
              options={[
                { value: "portable", label: "Portable" },
                { value: "wholehome", label: "Whole-home (ducted)" },
              ]}
              onChange={(kind) => set({ kind, ...(kind === "wholehome" && v.pints < 60 ? { pints: 70 } : {}) })}
            />
            <Segmented label="Capacity" columns={4} value={DEHUM_PINTS.includes(v.pints) ? v.pints : -1} options={DEHUM_PINTS.map((p) => ({ value: p, label: `${p}`, sub: "pints/day" }))} onChange={(pints) => pints > 0 && set({ pints })} />
            <NumberField label="Exact capacity" value={v.pints} onChange={(pints) => set({ pints })} suffix="pints/day" step={5} min={1} max={250} decimals={0} />
            <Segmented
              label="Capacity on the box is rated by"
              value={v.rating === "2012" ? "2012" : "2019"}
              options={[
                { value: "2019", label: "Current test", sub: "made 2019 or later" },
                { value: "2012", label: "Older test", sub: "before mid-2019" },
              ]}
              onChange={(rating) => set({ rating })}
              help={`Since June 2019 DOE tests at 65°F instead of 80°F, so the same machine is rated lower: an old ${DEHUM_RATING_CROSSWALK[1].old}-pint ≈ a new ${DEHUM_RATING_CROSSWALK[1].now}-pint.`}
            />
          </FieldSection>

          <FieldSection title="How it runs">
            <Segmented label="Compressor on" columns={4} value={DUTY.some((d) => d.value === v.duty) ? v.duty : -1} options={DUTY} onChange={(duty) => duty > 0 && set({ duty })} help="Set to a humidistat (about 50% RH) the compressor cycles off once the air is dry; how often depends on how damp the space is." />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Hours plugged in a day" value={v.hours} onChange={(hours) => set({ hours })} step={1} max={24} decimals={1} />
              <NumberField label="Months a year" value={v.months} onChange={(months) => set({ months })} step={1} max={12} decimals={0} />
            </div>
          </FieldSection>

          <Disclosure label="Efficiency (IEF) & number of units">
            <Segmented
              label="Integrated Energy Factor"
              value={v.iefMode}
              options={[
                { value: "es", label: "ENERGY STAR", sub: `${fmt(esIef, 2)} L/kWh` },
                { value: "min", label: "Federal min", sub: `${fmt(minIef, 2)} L/kWh` },
                { value: "custom", label: "My IEF", sub: "from label" },
              ]}
              onChange={(iefMode) => set({ iefMode })}
              help={c.pints > 50 && !wholeHome ? "Above 50 pints the federal minimum (2.80) is higher than the ENERGY STAR average for smaller units, so we use the minimum." : "Liters of water removed per kWh — higher is better."}
            />
            {v.iefMode === "custom" ? <NumberField label="IEF" value={v.ief} onChange={(ief) => set({ ief })} suffix="L/kWh" step={0.1} min={0.1} max={6} decimals={2} /> : null}
            <NumberField label="How many units?" value={v.qty} onChange={(qty) => set({ qty: Math.max(1, Math.round(qty)) })} step={1} min={1} max={10} decimals={0} />
          </Disclosure>

          <RateFields state={v.state} rateMode={v.rateMode} cents={v.cents} onChange={(p) => set(p)} />
        </>
      }
      results={
        <>
          <ResultHero
            label={`${name} costs`}
            value={fmtMoney(cost.perMonth, { cents: true })}
            unit="a month"
            sub={
              <>
                {fmtInt(c.watts)} W while the compressor runs · {fmtMoney(cost.perYear)} for {fmt(v.months, 0)} month{v.months === 1 ? "" : "s"}
              </>
            }
          />
          <RateNote state={v.state} rateMode={v.rateMode} cents={v.cents} />
          <StatGrid
            stats={[
              { label: "Per hour running", value: fmtMoneyPrecise((c.watts / 1000) * (rate.cents / 100) * Math.max(1, v.qty)), hint: `${fmt(c.watts / 1000, 3)} kW`, emphasis: true },
              { label: "Per day", value: fmtMoneyPrecise(cost.perDay), hint: `${fmt(cost.kwhDay, 1)} kWh` },
              { label: "Water removed", value: fmt(c.pints / 8, 1), unit: "gal/day", hint: `rated ${fmt(c.pints, 0)} pints at 65°F test` },
              { label: "Efficiency", value: fmt(c.ief, 2), unit: "L/kWh", hint: v.iefMode === "es" ? "ENERGY STAR average" : v.iefMode === "min" ? "federal minimum" : "your label" },
            ]}
          />
          {v.duty === 100 ? (
            <Callout tone="tip" title="With a humidistat">
              If the compressor runs a quarter to three-quarters of the time, expect {fmtMoney(c.band[0], { cents: true })}–{fmtMoney(c.band[1], { cents: true })} a month.
            </Callout>
          ) : null}
          {v.rating === "2012" ? (
            <Callout tone="info" title="Re-rated capacity">
              A {fmt(v.pints, 0)}-pint rating on the old 80°F test is about {fmt(c.pints, 0)} pints on today&apos;s 65°F test, which is what the efficiency figures use.
            </Callout>
          ) : null}
          <CostTable cost={cost} hourLabel="Per hour plugged in" yearLabel={`Per ${fmt(v.months, 0)}-month year`} />

          <ResultsHeading>Other sizes, same use</ResultsHeading>
          <OptionTable
            caption="Monthly cost by capacity"
            columns={["Capacity", "Watts", "Per month"]}
            highlight={COMPARE_PINTS.indexOf(c.pints)}
            rows={COMPARE_PINTS.map((p) => {
              const w = dehumidifierWatts(p, dehumidifierIef(p, false, "es", 0));
              const m = usageCost({ kw: w / 1000, hoursPerDay: v.hours, dutyPct: v.duty, daysPerMonth: DAYS_PER_MONTH, monthsPerYear: v.months, qty: v.qty }, rate.cents);
              return [`${p} pints`, fmtInt(w), fmtMoney(m.perMonth, { cents: true })];
            })}
          />
          <TipList
            tips={[
              "Set the humidistat to about 50% rather than continuous — dry air below that buys nothing.",
              "Run a hose to a floor drain so the unit never stops on a full bucket.",
              "Close basement windows and seal the rim joist; every pint of outside moisture you keep out is one the machine doesn't remove.",
              "A bigger unit at higher IEF can cost less to run than a small one running nonstop.",
            ]}
          />
          <ShoppingList title="Energy budget" items={items} calcKey={CALC_KEY} />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Dehumidifier cost",
            title: name,
            summary: `${fmtMoney(cost.perMonth, { cents: true })} a month at ${fmt(v.duty, 0)}% compressor time, ${fmtCents(rate.cents)}/kWh`,
            items,
          })}
        />
      }
    />
  );
}
