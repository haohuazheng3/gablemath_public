"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { FieldSection, LengthField, NumberField, Segmented, SelectField, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtMoney } from "@/lib/format";
import { FT_PER_M, formatFeetInches } from "@/lib/units";
import { computeFenceCost, type Range } from "./compute";
import { FENCE_COST_DEFAULTS, fenceCostInputFrom, type FenceCostValues } from "./cost-model";
import { INSTALLED, LABOR_PER_LF, REMOVAL_PER_LF } from "./data";

const CALC_KEY = "fence/fence-cost-calculator";
const money = (r: Range) => `${fmtMoney(r[0], { cents: false })}–${fmtMoney(r[1], { cents: false })}`;

export default function FenceCostCalculator({ initial }: { initial?: Partial<FenceCostValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, FENCE_COST_DEFAULTS, initial);
  const { system } = useUnits();
  const r = useMemo(() => computeFenceCost(fenceCostInputFrom(v)), [v]);
  const m = r.material;
  const metric = system === "metric";
  const lengthLabel = (ft: number) => (metric ? `${fmt(ft / FT_PER_M, 1)} m` : formatFeetInches(ft));
  const L = Math.max(0, v.len);
  const gateCount = Math.max(0, Math.round(v.wg)) + Math.max(0, Math.round(v.dg));
  const calcLink = m.id === "chain-link" ? "/fence/chain-link-fence-calculator" : "/fence/fence-calculator";
  const diyNote = r.diy
    ? `${r.diy.hasEstimates ? "some prices estimated; " : ""}${r.diy.unpriced.length ? `plus ${r.diy.unpriced.length} small items we don't price` : "materials only, before tax"}`
    : "";

  const items: ShoppingItem[] = [
    { id: "fence", name: `${m.name} fence installed, ${fmt(L)} ft (${money(r.fence)})`, qty: 1, unit: "job", cost: (r.fence[0] + r.fence[1]) / 2 },
    ...(r.gates[1] > 0 ? [{ id: "gates", name: `Gates installed (${money(r.gates)})`, qty: gateCount - r.gatesUnpriced, unit: "gates", cost: (r.gates[0] + r.gates[1]) / 2 }] : []),
    ...(r.removal[1] > 0 ? [{ id: "removal", name: `Old fence removal (${money(r.removal)})`, qty: Math.round(L), unit: "ft", cost: (r.removal[0] + r.removal[1]) / 2 }] : []),
    ...(r.stain ? [{ id: "stain", name: `Pro staining, ${v.sides} side${v.sides === 1 ? "" : "s"} (${money(r.stain)})`, qty: Math.round(L * v.h * v.sides), unit: "sq ft", cost: (r.stain[0] + r.stain[1]) / 2 }] : []),
  ];

  return (
    <CalcFrame
      dock={{ label: "Installed", value: money(r.total) }}
      inputs={
        <>
          <FieldSection title="Your fence">
            <LengthField label="Fence length" value={v.len} onChange={(len) => set({ len })} help="All sides added together, gates included." />
            <SelectField
              label="Material"
              value={m.id}
              onChange={(mat) => set({ mat, h: INSTALLED.find((x) => x.id === mat)?.defaultHeight ?? v.h })}
              options={INSTALLED.map((x) => ({ value: x.id, label: `${x.name} — $${x.perLf[0]}–$${x.perLf[1]}/ft` }))}
              help={m.note}
            />
            <Segmented label="Height" columns={5} value={v.h} options={[3, 4, 5, 6, 8].map((h) => ({ value: h, label: `${h} ft` }))} onChange={(h) => set({ h })} />
          </FieldSection>

          <FieldSection title="Gates & extras">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Walk gates" value={v.wg} onChange={(wg) => set({ wg: Math.round(wg) })} step={1} min={0} max={6} decimals={0} />
              <NumberField label="Double drive gates" value={v.dg} onChange={(dg) => set({ dg: Math.round(dg) })} step={1} min={0} max={3} decimals={0} />
            </div>
            <ToggleField label="Remove the old fence" checked={v.rem} onChange={(rem) => set({ rem })} help={`$${REMOVAL_PER_LF[0]}–$${REMOVAL_PER_LF[1]} per foot to tear out and haul away (Fixr).`} />
            {m.stainable ? (
              <>
                <ToggleField label="Have it stained by a pro" checked={v.stain} onChange={(stain) => set({ stain })} help="$1.33–$2.71 per sq ft (Homewyse, May 2026). New pressure-treated wood must dry 1–3 months first." />
                {v.stain ? (
                  <Segmented
                    label="Sides to stain"
                    value={v.sides}
                    options={[
                      { value: 1, label: "Outside only" },
                      { value: 2, label: "Both sides" },
                    ]}
                    onChange={(sides) => set({ sides })}
                  />
                ) : null}
              </>
            ) : null}
          </FieldSection>

          <FieldSection title="Check a quote">
            <NumberField
              label="Contractor's total"
              value={v.quote}
              onChange={(quote) => set({ quote })}
              prefix="$"
              step={100}
              min={0}
              decimals={0}
              stepper={false}
              help="Optional. We'll show its price per foot and where it lands in the range."
            />
          </FieldSection>
        </>
      }
      results={
        <>
          <ResultHero
            label={`Installed ${m.name.toLowerCase()} fence`}
            value={fmtMoney(r.mid)}
            unit="midpoint"
            sub={
              <>
                Range {money(r.total)} for {lengthLabel(L)} — {fmtMoney(r.perLfAllIn[0], { cents: true })}–{fmtMoney(r.perLfAllIn[1], { cents: true })} per foot all-in · {m.source}
              </>
            }
          />
          <StatGrid
            stats={[
              { label: "Fence", value: `$${m.perLf[0]}–${m.perLf[1]}`, unit: "/ft", hint: money(r.fence) },
              {
                label: "Gates",
                value: String(gateCount),
                unit: gateCount === 1 ? "gate" : "gates",
                hint: !gateCount ? "none added" : r.gatesUnpriced ? `${r.gatesUnpriced} not priced — get a quote` : `${money(r.gates)} · ${m.gateSource}`,
              },
              { label: "Labor share", value: `$${LABOR_PER_LF[0]}–${LABOR_PER_LF[1]}`, unit: "/ft", hint: `${money(r.labor)} of the total (Modernize)` },
              r.stain
                ? { label: "Staining", value: fmt(L * v.h * v.sides), unit: "sq ft", hint: money(r.stain) }
                : { label: "Removal", value: `$${REMOVAL_PER_LF[0]}–${REMOVAL_PER_LF[1]}`, unit: "/ft", hint: r.removal[1] > 0 ? money(r.removal) : "not included" },
            ]}
          />

          <div className="rounded-[18px] border border-line p-4">
            <h3 className="text-[0.95rem] font-semibold text-ink">Build it yourself or hire it out?</h3>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <CompareTile title="DIY materials" value={r.diy ? fmtMoney(r.diy.materials) : "—"} win={!!r.diy && r.diy.materials < r.total[0]} note={r.diy ? diyNote : "not modeled for this material"} />
              <CompareTile title="Installed (midpoint)" value={fmtMoney(r.mid)} win={false} note={`range ${money(r.total)}`} />
            </div>
            <p className="mt-3 text-[0.84rem] leading-relaxed text-ink-2">
              {r.diy
                ? `Doing it yourself saves roughly ${money([Math.max(0, r.total[0] - r.diy.materials), Math.max(0, r.total[1] - r.diy.materials)])}, mostly labor: digging ${m.id === "chain-link" ? "a hole every 10 ft" : "a hole every 8 ft"}, setting posts in concrete and hanging every board or panel. `
                : ""}
              <Link href={calcLink} className="font-semibold text-accent">
                Count every post, board and bag →
              </Link>
            </p>
          </div>

          {r.quote ? (
            <Callout tone={r.quote.position === "above" ? "warn" : r.quote.position === "below" ? "tip" : "ok"} title={`Your quote: ${fmtMoney(r.quote.perLf, { cents: true })} per foot`}>
              {r.quote.position === "within"
                ? "That sits inside the national range for this material and these extras."
                : r.quote.position === "above"
                  ? "That is above the national range. High-cost areas, rocky soil, slopes, permits and premium materials all push prices up — ask the contractor to break out materials, labor and gates."
                  : "That is below the national range. Make sure it includes posts set in concrete, gates, removal and cleanup, and that the contractor is licensed and insured."}
            </Callout>
          ) : null}

          <ResultsHeading>Same {lengthLabel(L)} in other materials</ResultsHeading>
          <OptionTable
            caption="Installed cost by material"
            columns={["Material", "Per foot", "Fence only"]}
            highlight={r.compare.findIndex((c) => c.id === m.id)}
            rows={r.compare.map((c) => [c.name, `$${c.perLf[0]}–${c.perLf[1]}`, money(c.total)])}
          />

          <Callout tone="info" title={`Prices are rising: ${r.ppi.series} +${fmt(r.ppi.pct, 1)}%`}>
            The federal producer price index for {r.ppi.series} rose {fmt(r.ppi.pct, 1)}% from September 2025 to September 2026 (BLS). Cost guides lag the market, so treat older ranges as a floor
            and get two or three local quotes.
          </Callout>
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Fence cost",
            title: `${m.name} fence, ${lengthLabel(L)} installed`,
            summary: `${money(r.total)} installed (midpoint ${fmtMoney(r.mid)})`,
            items,
          })}
        />
      }
    />
  );
}

function CompareTile({ title, value, win, note }: { title: string; value: string; win: boolean; note: string }) {
  return (
    <div className={clsx("rounded-[14px] px-3.5 py-3 ring-1", win ? "bg-ok-soft ring-ok/30" : "bg-surface-2 ring-line")}>
      <div className="text-[0.76rem] font-medium text-ink-3">{title}</div>
      <div className="num mt-0.5 text-[1.25rem] font-semibold text-ink">{value}</div>
      <div className="text-[0.7rem] text-ink-3">
        {win ? "Cheaper ✓ · " : ""}
        {note}
      </div>
    </div>
  );
}
