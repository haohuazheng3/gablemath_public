"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { FieldSection, NumberField, Segmented, SelectField, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { computeEv, fmtCents } from "./compute";
import { CHARGER_KW, DAYS_PER_MONTH, EV_MODELS, EV_RATE_PLANS, L1_EXTRA_LOSS } from "./data";
import { EV_DEFAULTS, computeEvCalc, type EvValues } from "./ev-charging-model";
import { CompareTiles, Disclosure, RateFields, RateNote, TipList } from "./ui";

const CALC_KEY = "electricity/ev-charging-cost-calculator";

export default function EvChargingCalculator({ initial }: { initial?: Partial<EvValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, EV_DEFAULTS, initial);
  const c = useMemo(() => computeEvCalc(v), [v]);
  const { r, rate, info } = c;
  const where = info.code === "US" ? "the U.S." : info.name;
  const name = c.model?.name ?? `EV at ${fmt(c.kwh100, 1)} kWh/100 mi`;
  const level = v.level === "l1" ? "l1" : "l2";

  const others = useMemo(
    () =>
      EV_MODELS.map((m) => ({
        m,
        r: computeEv({ kwh100: m.kwh100, miles: v.miles, level, cents: rate.cents, gasPrice: c.gasPrice, mpg: v.mpg }),
      })).sort((a, b) => a.m.kwh100 - b.m.kwh100),
    [v.miles, v.mpg, level, rate.cents, c.gasPrice],
  );

  const items: ShoppingItem[] = [
    { id: "ev-month", name: `${name} — home charging per month`, qty: Math.round(r.kwhMonth), unit: "kWh", cost: r.costMonth, note: `${fmtInt(v.miles)} mi at ${fmtCents(rate.cents)}/kWh` },
  ];

  return (
    <CalcFrame
      showUnitToggle={false}
      dock={{ label: "Charging", value: `${fmtMoney(r.costMonth, { cents: true })}/mo` }}
      inputs={
        <>
          <FieldSection title="Your EV">
            <SelectField
              label="Vehicle"
              value={v.vehicle}
              onChange={(vehicle) => set({ vehicle })}
              options={[...EV_MODELS.map((m) => ({ value: m.id, label: `${m.name} — ${m.kwh100} kWh/100 mi` })), { value: "custom", label: "Other — enter efficiency" }]}
              help="EPA combined figures from fueleconomy.gov, measured at the wall, so Level 2 charging losses are already included."
            />
            {c.model ? null : (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Efficiency" value={v.customEff} onChange={(customEff) => set({ customEff })} step={0.5} min={0.1} max={100} decimals={1} stepper={false} />
                <Segmented label="Unit" value={v.effUnit} options={[{ value: "kwh100", label: "kWh/100 mi" }, { value: "mikwh", label: "mi/kWh" }]} onChange={(effUnit) => set({ effUnit })} />
              </div>
            )}
            <NumberField label="Miles a month" value={v.miles} onChange={(miles) => set({ miles })} suffix="mi" step={100} max={20000} decimals={0} help={`${fmtInt(v.miles * 12)} miles a year. Count only the miles you charge for at home.`} />
            <Segmented
              label="Home charger"
              value={level}
              options={[
                { value: "l2", label: "Level 2", sub: `240 V · ~${CHARGER_KW.l2} kW` },
                { value: "l1", label: "Level 1", sub: `120 V · ~${CHARGER_KW.l1} kW` },
              ]}
              onChange={(lv) => set({ level: lv })}
              help={level === "l1" ? `Level 1 loses more energy as heat; we add ${fmt(L1_EXTRA_LOSS * 100, 0)}% (an estimate — chargers run 84–93% efficient).` : undefined}
            />
          </FieldSection>

          <RateFields state={v.state} rateMode={v.rateMode} cents={v.cents} onChange={(p) => set(p)} />

          <Disclosure label="EV or time-of-use rate plan">
            <p className="text-[0.8rem] leading-snug text-ink-3">Charging overnight on an EV or time-of-use plan can cost far less than the state average. Tap a plan to use its off-peak energy price:</p>
            <div className="grid gap-2">
              {EV_RATE_PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set({ rateMode: "custom", cents: p.cents })}
                  className="flex items-center justify-between gap-3 rounded-[14px] bg-surface-2 px-4 py-2.5 text-left ring-1 ring-line transition hover:ring-accent active:scale-[0.99]"
                >
                  <span>
                    <span className="block text-[0.86rem] font-semibold text-ink">{p.label}</span>
                    <span className="block text-[0.74rem] text-ink-3">{p.note}</span>
                  </span>
                  <span className="num shrink-0 text-[0.95rem] font-semibold text-ink">{p.cents}¢</span>
                </button>
              ))}
            </div>
          </Disclosure>

          <Disclosure label="Compare with a gas car">
            <ToggleField
              label={`Use ${info.gasolineArea} gas price`}
              checked={v.gasAuto}
              onChange={(gasAuto) => set({ gasAuto })}
              help={`$${info.gasoline.toFixed(2)}/gal regular, EIA week of Oct 19, 2026.`}
            />
            {v.gasAuto ? null : <NumberField label="Gas price" value={v.gasPrice} onChange={(gasPrice) => set({ gasPrice })} prefix="$" suffix="/gal" step={0.1} max={15} decimals={2} />}
            <NumberField label="Gas car fuel economy" value={v.mpg} onChange={(mpg) => set({ mpg })} suffix="mpg" step={1} min={1} max={150} decimals={1} help="27.2 mpg is the EPA average for model-year 2024 new vehicles; pickups and large SUVs get less." />
          </Disclosure>
        </>
      }
      results={
        <>
          <ResultHero
            label="Charging at home costs"
            value={fmtMoney(r.costMonth, { cents: true })}
            unit="a month"
            sub={
              <>
                {fmtInt(r.kwhMonth)} kWh · {fmt(r.costPerMile * 100, 1)}¢ a mile · {fmtMoney(r.costYear)} a year
              </>
            }
          />
          <RateNote state={v.state} rateMode={v.rateMode} cents={v.cents} />
          <StatGrid
            stats={[
              { label: "Per mile", value: `${fmt(r.costPerMile * 100, 1)}¢`, hint: `gas: ${fmt(r.gasPerMile * 100, 1)}¢`, emphasis: true },
              { label: "Per 100 miles", value: fmtMoney(r.costPerMile * 100, { cents: true }), hint: `${fmt(c.kwh100 * (level === "l1" ? 1 + L1_EXTRA_LOSS : 1), 1)} kWh` },
              r.fullCharge
                ? { label: "Empty to full (EPA range)", value: fmtMoney(r.fullCharge.cost, { cents: true }), hint: `${fmtInt(c.model?.range ?? 0)} mi · ${fmt(r.fullCharge.kwh, 0)} kWh` }
                : { label: "Per day", value: fmtMoneyPrecise(r.costMonth / DAYS_PER_MONTH), hint: `${fmt(r.kwhPerDay, 1)} kWh` },
              { label: "Plug-in time per day", value: `${fmt(r.chargeHoursPerDay, 1)} h`, hint: `on ${level === "l1" ? "Level 1" : "Level 2"}` },
            ]}
          />
          <ResultsHeading>Versus filling up</ResultsHeading>
          <CompareTiles
            a={{ title: "Home charging", value: r.costMonth, note: "per month" }}
            b={{ title: `Gas at $${c.gasPrice.toFixed(2)}, ${fmt(v.mpg, 1)} mpg`, value: r.gasMonth, note: "per month" }}
          />
          <p className="text-[0.84rem] leading-relaxed text-ink-2">
            {r.savingsMonth > 0
              ? `Driving ${fmtInt(v.miles)} miles a month on electricity saves about ${fmtMoney(r.savingsYear)} a year in ${where} versus a ${fmt(v.mpg, 1)} mpg gas car.`
              : `At these prices a ${fmt(v.mpg, 1)} mpg gas car costs less per mile — try an off-peak EV rate.`}{" "}
            Maintenance and insurance differences are not included.
          </p>

          <ResultsHeading>Other EVs at this rate</ResultsHeading>
          <OptionTable
            caption="Monthly home charging cost by model"
            columns={["Vehicle", "kWh/100 mi", "Per month"]}
            highlight={others.findIndex((o) => o.m.id === v.vehicle)}
            rows={others.map((o) => [o.m.name.replace(/^20\d\d /, ""), fmt(o.m.kwh100, 0), fmtMoney(o.r.costMonth, { cents: true })])}
          />
          <Callout tone="info" title="No federal EV credits in 2026">
            The new clean vehicle credit (30D) ended for vehicles acquired after Sept 30, 2025, and the home charger credit (30C) for chargers placed in service after June 30, 2026. Check your utility for charger rebates and EV rates.
          </Callout>
          <TipList
            tips={[
              "Set the car or charger to start after your utility's peak window (often 4–9 pm); on an EV or time-of-use plan that is the cheapest single change.",
              `A Level 2 charger idles at about 7 W — roughly ${fmtInt(r.standbyKwhYear)} kWh a year.`,
              "Cold weather and highway speeds raise kWh per mile; the EPA figure is a combined average.",
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
            calcName: "EV charging cost",
            title: `${name}, ${fmtInt(v.miles)} mi/month in ${where}`,
            summary: `${fmtMoney(r.costMonth, { cents: true })} a month (${fmt(r.costPerMile * 100, 1)}¢/mi) vs ${fmtMoney(r.gasMonth, { cents: true })} for gas`,
            items,
          })}
        />
      }
    />
  );
}
