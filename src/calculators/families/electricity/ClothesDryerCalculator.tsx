"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { FieldSection, NumberField, Segmented } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt, fmtInt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { computeLaundry, dryerKwhPerLoad, fmtCents } from "./compute";
import { DRYER_DEFAULTS, computeDryerCalc, type DryerValues } from "./clothes-dryer-model";
import { DRYER_CYCLES_PER_YEAR } from "./data";
import { CompareTiles, RateFields, RateNote, TipList } from "./ui";

const CALC_KEY = "electricity/clothes-dryer-cost-calculator";
const LOAD_ROWS = [3, 5, 7, 10, 14];

export default function ClothesDryerCalculator({ initial }: { initial?: Partial<DryerValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, DRYER_DEFAULTS, initial);
  const c = useMemo(() => computeDryerCalc(v), [v]);
  const { r, rate } = c;
  const name = v.dryer === "heatpump" ? "Heat pump dryer" : v.dryer === "custom" ? "Your dryer" : "Electric dryer";
  const vented = computeLaundry({ dryerKwhLoad: dryerKwhPerLoad("vented", 0), washer: "none", loadsPerWeek: v.loads, cents: rate.cents });
  const heatPump = computeLaundry({ dryerKwhLoad: dryerKwhPerLoad("heatpump", 0), washer: "none", loadsPerWeek: v.loads, cents: rate.cents });

  const items: ShoppingItem[] = [
    { id: "laundry-year", name: `${name}${v.washer !== "none" ? " + washer" : ""} — electricity per year`, qty: Math.round(r.kwhYear), unit: "kWh", cost: r.perYear, note: `${fmt(v.loads, 1)} loads a week at ${fmtCents(rate.cents)}/kWh` },
  ];

  return (
    <CalcFrame
      showUnitToggle={false}
      dock={{ label: "Per load", value: fmtMoneyPrecise(r.perLoad) }}
      inputs={
        <>
          <FieldSection title="Your dryer">
            <Segmented
              label="Type"
              value={v.dryer}
              options={[
                { value: "vented", label: "Electric", sub: `${fmt(dryerKwhPerLoad("vented", 0), 2)} kWh/load` },
                { value: "heatpump", label: "Heat pump", sub: `${fmt(dryerKwhPerLoad("heatpump", 0), 2)} kWh/load` },
                { value: "custom", label: "My figure", sub: "kWh/load" },
              ]}
              onChange={(dryer) => set({ dryer })}
              help={`ENERGY STAR certified averages over DOE's ${DRYER_CYCLES_PER_YEAR}-load test year. Older dryers without moisture sensors run longer.`}
            />
            {v.dryer === "custom" ? (
              <NumberField label="Energy per load" value={v.kwhLoad} onChange={(kwhLoad) => set({ kwhLoad })} suffix="kWh" step={0.1} max={20} decimals={2} help="From an energy monitor, or element watts × minutes ÷ 60,000 as an upper bound (the element cycles)." />
            ) : null}
          </FieldSection>

          <FieldSection title="Your laundry">
            <NumberField label="Loads a week" value={v.loads} onChange={(loads) => set({ loads })} step={1} max={50} decimals={1} help={`DOE's test year is ${DRYER_CYCLES_PER_YEAR} loads — about 5.4 a week.`} />
            <Segmented
              label="Add the washer"
              value={v.washer}
              options={[
                { value: "none", label: "Dryer only" },
                { value: "front", label: "Front-load" },
                { value: "top", label: "Top-load" },
              ]}
              onChange={(washer) => set({ washer })}
              help="ENERGY STAR washer averages, including the electricity to heat the water with an electric water heater."
            />
          </FieldSection>

          <RateFields state={v.state} rateMode={v.rateMode} cents={v.cents} onChange={(p) => set(p)} />
        </>
      }
      results={
        <>
          <ResultHero
            label={`${name}${v.washer !== "none" ? " + washer" : ""} costs`}
            value={fmtMoneyPrecise(r.perLoad)}
            unit="per load"
            sub={
              <>
                {fmtMoney(r.perMonth, { cents: true })} a month · {fmtMoney(r.perYear)} a year · {fmtInt(r.kwhYear)} kWh
              </>
            }
          />
          <RateNote state={v.state} rateMode={v.rateMode} cents={v.cents} />
          <StatGrid
            stats={[
              { label: "Drying, per load", value: fmtMoneyPrecise(r.dryerPerLoad), hint: `${fmt(c.kwhLoad, 2)} kWh`, emphasis: true },
              { label: "Washing, per load", value: v.washer === "none" ? "—" : fmtMoneyPrecise(r.washerPerLoad), hint: v.washer === "none" ? "not included" : "incl. hot water" },
              { label: "Per month", value: fmtMoney(r.perMonth, { cents: true }), hint: `${fmt(r.loadsPerYear / 12, 0)} loads` },
              { label: "Per year", value: fmtMoney(r.perYear), hint: `${fmtInt(r.loadsPerYear)} loads` },
            ]}
          />
          <ResultsHeading>Electric vs heat pump dryer</ResultsHeading>
          <CompareTiles
            a={{ title: "Vented electric", value: vented.perYear, note: "per year" }}
            b={{ title: "Heat pump (ventless)", value: heatPump.perYear, note: "per year" }}
          />
          <p className="text-[0.84rem] leading-relaxed text-ink-2">
            At {fmt(v.loads, 1)} loads a week a heat pump dryer saves about {fmtMoney(vented.perYear - heatPump.perYear)} a year here, {fmtMoney((vented.perYear - heatPump.perYear) * 10)} over ten years — weigh that against the price difference. It also needs no outside vent.
          </p>
          <OptionTable
            caption="Yearly cost by loads per week"
            columns={["Loads a week", "Per month", "Per year"]}
            rows={LOAD_ROWS.map((n) => {
              const x = computeLaundry({ dryerKwhLoad: c.kwhLoad, washer: v.washer, loadsPerWeek: n, cents: rate.cents });
              return [`${n}`, fmtMoney(x.perMonth, { cents: true }), fmtMoney(x.perYear)];
            })}
          />
          <TipList
            tips={[
              "Use the moisture-sensor (auto-dry) cycle instead of a timed one so the dryer stops when clothes are dry.",
              "A faster washer spin leaves less water for the dryer to boil off.",
              "Clean the lint screen every load and the vent duct yearly — a clogged duct lengthens every cycle and is a fire risk.",
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
            calcName: "Clothes dryer cost",
            title: `${name}, ${fmt(v.loads, 1)} loads a week`,
            summary: `${fmtMoneyPrecise(r.perLoad)} a load, ${fmtMoney(r.perYear)} a year at ${fmtCents(rate.cents)}/kWh`,
            items,
          })}
        />
      }
    />
  );
}
