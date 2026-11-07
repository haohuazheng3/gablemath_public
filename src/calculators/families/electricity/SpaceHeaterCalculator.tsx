"use client";

import { clsx } from "clsx";
import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { FieldSection, NumberField, Segmented, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { fmtCents, heatSources, heatingMonthIdx, monthlyMeanTempF } from "./compute";
import { BTU_PER_KWH, HEATER_DUTY, HEATER_WATTS, HEATING_MONTH_BELOW_F, MONTH_ABBR } from "./data";
import { HEATER_DEFAULTS, computeHeaterCalc, type HeaterValues } from "./space-heater-model";
import { CostTable, Disclosure, RateFields, RateNote, TipList } from "./ui";

const CALC_KEY = "electricity/space-heater-cost-calculator";

export default function SpaceHeaterCalculator({ initial }: { initial?: Partial<HeaterValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, HEATER_DEFAULTS, initial);
  const { rate, months, info, r } = useMemo(() => computeHeaterCalc(v), [v]);
  const where = info.code === "US" ? "the U.S." : info.name;
  const temps = monthlyMeanTempF(info);
  const heatIdx = new Set(heatingMonthIdx(info));
  const sources = heatSources(info, rate.cents).sort((a, b) => a.perMMBtu - b.perMMBtu);
  const resistance = sources.find((s) => s.id === "resistance")!;
  const gas = sources.find((s) => s.id === "gas-95")!;
  const heatMMBtuMonth = (r.cost.kwhMonth * BTU_PER_KWH) / 1_000_000;
  const label = `${fmtInt(v.watts)} W${v.qty > 1 ? ` × ${v.qty}` : ""} space heater`;

  const items: ShoppingItem[] = [
    { id: "heater-month", name: `${label} — electricity per month`, qty: Math.round(r.cost.kwhMonth * 10) / 10, unit: "kWh", cost: r.cost.perMonth, note: `${fmt(v.hours)} h/day at ${fmt(v.duty, 0)}% · ${fmtCents(rate.cents)}/kWh` },
    { id: "heater-season", name: `${label} — whole heating season (${months} mo)`, qty: Math.round(r.cost.kwhYear), unit: "kWh", cost: r.cost.perYear },
  ];

  return (
    <CalcFrame
      showUnitToggle={false}
      dock={{ label: "Costs", value: `${fmtMoney(r.cost.perMonth, { cents: true })}/mo` }}
      inputs={
        <>
          <FieldSection title="Your heater">
            <Segmented
              label="Wattage setting"
              columns={3}
              value={HEATER_WATTS.some((o) => o.value === v.watts) ? v.watts : -1}
              options={HEATER_WATTS.map((o) => ({ value: o.value as number, label: o.label, sub: o.sub }))}
              onChange={(watts) => watts > 0 && set({ watts })}
              help="It's on the label. Most plug-in heaters max out at 1,500 W, which draws 12.5 A at 120 V."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Exact watts" value={v.watts} onChange={(watts) => set({ watts })} suffix="W" step={50} max={5000} decimals={0} stepper={false} />
              <NumberField label="Heaters" value={v.qty} onChange={(qty) => set({ qty: Math.max(1, Math.round(qty)) })} step={1} min={1} max={20} decimals={0} />
            </div>
          </FieldSection>

          <FieldSection title="How you use it">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Hours a day" value={v.hours} onChange={(hours) => set({ hours })} step={1} max={24} decimals={1} />
              <NumberField label="Days a month" value={v.days} onChange={(days) => set({ days })} step={1} max={31} decimals={2} />
            </div>
            <Segmented
              label="How often the element is on"
              columns={4}
              value={HEATER_DUTY.some((o) => o.value === v.duty) ? v.duty : -1}
              options={HEATER_DUTY}
              onChange={(duty) => duty > 0 && set({ duty })}
              help="A heater with a thermostat switches off once the room is warm. Nonstop is the most it can cost; 40–70% is typical with thermostat cycling."
            />
          </FieldSection>

          <Disclosure label="Heating season">
            <ToggleField
              label={`Use ${where}'s heating season`}
              checked={v.seasonAuto}
              onChange={(seasonAuto) => set({ seasonAuto })}
              help={`${heatIdx.size || "No"} month${heatIdx.size === 1 ? "" : "s"} average below ${HEATING_MONTH_BELOW_F}°F there (NOAA normals)${heatIdx.size ? "" : " — we budget one month of cold snaps"}.`}
            />
            {v.seasonAuto ? null : <NumberField label="Months you run it" value={v.months} onChange={(m) => set({ months: m })} step={1} max={12} decimals={0} />}
          </Disclosure>

          <RateFields state={v.state} rateMode={v.rateMode} cents={v.cents} onChange={(p) => set(p)} />
        </>
      }
      results={
        <>
          <ResultHero
            label={`${label} costs`}
            value={fmtMoney(r.cost.perMonth, { cents: true })}
            unit="a month"
            sub={
              <>
                {fmt(r.cost.kwhMonth, 0)} kWh · {fmtMoneyPrecise(r.fullHour)} per hour on full · {fmtMoney(r.cost.perYear)} for a {months}-month season
              </>
            }
          />
          <RateNote state={v.state} rateMode={v.rateMode} cents={v.cents} />
          <StatGrid
            stats={[
              { label: "Per hour on full power", value: fmtMoneyPrecise(r.fullHour), hint: `${fmt((v.watts * v.qty) / 1000, 2)} kWh`, emphasis: true },
              { label: "Per day", value: fmtMoneyPrecise(r.cost.perDay), hint: `${fmt(v.hours)} h at ${fmt(v.duty, 0)}%` },
              { label: "Heat output", value: fmtInt(r.btuPerHour), unit: "Btu/h", hint: "1 W = 3.412 Btu/h" },
              { label: "Current draw", value: fmt(r.amps, 1), unit: "A", hint: "per heater at 120 V" },
            ]}
          />
          {v.duty === 100 ? (
            <Callout tone="tip" title="With a thermostat">
              If it cycles 40–70% of the time, expect {fmtMoney(r.bandMonth[0], { cents: true })}–{fmtMoney(r.bandMonth[1], { cents: true })} a month instead.
            </Callout>
          ) : null}
          <CostTable cost={r.cost} hourLabel="Per hour of use" yearLabel={`Per season (${months} mo)`} />
          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}

          <ResultsHeading>Heating season in {where}</ResultsHeading>
          <ul className="grid grid-cols-6 gap-1.5" aria-label="Normal monthly mean temperature">
            {temps.map((t, i) => (
              <li key={MONTH_ABBR[i]} className={clsx("rounded-[10px] px-1 py-1.5 text-center ring-1", heatIdx.has(i) ? "bg-accent-soft ring-accent/30" : "bg-surface-2 ring-line")}>
                <div className="text-[0.7rem] font-semibold text-ink-2">{MONTH_ABBR[i]}</div>
                <div className="num text-[0.82rem] text-ink">{fmt(t, 0)}°</div>
              </li>
            ))}
          </ul>
          <p className="text-[0.76rem] leading-snug text-ink-3">Normal mean temperature (NOAA, population-weighted). Highlighted months average below {HEATING_MONTH_BELOW_F}°F.</p>

          <ResultsHeading>Cheapest way to make the same heat</ResultsHeading>
          <OptionTable
            caption="Cost per million Btu of delivered heat"
            columns={["Heat source", "$ per million Btu", "This much heat"]}
            highlight={sources.findIndex((s) => s.id === "resistance")}
            rows={sources.map((s) => [s.label, fmtMoney(s.perMMBtu, { cents: true }), fmtMoney(s.perMMBtu * heatMMBtuMonth, { cents: true })])}
          />
          <p className="text-[0.84rem] leading-relaxed text-ink-2">
            {resistance.perMMBtu > gas.perMMBtu
              ? `In ${where} resistance heat costs ${fmt(resistance.perMMBtu / gas.perMMBtu, 1)}× as much as gas heat from a 95% furnace. A space heater only saves money when it lets you turn the whole-house thermostat down several degrees and heat just the room you're in.`
              : `In ${where} resistance heat costs about the same as or less than gas heat from a 95% furnace, so heating one room with a space heater instead of the whole house usually saves money.`}{" "}
            A heat pump delivers the same heat for about {fmtMoney(sources.find((s) => s.id === "heat-pump")!.perMMBtu * heatMMBtuMonth, { cents: true })} a month.
          </p>

          <TipList
            tips={[
              "Keep 3 ft of clearance, plug straight into a wall outlet and pick a model with tip-over and overheat shut-off.",
              "Close the door of the room you're heating: a 1,500 W heater puts out 5,118 Btu/h, a small fraction of what a central furnace delivers.",
              "Don't switch the central heat off entirely in a freezing spell: pipes in outside walls can freeze.",
              `Use the thermostat or timer: every hour the element is off saves ${fmtMoneyPrecise(r.fullHour)}.`,
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
            calcName: "Space heater cost",
            title: `${label}, ${fmt(v.hours)} h/day in ${where}`,
            summary: `${fmtMoney(r.cost.perMonth, { cents: true })} a month, ${fmtMoney(r.cost.perYear)} a season at ${fmtCents(rate.cents)}/kWh`,
            items,
          })}
        />
      }
    />
  );
}
