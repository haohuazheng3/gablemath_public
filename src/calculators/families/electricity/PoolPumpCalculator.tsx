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
import { affinityWatts, computePoolPump, fmtCents } from "./compute";
import { POOL_PUMP } from "./data";
import { POOL_DEFAULTS, computePoolCalc, pumpWatts, type PoolValues } from "./pool-pump-model";
import { CompareTiles, Disclosure, RateFields, RateNote, TipList } from "./ui";

const CALC_KEY = "electricity/pool-pump-cost-calculator";

export default function PoolPumpCalculator({ initial }: { initial?: Partial<PoolValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, POOL_DEFAULTS, initial);
  const c = useMemo(() => computePoolCalc(v), [v]);
  const { r, rate } = c;
  const vs = v.pump === "vs";
  const ground = v.ground === "above" ? POOL_PUMP.above : POOL_PUMP.inground;
  const name = vs ? "Variable-speed pool pump" : v.pump === "booster" ? "Booster pump" : `${fmtInt(v.watts)} W single-speed pump`;

  const schedules = useMemo(() => {
    const run = (highHours: number, lowHours: number) =>
      computePoolPump({ pump: "vs", highW: ground.high, lowW: ground.low, highHours, lowHours, watts: 0, hours: 0, months: v.months, cents: rate.cents });
    const single = (hours: number) =>
      computePoolPump({ pump: "fixed", highW: 0, lowW: 0, highHours: 0, lowHours: 0, watts: POOL_PUMP.singleSpeed, hours, months: v.months, cents: rate.cents });
    return [
      { label: "Single-speed, 8 h", r: single(8) },
      { label: "Single-speed, 6 h", r: single(6) },
      { label: "Variable speed, 2 h high + 10 h low", r: run(2, 10) },
      { label: "Variable speed, 12 h low", r: run(0, 12) },
      { label: "Variable speed, 24 h low", r: run(0, 24) },
    ];
  }, [ground, v.months, rate.cents]);

  const items: ShoppingItem[] = [
    { id: "pool-year", name: `${name} — electricity for ${fmt(v.months, 0)} months`, qty: Math.round(r.kwhYear), unit: "kWh", cost: r.perYear, note: `${fmt(r.hoursPerDay, 1)} h/day at ${fmtCents(rate.cents)}/kWh` },
  ];

  return (
    <CalcFrame
      showUnitToggle={false}
      dock={{ label: "Per month", value: fmtMoney(r.perMonth, { cents: true }) }}
      inputs={
        <>
          <FieldSection title="Your pump">
            <Segmented
              label="Pump"
              value={v.pump}
              options={[
                { value: "vs", label: "Variable speed" },
                { value: "single", label: "Single speed" },
                { value: "booster", label: "Booster", sub: "cleaner" },
              ]}
              onChange={(pump) => set({ pump })}
            />
            <Segmented
              label="Pool"
              value={v.ground === "above" ? "above" : "inground"}
              options={[
                { value: "inground", label: "In-ground" },
                { value: "above", label: "Above-ground" },
              ]}
              onChange={(g) => {
                const w = g === "above" ? POOL_PUMP.above : POOL_PUMP.inground;
                set({ ground: g, highW: w.high, lowW: w.low });
              }}
            />
            {vs ? (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Hours on high" value={v.highHours} onChange={(highHours) => set({ highHours })} step={1} max={24} decimals={1} />
                <NumberField label="Hours on low" value={v.lowHours} onChange={(lowHours) => set({ lowHours })} step={1} max={24} decimals={1} />
              </div>
            ) : (
              <NumberField label="Hours a day" value={v.hours} onChange={(hours) => set({ hours })} step={1} max={24} decimals={1} />
            )}
            {v.pump === "single" ? (
              <NumberField label="Pump power" value={v.watts} onChange={(watts) => set({ watts })} suffix="W" step={50} max={5000} decimals={0} stepper={false} help="Older 1.5 hp in-ground pumps draw about 1,500–2,000 W (estimate). Amps × volts from the motor plate gives an upper bound." />
            ) : null}
            <NumberField label="Months a year it runs" value={v.months} onChange={(months) => set({ months })} step={1} max={12} decimals={0} />
          </FieldSection>

          {vs ? (
            <Disclosure label="Your pump's watts at each speed">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="High speed" value={v.highW} onChange={(highW) => set({ highW })} suffix="W" step={10} max={5000} decimals={0} stepper={false} />
                <NumberField label="Low speed" value={v.lowW} onChange={(lowW) => set({ lowW })} suffix="W" step={5} max={5000} decimals={0} stepper={false} />
              </div>
              <p className="text-[0.78rem] leading-snug text-ink-3">
                Defaults are ENERGY STAR {v.ground === "above" ? "above-ground" : "in-ground"} variable-speed averages. Most pump displays show live watts. Power falls with the cube of speed: at 50% speed a pump drawing {fmtInt(v.highW)} W uses about {fmtInt(affinityWatts(v.highW, 50))} W.
              </p>
            </Disclosure>
          ) : null}

          <RateFields state={v.state} rateMode={v.rateMode} cents={v.cents} onChange={(p) => set(p)} />
        </>
      }
      results={
        <>
          <ResultHero
            label={`${name} costs`}
            value={fmtMoney(r.perMonth, { cents: true })}
            unit="a month"
            sub={
              <>
                {fmt(r.kwhDay, 1)} kWh a day · {fmtMoney(r.perYear)} for {fmt(v.months, 0)} month{v.months === 1 ? "" : "s"}
              </>
            }
          />
          <RateNote state={v.state} rateMode={v.rateMode} cents={v.cents} />
          <StatGrid
            stats={[
              { label: "Per day", value: fmtMoneyPrecise(r.perDay), hint: `${fmt(r.hoursPerDay, 1)} h running`, emphasis: true },
              { label: "Per year", value: fmtMoney(r.perYear), hint: `${fmtInt(r.kwhYear)} kWh` },
              { label: "Power", value: vs ? `${fmtInt(v.lowW)}–${fmtInt(v.highW)}` : fmtInt(pumpWatts(v)), unit: "W", hint: vs ? "low – high speed" : "while running" },
              { label: "Per hour", value: fmtMoneyPrecise(r.hoursPerDay > 0 ? r.perDay / r.hoursPerDay : 0), hint: "average running hour" },
            ]}
          />
          {v.pump !== "single" ? (
            <>
              <ResultsHeading>Versus a single-speed pump</ResultsHeading>
              <CompareTiles
                a={{ title: name, value: r.perYear, note: `${fmt(v.months, 0)} months` }}
                b={{ title: `1.5 hp single speed, ${fmt(r.hoursPerDay, 1)} h`, value: r.singleSpeedYear, note: "estimate" }}
              />
            </>
          ) : null}

          <ResultsHeading>Common schedules at this rate</ResultsHeading>
          <OptionTable
            caption="Yearly cost of common pump schedules"
            columns={["Schedule", "kWh/day", "Per year"]}
            rows={schedules.map((s) => [s.label, fmt(s.r.kwhDay, 1), fmtMoney(s.r.perYear)])}
          />
          {v.pump === "single" ? (
            <Callout tone="tip" title="The biggest pool saving">
              A variable-speed pump running low for longer filters the same water for a fraction of the power — compare the schedules above. ENERGY STAR certified in-ground pumps save about ${POOL_PUMP.esSavingsInground} a year over standard models.
            </Callout>
          ) : null}
          <TipList
            tips={[
              "Half the speed uses one-eighth of the power (ENERGY STAR), so long, slow filtration beats short, fast runs.",
              "Save high speed for vacuuming, the heater or a cleaner that needs the flow.",
              "Clean the skimmer basket and filter regularly — a clogged filter cuts flow, so it takes longer to turn the water over.",
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
            calcName: "Pool pump cost",
            title: `${name}, ${fmt(r.hoursPerDay, 1)} h a day`,
            summary: `${fmtMoney(r.perMonth, { cents: true })} a month, ${fmtMoney(r.perYear)} a year at ${fmtCents(rate.cents)}/kWh`,
            items,
          })}
        />
      }
    />
  );
}
