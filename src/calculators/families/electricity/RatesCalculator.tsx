"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { FieldSection, NumberField, Segmented, SelectField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { billFor, centsFor, fmtCents, ratesRanked, stateInfo } from "./compute";
import { RATES } from "./data";
import { RATES_DEFAULTS, computeRatesCalc, type RatesValues } from "./rates-model";

const CALC_KEY = "electricity/electricity-rates-by-state";
const KWH_ROWS = [500, 1000, 1500];

export default function RatesCalculator({ initial }: { initial?: Partial<RatesValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, RATES_DEFAULTS, initial);
  const c = useMemo(() => computeRatesCalc(v), [v]);
  const ranked = useMemo(() => ratesRanked(c.mode), [c.mode]);
  const name = c.isUs ? "U.S. average" : c.row.state;
  const signed = (n: number) => `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n), 1)}%`;
  const q = c.isUs ? "" : `?state=${c.row.code}`;
  const slug = c.isUs ? null : c.info.slug;

  const items: ShoppingItem[] = [
    { id: "bill-month", name: `Electricity, ${fmtInt(v.kwh)} kWh in ${name}`, qty: v.kwh, unit: "kWh", cost: c.bill, note: `at ${fmtCents(c.cents)}/kWh (${c.mode === "month" ? RATES.monthLabel : RATES.period})` },
  ];

  return (
    <CalcFrame
      showUnitToggle={false}
      dock={{ label: name, value: `${fmtCents(c.cents)}/kWh` }}
      inputs={
        <>
          <FieldSection title="Look up a state">
            <SelectField
              label="State"
              value={v.state}
              onChange={(code) => set({ state: code, kwh: stateInfo(code).kwh })}
              options={[{ value: "US", label: "United States (average)" }, ...RATES.states.map((s) => ({ value: s.code, label: s.state, group: "States" }))]}
            />
            <Segmented
              label="Price basis"
              value={c.mode}
              options={[
                { value: "ytd", label: "2026 average", sub: RATES.period },
                { value: "month", label: "Latest month", sub: RATES.monthLabel },
              ]}
              onChange={(rateMode) => set({ rateMode })}
            />
          </FieldSection>
          <FieldSection title="Price your bill">
            <NumberField
              label="Electricity use"
              value={v.kwh}
              onChange={(kwh) => set({ kwh })}
              suffix="kWh/month"
              step={50}
              max={20000}
              decimals={0}
              help={`The average ${c.isUs ? "U.S." : c.row.state} home used ${fmtInt(c.info.kwh)} kWh a month in 2025 (EIA). Your bill shows yours.`}
            />
            <Segmented
              label="Quick pick"
              columns={4}
              value={v.kwh}
              options={[...KWH_ROWS.map((k) => ({ value: k, label: fmtInt(k), sub: "kWh" })), { value: c.info.kwh, label: "Average", sub: `${fmtInt(c.info.kwh)}` }]}
              onChange={(kwh) => set({ kwh })}
            />
          </FieldSection>
        </>
      }
      results={
        <>
          <ResultHero
            label={`${name} residential electricity`}
            value={fmtCents(c.cents)}
            unit="per kWh"
            sub={
              <>
                {c.mode === "month" ? RATES.monthLabel : `${RATES.period} average`} (EIA) · {fmtInt(v.kwh)} kWh costs {fmtMoney(c.bill, { cents: true })}
              </>
            }
          />
          <StatGrid
            stats={[
              c.isUs
                ? { label: "States above average", value: `${ranked.filter((s) => centsFor(s, c.mode) > c.usCents).length}`, unit: "of 51" }
                : { label: "Rank (1 = priciest)", value: `#${c.rank}`, unit: "of 51", hint: `${c.vsUsPct >= 0 ? "above" : "below"} U.S. by ${fmt(Math.abs(c.vsUsPct), 0)}%`, emphasis: true },
              { label: `vs ${RATES.monthLabel.replace(/\d{4}/, "")}last year`, value: signed(c.yoyMonthPct), hint: `${fmtCents(c.row.centsPrevYear)} → ${fmtCents(c.row.cents)}` },
              { label: "Year to date vs 2025", value: signed(c.yoyYtdPct), hint: `${fmtCents(c.row.ytdPrevYearCents)} → ${fmtCents(c.row.ytdCents)}` },
              { label: "Typical bill now", value: fmtMoney(c.avgBillNow), hint: `${fmtInt(c.info.kwh)} kWh × ${fmtCents(c.cents)}` },
            ]}
          />

          <RankStrip ranked={ranked} mode={c.mode} highlight={c.row.code} usCents={c.usCents} />

          <ResultsHeading>What a month of electricity costs</ResultsHeading>
          <OptionTable
            caption="Monthly cost at this price"
            columns={["Use", name, "U.S. average"]}
            highlight={3}
            rows={[...KWH_ROWS, v.kwh].map((k, i) => [i === 3 ? `${fmtInt(k)} kWh (yours)` : `${fmtInt(k)} kWh`, fmtMoney(billFor(k, c.cents), { cents: true }), fmtMoney(billFor(k, c.usCents), { cents: true })])}
          />

          <ResultsHeading>Heating fuels in {c.isUs ? "the U.S." : c.row.state}</ResultsHeading>
          <OptionTable
            caption="Residential heating fuel prices"
            columns={["Fuel", "Price", "Basis"]}
            rows={[
              ["Electricity", `${fmtCents(c.cents)}/kWh`, c.mode === "month" ? RATES.monthLabel : RATES.period],
              ["Natural gas", `$${c.info.gas.toFixed(2)}/therm`, `${c.info.gasYear} average`],
              ...(c.info.propane != null ? [["Propane", `$${c.info.propane.toFixed(2)}/gal`, "Oct 19, 2026, pre-tax"]] : []),
              ...(c.info.oil != null ? [["Heating oil", `$${c.info.oil.toFixed(2)}/gal`, "Oct 19, 2026, pre-tax"]] : []),
            ]}
          />

          <div className="rounded-[18px] border border-line p-4">
            <h3 className="text-[0.95rem] font-semibold text-ink">Run the numbers for {c.isUs ? "your home" : c.row.state}</h3>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {[
                { label: "Space heater cost", href: slug ? `/electricity/space-heater-cost-calculator/${slug}` : "/electricity/space-heater-cost-calculator" },
                { label: "Air conditioner cost", href: slug ? `/electricity/air-conditioner-cost-calculator/${slug}` : "/electricity/air-conditioner-cost-calculator" },
                { label: "EV charging cost", href: slug ? `/electricity/ev-charging-cost-calculator/${slug}` : "/electricity/ev-charging-cost-calculator" },
                { label: "Any appliance", href: `/electricity/electricity-cost-calculator${q}` },
                { label: "Hot tub cost", href: `/electricity/hot-tub-cost-calculator${q}` },
                { label: "Refrigerator cost", href: `/electricity/refrigerator-cost-calculator${q}` },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="block rounded-[12px] px-2.5 py-1.5 text-[0.88rem] font-medium text-accent transition hover:bg-surface-2">
                    {l.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <ShoppingList title="Energy budget" items={items} calcKey={CALC_KEY} />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Electricity rate",
            title: `${name}: ${fmtCents(c.cents)}/kWh`,
            summary: `${fmtInt(v.kwh)} kWh a month ≈ ${fmtMoney(c.bill, { cents: true })}`,
            items,
          })}
        />
      }
    />
  );
}

/** All 51 prices as a sorted bar strip, the selected state highlighted and the U.S. average marked. */
function RankStrip({ ranked, mode, highlight, usCents }: { ranked: ReturnType<typeof ratesRanked>; mode: "ytd" | "month"; highlight: string; usCents: number }) {
  const w = 357;
  const h = 96;
  const max = centsFor(ranked[0], mode);
  const bw = w / ranked.length;
  const y = (cents: number) => h - 16 - ((h - 26) * cents) / max;
  const hi = ranked.find((s) => s.code === highlight);
  return (
    <figure className="rounded-[18px] border border-line bg-surface-2 px-3 pb-2 pt-3">
      <figcaption className="px-1 text-[0.8rem] font-semibold text-ink-2">All 50 states + DC, most to least expensive</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-auto w-full" role="img" aria-label={`Ranked from ${ranked[0].state} (${fmtCents(max)}) to ${ranked[ranked.length - 1].state} (${fmtCents(centsFor(ranked[ranked.length - 1], mode))})${hi ? `; ${hi.state} ${fmtCents(centsFor(hi, mode))}` : ""}`}>
        {ranked.map((s, i) => {
          const on = s.code === highlight;
          return <rect key={s.code} x={i * bw + 0.6} y={y(centsFor(s, mode))} width={bw - 1.2} height={h - 16 - y(centsFor(s, mode))} rx="1.2" fill={on ? "var(--accent)" : "var(--ink-3)"} opacity={on ? 1 : 0.3} />;
        })}
        <line x1="0" x2={w} y1={y(usCents)} y2={y(usCents)} stroke="var(--ink-2)" strokeDasharray="3 3" strokeWidth="1" />
        <text x={w} y={y(usCents) - 3} textAnchor="end" fontSize="9.5" fill="var(--ink-2)">
          U.S. {fmtCents(usCents)}
        </text>
        <text x="0" y={h - 3} fontSize="9.5" fill="var(--ink-3)">
          {ranked[0].code} {fmt(max, 1)}¢
        </text>
        <text x={w} y={h - 3} textAnchor="end" fontSize="9.5" fill="var(--ink-3)">
          {ranked[ranked.length - 1].code} {fmt(centsFor(ranked[ranked.length - 1], mode), 1)}¢
        </text>
      </svg>
    </figure>
  );
}
