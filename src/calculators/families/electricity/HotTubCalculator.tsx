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
import { computeHotTub, fmtCents, spaMaxStandbyW } from "./compute";
import { HOT_TUB_KWH_YEAR_RANGE, MONTH_NAME, SPA } from "./data";
import { HOT_TUB_DEFAULTS, computeHotTubCalc, spaKind, type HotTubValues } from "./hot-tub-model";
import { MonthBars, RateFields, RateNote, TipList } from "./ui";

const CALC_KEY = "electricity/hot-tub-cost-calculator";
const SETPOINTS = [98, 100, 102, 104];

export default function HotTubCalculator({ initial }: { initial?: Partial<HotTubValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, HOT_TUB_DEFAULTS, initial);
  const c = useMemo(() => computeHotTubCalc(v), [v]);
  const { r, info, rate } = c;
  const where = info.code === "US" ? "an average U.S. climate" : info.name;
  const indoor = v.location === "indoor";
  const name = `${fmtInt(v.gallons)}-gallon ${spaKind(v) === "inflatable" ? "inflatable spa" : "hot tub"}`;

  const bySetpoint = useMemo(
    () =>
      SETPOINTS.map((t) => ({
        t,
        year: computeHotTub({ standbyW: c.standbyW, setpointF: t, location: indoor ? "indoor" : "outdoor", indoorF: v.indoorF, info, cents: rate.cents }).costYear,
      })),
    [c.standbyW, indoor, v.indoorF, info, rate.cents],
  );

  const items: ShoppingItem[] = [
    { id: "spa-year", name: `${name} — keeping it hot for a year`, qty: Math.round(r.kwhYear), unit: "kWh", cost: r.costYear, note: `covered standby at ${fmt(v.setpoint, 0)}°F, ${fmtCents(rate.cents)}/kWh` },
  ];

  return (
    <CalcFrame
      showUnitToggle={false}
      dock={{ label: "Average month", value: fmtMoney(r.perMonth, { cents: true }) }}
      inputs={
        <>
          <FieldSection title="Your hot tub">
            <Segmented
              label="Type"
              value={spaKind(v)}
              options={[
                { value: "standard", label: "Hard-shell spa" },
                { value: "inflatable", label: "Inflatable" },
              ]}
              onChange={(kind) => set({ kind })}
            />
            <NumberField label="Fill volume" value={v.gallons} onChange={(gallons) => set({ gallons })} suffix="gal" step={25} min={20} max={2000} decimals={0} help="On the spec sheet or the tub's California Energy Commission listing (filled to mid-skimmer)." />
            <Segmented
              label="Standby power"
              value={v.standby === "label" ? "label" : "max"}
              options={[
                { value: "max", label: "California limit", sub: `${fmtInt(c.maxW)} W for this size` },
                { value: "label", label: "My tub's rating", sub: "from its listing" },
              ]}
              onChange={(standby) => set(standby === "label" ? { standby, labelW: Math.round(c.maxW) } : { standby })}
              help="Title 20 caps how much a covered spa may draw just to stay hot. Many tubs test well under the cap."
            />
            {v.standby === "label" ? (
              <NumberField label="Listed standby power" value={v.labelW} onChange={(labelW) => set({ labelW })} suffix="W" step={5} max={2000} decimals={0} help="“Normalized standby power” on the CEC listing or energy label — measured covered, with water at 102°F." />
            ) : null}
          </FieldSection>

          <FieldSection title="Settings">
            <NumberField label="Water temperature" value={v.setpoint} onChange={(setpoint) => set({ setpoint })} suffix="°F" step={1} min={60} max={104} decimals={0} />
            <Segmented
              label="Location"
              value={indoor ? "indoor" : "outdoor"}
              options={[
                { value: "outdoor", label: "Outdoors" },
                { value: "indoor", label: "Indoors / enclosed" },
              ]}
              onChange={(location) => set({ location })}
            />
            {indoor ? <NumberField label="Room temperature" value={v.indoorF} onChange={(indoorF) => set({ indoorF })} suffix="°F" step={1} min={30} max={95} decimals={0} /> : null}
          </FieldSection>

          <RateFields state={v.state} rateMode={v.rateMode} cents={v.cents} onChange={(p) => set(p)} stateLabel="Where the tub is" />
        </>
      }
      results={
        <>
          <ResultHero
            label={`${name} costs`}
            value={fmtMoney(r.perMonth, { cents: true })}
            unit="a month on average"
            sub={
              <>
                {fmtInt(r.kwhYear)} kWh a year · {MONTH_NAME[r.worst.idx]} up to {fmtMoney(r.worst.cost, { cents: true })} · {fmtMoneyPrecise(r.perDay)} a day
              </>
            }
          />
          <RateNote state={v.state} rateMode={v.rateMode} cents={v.cents} />
          <StatGrid
            stats={[
              { label: "Per year", value: fmtMoney(r.costYear), hint: `${fmtInt(r.kwhYear)} kWh`, emphasis: true },
              { label: `Coldest month (${MONTH_NAME[r.worst.idx].slice(0, 3)})`, value: fmtMoney(r.worst.cost, { cents: true }), hint: `air ${fmt(r.months[r.worst.idx].airF, 0)}°F` },
              { label: "Standby rating", value: fmtInt(c.standbyW), unit: "W", hint: `at a ${SPA.testDeltaF}°F water–air gap` },
              { label: "Average draw", value: fmtInt(r.kwhYear / 8.76), unit: "W", hint: `in ${indoor ? `a ${fmt(v.indoorF, 0)}°F room` : where}` },
            ]}
          />
          <MonthBars values={r.months.map((m) => m.cost)} format={(n) => fmtMoney(n)} highlight={r.worst.idx} caption={indoor ? "Monthly cost indoors" : `Monthly cost outdoors in ${where}`} />

          <ResultsHeading>Turn it down a notch</ResultsHeading>
          <OptionTable
            caption="Yearly cost by water temperature"
            columns={["Water", "Per year", "vs 102°F"]}
            highlight={SETPOINTS.indexOf(v.setpoint)}
            rows={bySetpoint.map((s) => [`${s.t}°F`, fmtMoney(s.year), s.t === 102 ? "—" : `${s.year < bySetpoint[2].year ? "−" : "+"}${fmtMoney(Math.abs(s.year - bySetpoint[2].year))}`])}
          />
          <Callout tone="info" title="What this includes">
            Keeping the covered tub at temperature, with its default filtration cycles — the condition California tests. Soaks with the cover off and jets running add more on top; industry estimates for a full year of use run {fmtInt(HOT_TUB_KWH_YEAR_RANGE[0])}–{fmtInt(HOT_TUB_KWH_YEAR_RANGE[1])} kWh.
          </Callout>
          {v.standby !== "label" ? (
            <Callout tone="tip" title="Using the legal maximum">
              {fmtInt(spaMaxStandbyW(v.gallons, spaKind(v)))} W is the most a {fmtInt(v.gallons)}-gallon {spaKind(v) === "inflatable" ? "inflatable" : "hard-shell"} spa sold in California may draw in standby. Enter your tub&apos;s listed rating for a closer figure.
            </Callout>
          ) : null}
          <TipList
            tips={[
              "Keep the cover on and replace it once it's waterlogged or sagging — the cover is part of the tested rating.",
              "Heat loss grows with the gap between water and air: each degree lower saves roughly the share shown in the table.",
              "Most of the year's cost lands in the coldest months — an enclosed or indoor tub sees a smaller gap; switch Location to compare.",
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
            calcName: "Hot tub cost",
            title: `${name} in ${where}`,
            summary: `${fmtMoney(r.perMonth, { cents: true })} a month on average, ${fmtMoney(r.costYear)} a year (${fmtInt(r.kwhYear)} kWh)`,
            items,
          })}
        />
      }
    />
  );
}
