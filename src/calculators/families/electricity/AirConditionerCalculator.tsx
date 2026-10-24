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
import { computeAc, fmtCents, windowSize } from "./compute";
import { AC_DEFAULTS, acCapacity, computeAcCalc, regionMinSeer2, type AcValues } from "./air-conditioner-model";
import { CENTRAL_TONS, DAYS_PER_MONTH, EER2_TYPICAL, MINI_SPLIT, MINI_SPLIT_BTU, MONTH_ABBR, MONTH_NAME, ROOM_AC_HOURS_PER_YEAR, SEER2_OPTIONS, US_CDD_NORMAL, WINDOW_AC } from "./data";
import { Disclosure, MonthBars, RateFields, RateNote, TipList } from "./ui";

const CALC_KEY = "electricity/air-conditioner-cost-calculator";

export default function AirConditionerCalculator({ initial }: { initial?: Partial<AcValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, AC_DEFAULTS, initial);
  const c = useMemo(() => computeAcCalc(v), [v]);
  const { r, info, rate } = c;
  const where = info.code === "US" ? "the U.S." : info.name;
  const climate = v.usage !== "custom";
  const size = windowSize(v.btu);
  const regionMin = regionMinSeer2(v.state);
  const cddYear = info.cdd.reduce((s, x) => s + x, 0);
  const name =
    c.type === "window" ? `${fmtInt(v.btu)} BTU window AC` : c.type === "minisplit" ? `${fmtInt(v.msBtu)} BTU mini-split` : `${fmt(v.tons)}-ton central AC`;

  const alternatives = useMemo(() => {
    const opts =
      c.type === "window"
        ? [
            { label: `ENERGY STAR average (CEER ${size.esCeer})`, eff: size.esCeer },
            { label: `2026 federal minimum (CEER ${size.minCeer})`, eff: size.minCeer },
          ]
        : c.type === "minisplit"
          ? [
              { label: `ENERGY STAR average (SEER2 ${MINI_SPLIT.seer2})`, eff: MINI_SPLIT.seer2 },
              { label: "SEER2 18", eff: 18 },
            ]
          : SEER2_OPTIONS.map((o) => ({ label: `SEER2 ${o.label} (${o.sub})`, eff: o.value }));
    return opts.map((o) => ({
      ...o,
      year: computeAc({ btuh: acCapacity(v), efficiency: o.eff, qty: v.qty, usage: climate ? "climate" : "custom", hoursPerDay: v.hours, daysPerYear: v.days, info, cents: rate.cents }).annualCost,
    }));
  }, [c.type, size, v, climate, info, rate.cents]);

  const items: ShoppingItem[] = [
    { id: "ac-season", name: `${name} — cooling season electricity`, qty: Math.round(r.annualKwh), unit: "kWh", cost: r.annualCost, note: `${fmtInt(r.annualHours)} full-load hours at ${fmtCents(rate.cents)}/kWh` },
  ];

  return (
    <CalcFrame
      showUnitToggle={false}
      dock={{ label: climate ? `${MONTH_ABBR[r.peak.idx]} cost` : "Per month", value: fmtMoney(r.perMonth, { cents: true }) }}
      inputs={
        <>
          <FieldSection title="Your air conditioner">
            <Segmented
              label="Type"
              value={c.type}
              options={[
                { value: "central", label: "Central" },
                { value: "window", label: "Window" },
                { value: "minisplit", label: "Mini-split" },
              ]}
              onChange={(type) => set({ type })}
            />
            {c.type === "central" ? (
              <>
                <Segmented label="Size" columns={4} value={v.tons} options={CENTRAL_TONS.map((t) => ({ value: t, label: `${fmt(t)} ton`, sub: `${fmtInt(t * 12000)}` }))} onChange={(tons) => set({ tons })} help="1 ton = 12,000 BTU/h. It's in the outdoor unit's model number: 24 = 2 ton, 36 = 3 ton, 48 = 4 ton." />
                <Segmented label="Efficiency (SEER2)" columns={4} value={SEER2_OPTIONS.some((o) => o.value === v.seer2) ? v.seer2 : -1} options={SEER2_OPTIONS} onChange={(seer2) => seer2 > 0 && set({ seer2 })} />
                <NumberField label="Exact SEER2" value={v.seer2} onChange={(seer2) => set({ seer2 })} step={0.5} min={1} max={40} decimals={1} help={`New split systems sold for ${where} must be at least SEER2 ${regionMin}. SEER2 is on the EnergyGuide label or AHRI certificate.`} />
              </>
            ) : c.type === "window" ? (
              <>
                <Segmented label="Size" columns={4} value={v.btu} options={WINDOW_AC.map((w) => ({ value: w.btu, label: `${fmt(w.btu / 1000)}k`, sub: "BTU" }))} onChange={(btu) => set({ btu })} />
                <Segmented
                  label="Efficiency"
                  value={v.ceerMode}
                  options={[
                    { value: "es", label: "ENERGY STAR", sub: `CEER ${size.esCeer}` },
                    { value: "min", label: "New (2026+)", sub: `CEER ${size.minCeer}` },
                    { value: "custom", label: "My CEER", sub: "from label" },
                  ]}
                  onChange={(ceerMode) => set({ ceerMode })}
                />
                {v.ceerMode === "custom" ? <NumberField label="CEER" value={v.ceer} onChange={(ceer) => set({ ceer })} step={0.5} min={1} max={30} decimals={1} help="Combined Energy Efficiency Ratio, on the EnergyGuide label." /> : null}
              </>
            ) : (
              <>
                <Segmented label="Size" columns={4} value={v.msBtu} options={MINI_SPLIT_BTU.map((b) => ({ value: b, label: `${fmt(b / 1000)}k`, sub: "BTU" }))} onChange={(msBtu) => set({ msBtu })} />
                <NumberField label="SEER2" value={v.msSeer2} onChange={(msSeer2) => set({ msSeer2 })} step={0.5} min={1} max={45} decimals={1} help={`ENERGY STAR mini-splits around 12,000 BTU average SEER2 ${MINI_SPLIT.seer2}.`} />
              </>
            )}
          </FieldSection>

          <FieldSection title="How much it runs">
            <Segmented
              label="Run time"
              value={climate ? "climate" : "custom"}
              options={[
                { value: "climate", label: "From my state's climate" },
                { value: "custom", label: "I'll set the hours" },
              ]}
              onChange={(usage) => set({ usage })}
              help={
                climate
                  ? `${fmtInt(r.annualHours)} full-load hours a year: DOE's ${ROOM_AC_HOURS_PER_YEAR}-hour national basis × ${fmtInt(cddYear)} cooling degree days in ${where} ÷ ${fmtInt(US_CDD_NORMAL)} U.S.`
                  : "Count the hours the compressor actually runs, not the hours the system is switched on."
              }
            />
            {climate ? null : (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Hours a day" value={v.hours} onChange={(hours) => set({ hours })} step={1} max={24} decimals={1} />
                <NumberField label="Days a year" value={v.days} onChange={(days) => set({ days })} step={7} max={365} decimals={0} />
              </div>
            )}
          </FieldSection>

          {c.type === "window" ? (
            <Disclosure label="Number of window units">
              <NumberField label="Identical units" value={v.qty} onChange={(qty) => set({ qty: Math.max(1, Math.round(qty)) })} step={1} min={1} max={20} decimals={0} />
            </Disclosure>
          ) : null}

          <RateFields state={v.state} rateMode={v.rateMode} cents={v.cents} onChange={(p) => set(p)} />
        </>
      }
      results={
        <>
          <ResultHero
            label={climate ? `${name} in ${MONTH_NAME[r.peak.idx]}` : `${name} costs`}
            value={fmtMoney(r.perMonth, { cents: true })}
            unit="a month"
            sub={
              <>
                {fmtMoney(r.annualCost)} a year ({fmtInt(r.annualKwh)} kWh) · {fmtMoneyPrecise(r.perHour)} per hour running
              </>
            }
          />
          <RateNote state={v.state} rateMode={v.rateMode} cents={v.cents} />
          <StatGrid
            stats={[
              { label: "Per hour running", value: fmtMoneyPrecise(r.perHour), hint: `${fmt(r.watts / 1000, 2)} kW average draw`, emphasis: true },
              { label: climate ? `Busiest month (${MONTH_ABBR[r.peak.idx]})` : "Per day", value: climate ? `${fmt(r.peak.hoursPerDay, 1)} h` : fmtMoneyPrecise(r.perMonth / DAYS_PER_MONTH), hint: climate ? "full-load hours a day" : `${fmt(v.hours)} h running` },
              { label: "Per year", value: fmtMoney(r.annualCost), hint: `${fmtInt(r.annualHours)} full-load hours` },
              { label: "Capacity", value: fmtInt(c.capacity), unit: "BTU/h", hint: `${c.type === "window" ? "CEER" : "SEER2"} ${fmt(c.efficiency, 2)}` },
            ]}
          />
          <MonthBars values={r.months.map((m) => m.cost)} format={(n) => fmtMoney(n)} highlight={r.peak.idx} caption={climate ? `Estimated monthly cost in ${where}` : "Monthly cost on your schedule"} />

          <ResultsHeading>Same use, other efficiency</ResultsHeading>
          <OptionTable
            caption="Yearly cost by efficiency rating"
            columns={["Efficiency", "Per year", "vs yours"]}
            highlight={alternatives.findIndex((a) => Math.abs(a.eff - c.efficiency) < 0.01)}
            rows={alternatives.map((a) => [a.label, fmtMoney(a.year), a.year - r.annualCost === 0 ? "—" : `${a.year > r.annualCost ? "+" : "−"}${fmtMoney(Math.abs(a.year - r.annualCost))}`])}
          />
          {c.type === "central" ? (
            <Callout tone="info" title="On a 95°F afternoon">
              SEER2 is a season average. At the hottest hours a typical {fmt(v.tons)}-ton system (EER2 {EER2_TYPICAL}) draws about {fmt((v.tons * 12000) / EER2_TYPICAL / 1000, 1)} kW — {fmtMoneyPrecise(((v.tons * 12000) / EER2_TYPICAL / 1000) * (rate.cents / 100))} an hour.
            </Callout>
          ) : null}
          {c.type === "window" && v.ceerMode === "es" && size.esCeer < size.minCeer ? (
            <Callout tone="tip" title="New units beat this average">
              Window units of this size made since May 26, 2026 must reach CEER {size.minCeer}; the ENERGY STAR list still includes older models averaging {size.esCeer}.
            </Callout>
          ) : null}
          <TipList
            tips={[
              "Raise the thermostat a few degrees and run a ceiling fan instead — an ENERGY STAR fan uses about 35 W on high.",
              "Change the filter and keep the outdoor coil clear of leaves and grass so the system moves heat as rated.",
              "Close blinds on sun-facing windows in the afternoon, when cooling hours peak.",
              ...(c.type === "window" ? ["Pick the size for the room: an oversized window unit cycles on and off and leaves the air clammy."] : []),
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
            calcName: "Air conditioner cost",
            title: `${name} in ${where}`,
            summary: `${fmtMoney(r.annualCost)} a year, ${fmtMoney(r.perMonth, { cents: true })} in the busiest month at ${fmtCents(rate.cents)}/kWh`,
            items,
          })}
        />
      }
    />
  );
}
