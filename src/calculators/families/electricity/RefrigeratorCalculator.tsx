"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { FieldSection, NumberField, Segmented, SelectField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { fmtCents } from "./compute";
import { FRIDGES, LABEL_CENTS } from "./data";
import { FRIDGE_DEFAULTS, computeFridgeCalc, type FridgeValues } from "./refrigerator-model";
import { CostTable, RateFields, RateNote, TipList } from "./ui";

const CALC_KEY = "electricity/refrigerator-cost-calculator";

export default function RefrigeratorCalculator({ initial }: { initial?: Partial<FridgeValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, FRIDGE_DEFAULTS, initial);
  const c = useMemo(() => computeFridgeCalc(v), [v]);
  const { r, rate, type } = c;
  const yours = c.source === "es" ? `Typical new ${type.short.toLowerCase()}` : `Your ${type.short.toLowerCase()}`;
  const extra = r.cost.perYear - r.esCostYear;

  const items: ShoppingItem[] = [
    { id: "fridge-year", name: `${type.name}${v.qty > 1 ? ` × ${v.qty}` : ""} — electricity per year`, qty: Math.round(r.cost.kwhYear), unit: "kWh", cost: r.cost.perYear, note: `${fmtCents(rate.cents)}/kWh` },
  ];

  return (
    <CalcFrame
      showUnitToggle={false}
      dock={{ label: "Per month", value: fmtMoney(r.cost.perMonth, { cents: true }) }}
      inputs={
        <>
          <FieldSection title="Your refrigerator or freezer">
            <SelectField label="Type" value={type.id} onChange={(t) => set({ type: t, labelKwh: FRIDGES.find((f) => f.id === t)?.kwhYear ?? v.labelKwh })} options={FRIDGES.map((f) => ({ value: f.id, label: f.name }))} />
            <Segmented
              label="Energy use from"
              value={c.source}
              options={[
                { value: "es", label: "Typical new", sub: "ENERGY STAR" },
                { value: "label", label: "Yellow label", sub: "kWh per year" },
                { value: "meter", label: "Plug-in meter", sub: "measured" },
              ]}
              onChange={(source) => set({ source })}
            />
            {c.source === "label" ? (
              <NumberField label="EnergyGuide estimate" value={v.labelKwh} onChange={(labelKwh) => set({ labelKwh })} suffix="kWh/yr" step={10} max={5000} decimals={0} stepper={false} help="The big number on the yellow label. Ignore its dollar figure — it assumes 14¢/kWh (older labels even less)." />
            ) : c.source === "meter" ? (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Meter reading" value={v.meterKwh} onChange={(meterKwh) => set({ meterKwh })} suffix="kWh" step={0.1} max={1000} decimals={2} stepper={false} />
                <NumberField label="Over" value={v.meterDays} onChange={(meterDays) => set({ meterDays })} suffix="days" step={1} min={0.1} max={60} decimals={1} />
                <p className="col-span-2 -mt-1 text-[0.78rem] leading-snug text-ink-3">Leave the meter in for at least 2–3 days of normal use so defrost cycles and door openings average out.</p>
              </div>
            ) : (
              <p className="text-[0.78rem] leading-snug text-ink-3">
                Average of {fmtInt(type.n)} ENERGY STAR certified models: {fmtInt(type.kwhYear)} kWh a year. Older units often use more — measure yours to know.
              </p>
            )}
            <NumberField label="How many?" value={v.qty} onChange={(qty) => set({ qty: Math.max(1, Math.round(qty)) })} step={1} min={1} max={10} decimals={0} help="A second fridge or freezer in the garage counts too." />
          </FieldSection>

          <RateFields state={v.state} rateMode={v.rateMode} cents={v.cents} onChange={(p) => set(p)} />
        </>
      }
      results={
        <>
          <ResultHero
            label={`${yours} costs`}
            value={fmtMoney(r.cost.perMonth, { cents: true })}
            unit="a month"
            sub={
              <>
                {fmtInt(r.cost.kwhYear)} kWh a year · {fmtMoney(r.cost.perYear)} a year · {fmtMoneyPrecise(r.cost.perDay)} a day
              </>
            }
          />
          <RateNote state={v.state} rateMode={v.rateMode} cents={v.cents} />
          <StatGrid
            stats={[
              { label: "Per year", value: fmtMoney(r.cost.perYear), hint: `${fmtInt(r.cost.kwhYear)} kWh`, emphasis: true },
              { label: "Per day", value: fmtMoneyPrecise(r.cost.perDay), hint: `${fmt(r.cost.kwhDay, 2)} kWh` },
              { label: "Average draw", value: fmt((r.cost.kwhDay / 24) * 1000, 0), unit: "W", hint: "compressor cycles on and off" },
              { label: `Label at ${LABEL_CENTS}¢`, value: fmtMoney(r.labelCostYear), hint: "what the yellow tag would say" },
            ]}
          />
          <CostTable cost={r.cost} hourLabel="Per hour (avg)" />
          {c.source !== "es" && extra > 1 ? (
            <Callout tone="warn" title="Using more than a new one">
              Yours costs {fmtMoney(extra)} a year more than the ENERGY STAR average {type.short.toLowerCase()} ({fmtInt(type.kwhYear)} kWh). Over 10 years that is {fmtMoney(extra * 10)} toward a replacement.
            </Callout>
          ) : null}

          <ResultsHeading>Other styles at this rate</ResultsHeading>
          <OptionTable
            caption="Yearly cost of ENERGY STAR average models"
            columns={["Type", "kWh/yr", "Per year"]}
            highlight={FRIDGES.findIndex((f) => f.id === type.id)}
            rows={FRIDGES.map((f) => [f.short, fmtInt(f.kwhYear), fmtMoney((f.kwhYear * rate.cents) / 100)])}
          />
          <TipList
            tips={[
              "Measure an old fridge with a plug-in meter (a Kill A Watt handles up to 15 A) before deciding to replace it.",
              "Keep door gaskets clean and sealing, and vacuum the condenser coils if they're exposed.",
              "A garage fridge works harder in summer heat; one you don't need is pure cost.",
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
            calcName: "Refrigerator cost",
            title: `${type.name}${v.qty > 1 ? ` × ${v.qty}` : ""}`,
            summary: `${fmtMoney(r.cost.perMonth, { cents: true })} a month, ${fmtMoney(r.cost.perYear)} a year (${fmtInt(r.cost.kwhYear)} kWh)`,
            items,
          })}
        />
      }
    />
  );
}
