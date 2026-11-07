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
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { PANEL_WATTS, SQFT_PER_M2, STATE_OPTIONS, SYSTEM_LOSSES_PCT, defaultOffset, exportLabel, stateSolar } from "./data";
import { PANEL_DEFAULTS, computePanelCalc, monthlyKwhOf, type PanelValues } from "./panel-model";

const CALC_KEY = "solar/solar-panel-calculator";

export default function PanelCalculator({ initial }: { initial?: Partial<PanelValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, PANEL_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const r = useMemo(() => computePanelCalc(v), [v]);
  const s = stateSolar(v.state);
  const monthly = monthlyKwhOf(v);
  const area = (ft2: number) => (metric ? `${fmtInt(ft2 / SQFT_PER_M2)} m²` : `${fmtInt(ft2)} sq ft`);
  const cost = r.kw * 1000 * s.costPerW;
  const where = s.code === "US" ? "a typical U.S. location" : s.name;

  const items: ShoppingItem[] = [
    { id: "panels", name: `${v.panelW}-W solar panels`, qty: r.panels, unit: "panels", note: `${fmt(r.kw, 2)} kW DC array` },
    { id: "roof", name: "Usable roof area (incl. setbacks)", qty: Math.round(r.roofFt2), unit: "sq ft" },
  ];

  return (
    <CalcFrame
      dock={{ label: "System size", value: `${fmt(r.kw, 1)} kW · ${fmtInt(r.panels)} panels` }}
      inputs={
        <>
          <FieldSection title="Your electricity use">
            <Segmented
              label="I know my"
              value={v.mode}
              options={[
                { value: "kwh", label: "kWh per month" },
                { value: "bill", label: "Monthly bill" },
              ]}
              onChange={(mode) => set({ mode })}
            />
            {v.mode === "bill" ? (
              <>
                <NumberField label="Average monthly electric bill" value={v.bill} onChange={(bill) => set({ bill })} prefix="$" step={10} min={0} max={5000} decimals={0} />
                <NumberField
                  label="Electricity price"
                  value={v.rate}
                  onChange={(rate) => set({ rate })}
                  suffix="¢/kWh"
                  step={0.5}
                  min={1}
                  max={100}
                  decimals={2}
                  help={`${s.code === "US" ? "U.S." : s.name} average, EIA Jan–Aug 2026. Use bill total ÷ kWh from your bill for your own all-in rate.`}
                  hint={`≈ ${fmtInt(monthly)} kWh/mo`}
                />
              </>
            ) : (
              <NumberField
                label="Electricity use"
                value={v.kwh}
                onChange={(kwh) => set({ kwh })}
                suffix="kWh/mo"
                step={50}
                min={0}
                max={20000}
                decimals={0}
                help="Use a 12-month average from your bill. U.S. homes averaged 874 kWh a month in 2025 (EIA)."
              />
            )}
          </FieldSection>

          <FieldSection title="Where and how">
            <SelectField
              label="State"
              value={v.state}
              options={STATE_OPTIONS}
              onChange={(state) => {
                const ns = stateSolar(state);
                set({ state, rate: ns.rate, offset: defaultOffset(ns) });
              }}
              help={`${s.city}: ${fmt(s.psh, 2)} peak sun hours, ${fmtInt(s.yield)} kWh per kW per year after ${SYSTEM_LOSSES_PCT}% losses.`}
            />
            <Segmented label="Panel wattage" columns={4} value={v.panelW} options={PANEL_WATTS.map((w) => ({ value: w, label: `${w} W` }))} onChange={(panelW) => set({ panelW })} />
            <NumberField
              label="Offset target"
              value={v.offset}
              onChange={(offset) => set({ offset })}
              suffix="% of use"
              step={5}
              min={10}
              max={150}
              decimals={0}
              help={s.export.mode === "retail" ? "100% is typical where exports earn the retail rate." : "Where exports earn less than retail, ~70% usually pays back faster than 100%."}
            />
          </FieldSection>
        </>
      }
      results={
        <>
          <ResultHero
            label="You need about"
            value={fmt(r.kw, 1)}
            unit="kW DC"
            sub={
              <>
                {fmtInt(r.panels)} × {v.panelW}-W panels · {area(r.roofFt2)} of usable roof · {fmtInt(r.annualProd)} kWh a year ({fmt(r.offsetActual * 100, 0)}% of your use)
              </>
            }
          />
          <StatGrid
            stats={[
              { label: "Production per year", value: fmtInt(r.annualProd), unit: "kWh", hint: `${where}, 20° south roof` },
              { label: "Per month (average)", value: fmtInt(r.monthlyProd), unit: "kWh", hint: `vs. ${fmtInt(monthly)} kWh used` },
              { label: "Peak sun hours", value: fmt(s.psh, 2), unit: "h/day", hint: s.yieldSrc === "pvwatts" ? "PVWatts v8" : "PVGIS estimate" },
              { label: "One panel makes", value: fmt(r.perPanelDay, 2), unit: "kWh/day", hint: `${fmtInt(r.perPanelYear)} kWh/yr` },
              { label: "Panel area", value: area(r.arrayFt2).split(" ")[0], unit: metric ? "m²" : "sq ft", hint: "modules only" },
              { label: "Typical price", value: fmtMoney(cost), hint: `at $${fmt(s.costPerW, 2)}/W, before incentives` },
            ]}
          />

          <ResultsHeading>Same target, other panel sizes</ResultsHeading>
          <OptionTable
            caption="Panels needed by wattage"
            columns={["Panel", "Panels", "System", "Roof area"]}
            highlight={r.byWattage.findIndex((b) => b.w === v.panelW)}
            rows={r.byWattage.map((b) => [`${b.w} W`, fmtInt(b.panels), `${fmt(b.kw, 2)} kW`, area(b.roofFt2)])}
          />

          {r.offsetActual > 1.05 ? (
            <Callout tone="warn" title="Bigger than your use">
              This array makes {fmt(r.offsetActual * 100, 0)}% of what you use. Extra kWh often earn little or nothing at year-end true-up, and many utilities cap net-metered systems at your annual use.
            </Callout>
          ) : null}
          {r.kw > 25 ? (
            <Callout tone="warn">Above 25 kW (AC) many states&apos; net-metering rules no longer apply. Check your utility&apos;s size limit.</Callout>
          ) : null}
          <Callout tone="info" title={`Export rules: ${exportLabel(s)}`}>
            {s.policy}
          </Callout>
          <Callout tone="tip" title="What it pays back">
            The price of this system, the 2026 tax situation (the 30% federal credit ended for homeowner purchases completed after 2025) and your break-even year are in the{" "}
            <Link href="/solar/solar-payback-calculator" className="font-semibold underline">
              solar payback calculator
            </Link>
            .
          </Callout>

          <ShoppingList items={items} calcKey={CALC_KEY} />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Solar panels",
            title: `Solar for ${fmtInt(monthly)} kWh/month in ${s.code === "US" ? "the U.S." : s.name}`,
            summary: `${fmt(r.kw, 2)} kW: ${fmtInt(r.panels)} × ${v.panelW} W, ${fmtInt(r.annualProd)} kWh/yr`,
            items,
          })}
        />
      }
    />
  );
}
