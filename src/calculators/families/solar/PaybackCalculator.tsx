"use client";

import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { FieldSection, NumberField, Segmented, SelectField, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { verdictFor } from "./compute";
import { FEDERAL, STATE_OPTIONS, exportLabel, stateSolar } from "./data";
import { BreakEvenChart } from "./parts";
import { PAYBACK_DEFAULTS, computePaybackCalc, stateValues, type PaybackValues } from "./payback-model";

const CALC_KEY = "solar/solar-payback-calculator";

const VERDICT_TEXT = {
  strong: "Strong case — pays back well inside the panel warranty.",
  solid: "Solid — pays back in about half the panels' 25-year life.",
  marginal: "Marginal — the payoff depends on rates rising and the panels lasting.",
  weak: "Weak at these numbers — it does not pay back in a reasonable time.",
};

export default function PaybackCalculator({ initial }: { initial?: Partial<PaybackValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, PAYBACK_DEFAULTS, initial);
  const [more, setMore] = useState(false);
  const r = useMemo(() => computePaybackCalc(v), [v]);
  const s = stateSolar(v.state);
  const verdict = verdictFor(r.paybackYears);
  const pb = r.paybackYears;
  const hasStateInc = Boolean(s.upfront || s.perf);

  const items: ShoppingItem[] = [
    { id: "pv", name: `Solar PV system, ${fmt(r.kw, 2)} kW DC`, qty: 1, unit: "system", cost: r.grossSolar },
    ...(v.battery ? [{ id: "battery", name: `Home battery, ${fmt(v.battKwh, 1)} kWh`, qty: 1, unit: "battery", cost: r.grossBattery }] : []),
  ];

  return (
    <CalcFrame
      dock={{ label: "Payback", value: pb != null ? `${fmt(pb, 1)} years` : "Over 25 years" }}
      inputs={
        <>
          <FieldSection title="Your home">
            <SelectField
              label="State"
              value={v.state}
              options={STATE_OPTIONS}
              onChange={(state) => {
                const ns = stateSolar(state);
                set({ ...stateValues(ns), ...(v.kwh === s.avgKwh ? { kwh: ns.avgKwh } : {}) });
              }}
              help={`${fmtInt(s.yield)} kWh per kW a year in ${s.city}; ${exportLabel(s)}.`}
            />
            <NumberField label="Electricity use" value={v.kwh} onChange={(kwh) => set({ kwh })} suffix="kWh/mo" step={50} min={0} max={20000} decimals={0} help={`State average: ${fmtInt(s.avgKwh)} kWh/mo (EIA 2025).`} />
            <NumberField label="Electricity price" value={v.rate} onChange={(rate) => set({ rate })} suffix="¢/kWh" step={0.5} min={1} max={100} decimals={2} help={`EIA Jan–Aug 2026 average: ${fmt(s.rate, 2)}¢.`} />
          </FieldSection>

          <FieldSection title="The system">
            <Segmented
              label="Size"
              value={v.sizeMode}
              options={[
                { value: "auto", label: "Match my use" },
                { value: "custom", label: "I have a quote" },
              ]}
              onChange={(sizeMode) => set({ sizeMode, ...(sizeMode === "custom" ? { kw: Math.round(r.kw * 100) / 100 } : {}) })}
            />
            {v.sizeMode === "custom" ? (
              <NumberField label="System size" value={v.kw} onChange={(kw) => set({ kw })} suffix="kW DC" step={0.5} min={0} max={100} decimals={2} />
            ) : (
              <NumberField label="Offset target" value={v.offset} onChange={(offset) => set({ offset })} suffix="% of use" step={5} min={10} max={150} decimals={0} hint={`= ${fmt(r.kw, 2)} kW`} help={s.export.mode === "retail" ? "100% fits 1:1 net metering." : "70% is the usual sweet spot where exports earn less than retail."} />
            )}
            <NumberField
              label="Installed price"
              value={v.costW}
              onChange={(costW) => set({ costW })}
              prefix="$"
              suffix="/W"
              step={0.05}
              min={0.5}
              max={10}
              decimals={2}
              help={s.costIsNational ? "National EnergySage median (no state figure). Enter your quote ÷ watts." : `EnergySage ${s.name} average, Oct 2026. Enter your quote ÷ watts.`}
            />
          </FieldSection>

          <FieldSection title="Credits and incentives">
            <NumberField
              label="Federal tax credit"
              value={v.fed}
              onChange={(fed) => set({ fed })}
              suffix="%"
              step={5}
              min={0}
              max={30}
              decimals={0}
              help="0% for a system you buy in 2026: the 25D credit ended for installations completed after Dec 31, 2025."
            />
            {hasStateInc ? (
              <ToggleField label="Include state incentive" checked={v.stateInc} onChange={(stateInc) => set({ stateInc })} help={[s.upfront?.label, s.perf?.label].filter(Boolean).join(" · ")} />
            ) : null}
          </FieldSection>

          <FieldSection title="Battery">
            <ToggleField label="Add a home battery" checked={v.battery} onChange={(battery) => set({ battery })} help="No federal credit for a battery you buy in 2026 either." />
            {v.battery ? (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Capacity" value={v.battKwh} onChange={(battKwh) => set({ battKwh })} suffix="kWh" step={0.5} min={0} max={100} decimals={1} />
                <NumberField label="Price" value={v.battCost} onChange={(battCost) => set({ battCost })} prefix="$" suffix="/kWh" step={25} min={0} max={5000} decimals={0} />
              </div>
            ) : null}
          </FieldSection>

          <div>
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-[0.99]"
            >
              Export credits, rate increases & aging
              <span aria-hidden className={clsx("transition-transform duration-200", more && "rotate-180")}>
                ⌄
              </span>
            </button>
            {more ? (
              <div className="animate-rise mt-4 space-y-4">
                <Segmented
                  label="Exported kWh are credited at"
                  columns={3}
                  value={v.exportMode}
                  options={[
                    { value: "retail", label: "Retail (1:1)" },
                    { value: "pct", label: "% of retail" },
                    { value: "cents", label: "Fixed ¢/kWh" },
                  ]}
                  onChange={(exportMode) => set({ exportMode, exportVal: exportMode === "pct" ? 50 : exportMode === "cents" ? 5 : 100 })}
                  help={s.export.estimate ? "Your state's default here is an estimate — check your utility's tariff." : undefined}
                />
                {v.exportMode === "pct" ? <NumberField label="Export credit" value={v.exportVal} onChange={(exportVal) => set({ exportVal })} suffix="% of retail" step={5} min={0} max={100} decimals={0} /> : null}
                {v.exportMode === "cents" ? <NumberField label="Export credit" value={v.exportVal} onChange={(exportVal) => set({ exportVal })} suffix="¢/kWh" step={0.25} min={0} max={50} decimals={2} /> : null}
                {v.exportMode !== "retail" ? (
                  <NumberField label="Solar used as it's made" value={v.selfUse} onChange={(selfUse) => set({ selfUse })} suffix="%" step={5} min={0} max={100} decimals={0} help="Estimate: about 40% without a battery; higher if you run loads at midday." />
                ) : (
                  <NumberField label="Year-end payout for surplus kWh" value={v.excess} onChange={(excess) => set({ excess })} suffix="¢/kWh" step={0.5} min={0} max={50} decimals={2} help="Most utilities pay little or nothing for kWh above your annual use." />
                )}
                <NumberField label="Electricity price increase" value={v.esc} onChange={(esc) => set({ esc })} suffix="%/yr" step={0.5} min={-5} max={15} decimals={1} help="EIA: 3.05%/yr nominal over 2005–2025; 5.55%/yr over 2020–2025." />
                <NumberField label="Panel degradation" value={v.deg} onChange={(deg) => set({ deg })} suffix="%/yr" step={0.1} min={0} max={3} decimals={2} help="0.5% is typical; hot-climate fleets average 0.88%." />
              </div>
            ) : null}
          </div>
        </>
      }
      results={
        <>
          <ResultHero
            label="Payback"
            value={pb != null ? fmt(pb, 1) : "25+"}
            unit="years"
            sub={
              <>
                {fmtMoney(r.netCost)} net cost · {fmtMoney(r.savings1)} saved in year 1 · {r.netAfterYears >= 0 ? `${fmtMoney(r.netAfterYears)} ahead` : `${fmtMoney(-r.netAfterYears)} behind`} after 25 years
              </>
            }
          />
          <Callout tone={verdict === "weak" ? "warn" : verdict === "marginal" ? "info" : "ok"}>{VERDICT_TEXT[verdict]}</Callout>

          <div className="rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            <BreakEvenChart start={-r.outlay} points={r.rows} payback={pb} />
          </div>

          <StatGrid
            stats={[
              { label: "System", value: fmt(r.kw, 2), unit: "kW DC", hint: `${fmtInt(r.production1)} kWh in year 1 (${fmt(r.offset1 * 100, 0)}% of use)` },
              { label: "Year-1 savings", value: fmtMoney(r.savings1), hint: `${fmtMoney(r.savings1 / 12)} a month` },
              { label: "Bill without solar", value: fmtMoney(r.billBefore1), unit: "/yr", hint: `${fmt(v.rate, 2)}¢ × ${fmtInt(v.kwh * 12)} kWh` },
              { label: "25-year savings", value: fmtMoney(r.lifetimeSavings), hint: "before subtracting the cost" },
            ]}
          />

          <ResultsHeading>Cost after incentives</ResultsHeading>
          <OptionTable
            caption="Cost breakdown"
            columns={["Item", "Amount"]}
            rows={[
              [`Solar, ${fmt(r.kw, 2)} kW × $${fmt(v.costW, 2)}/W`, fmtMoney(r.grossSolar)],
              ...(v.battery ? [[`Battery, ${fmt(v.battKwh, 1)} kWh × $${fmtInt(v.battCost)}`, fmtMoney(r.grossBattery)]] : []),
              [`Federal credit (${fmt(v.fed, 0)}%)`, r.federal > 0 ? `−${fmtMoney(r.federal)}` : "$0"],
              ...(r.stateTotal > 0 ? [[s.upfront?.perYear ? "State credit (spread over years)" : "State incentive", `−${fmtMoney(r.stateTotal)}`]] : []),
              ["Net cost", fmtMoney(r.netCost)],
            ]}
            highlight={(v.battery ? 3 : 2) + (r.stateTotal > 0 ? 1 : 0)}
          />

          {v.exportMode !== "retail" ? (
            <Callout tone="info" title="Where year-1 savings come from">
              {fmtInt(r.split1.selfUsed)} kWh used at home at {fmt(v.rate, 1)}¢{r.split1.shifted > 0 ? `, ${fmtInt(r.split1.shifted)} kWh shifted by the battery` : ""}, and {fmtInt(r.split1.exported)} kWh exported at {v.exportMode === "cents" ? `${fmt(v.exportVal, 2)}¢` : `${fmt(v.exportVal, 0)}% of retail`}.
            </Callout>
          ) : v.battery ? (
            <Callout tone="tip">With 1:1 net metering the grid already credits exports at full price, so a battery adds backup power but almost no bill savings here.</Callout>
          ) : null}
          {r.year1 && r.year1.fees > 0 ? <Callout tone="warn">Includes {s.fees?.label}: about {fmtMoney(r.year1.fees)} in year 1.</Callout> : null}
          <Callout tone="info" title="2026 tax credit status">
            Homeowners who buy: 0% federal credit (25D ended for systems finished after Dec 31, 2025). Lease or PPA: the owner may still claim the {FEDERAL.tpoRatePct}% 48E credit if construction began by July 4, 2026 or the system is in service by Dec 31, 2027 — ask whether the quote passes it through.
          </Callout>
          <Callout tone="info" title={`${s.code === "US" ? "National" : s.name} export rules`}>
            {s.policy}
          </Callout>
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Solar payback",
            title: `Solar payback, ${fmt(r.kw, 1)} kW in ${s.code === "US" ? "the U.S." : s.name}`,
            summary: `${fmtMoney(r.netCost)} net · ${pb != null ? `${fmt(pb, 1)}-yr payback` : "no payback in 25 yrs"} · ${fmtMoney(r.netAfterYears)} after 25 yrs`,
            items,
          })}
        />
      }
    />
  );
}
