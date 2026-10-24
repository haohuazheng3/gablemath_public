"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { FieldSection, LengthField, NumberField, Segmented, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { CUFT_PER_CUM, SQFT_PER_SQM, formatFeetInches } from "@/lib/units";
import { computeSteps } from "./compute";
import { BAG_YIELD_CUFT, BAGS_PER_PALLET, GRAVEL_BASE, IRC_STAIRS, product } from "./data";
import { StepsProfile } from "./diagrams";
import { BagsVsTruck, CheckList, MixFields, MoreOptions, ProductTimeline } from "./parts";
import { STEPS_DEFAULTS, stepLayout, stepsInputFrom, type StepsValues } from "./steps-model";

const CALC_KEY = "concrete/steps-calculator";
const CM_PER_IN = 2.54;

export default function StepsCalculator({ initial }: { initial?: Partial<StepsValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, STEPS_DEFAULTS, initial);
  const { system } = useUnits();
  const r = useMemo(() => computeSteps(stepsInputFrom(v)), [v]);
  const layout = stepLayout(v);
  const p = product(v.product);
  const o = r.order;
  const sizeLabel = `${o.bagSize}-lb`;
  const metric = system === "metric";
  const landing = v.top !== "existing";
  const unitPrice = o.bagsBySize.find((b) => b.size === o.bagSize)?.price;
  const pallet = BAGS_PER_PALLET[o.bagSize];
  const what = `${layout.steps} step${layout.steps === 1 ? "" : "s"}, ${fmt(v.width, 1)} ft wide${landing ? ` with a ${fmt(v.land, 1)} in landing` : ""}`;
  const cubic = metric ? `${fmt(o.cuftWithWaste / CUFT_PER_CUM, 2)} m³` : `${fmt(o.cuydWithWaste, 2)} yd³`;

  const items: ShoppingItem[] = [
    { id: "bags", name: `${p.short} — ${sizeLabel} bags`, qty: o.bags, unit: "bags", cost: o.bagCost },
    ...(r.gravel ? [{ id: "gravel", name: `Crusher run / road base (${GRAVEL_BASE.depthIn} in compacted)`, qty: Math.round(r.gravel.tons * 10) / 10, unit: "tons" }] : []),
    ...(r.forms.risers
      ? [
          { id: "risers", name: `${r.forms.riserLumber} riser boards, ${formatFeetInches(r.forms.widthFt)} long`, qty: r.forms.risers, unit: "boards", note: `ripped to ${fmt(layout.riseIn, 2)} in; bevel the bottom edge so you can trowel the tread` },
          { id: "sides", name: `Plywood for side forms (2 pieces, ${fmt(r.forms.sideLengthIn, 0)} × ${fmt(r.forms.sideHeightIn, 0)} in)`, qty: r.forms.plywoodSheets, unit: "sheets" },
        ]
      : []),
    { id: "water", name: "Clean water for mixing", qty: Math.ceil(o.waterGal[1]), unit: "gal", note: `${fmt(o.waterGal[0], 0)}–${fmt(o.waterGal[1], 0)} gal; start low, never exceed the max` },
  ];

  const costLines: CostLine[] =
    unitPrice != null
      ? [{ priceId: `concrete-${p.id}-${o.bagSize}`, label: `${sizeLabel} ${p.short}`, qty: o.bags, unit: "bags", defaultPrice: unitPrice, note: pallet && o.bags >= pallet && p.bulkPrice?.[o.bagSize] ? `Pallet price applied (${pallet}+ bags)` : undefined }]
      : [];

  const checks = [
    { label: `Riser ${fmt(layout.riseIn, 2)} in`, ok: r.checks.riserOk, detail: `IRC R311.7.5.1: 7¾ in maximum, all risers within ⅜ in of each other.` },
    {
      label: `Tread ${fmt(v.run, 2)} in`,
      ok: r.checks.treadOk && !r.checks.nosingNeeded,
      detail: r.checks.treadOk ? (r.checks.nosingNeeded ? "Meets the 10 in minimum, but under 11 in a ¾–1¼ in nosing is required (R311.7.5.3)." : "11 in or more: no nosing needed (R311.7.5.3 exception).") : "IRC R311.7.5.2: 10 in minimum.",
    },
    ...(r.checks.landingOk != null ? [{ label: `Landing ${fmt(v.land, 1)} in deep`, ok: r.checks.landingOk, detail: "R311.3: at least 36 in deep and as wide as the door it serves." }] : []),
    { label: r.checks.handrail ? "Handrail required" : "No handrail required", ok: !r.checks.handrail, detail: `R311.7.8: flights with ${IRC_STAIRS.handrailRisers} or more risers need a 34–38 in handrail on one side.` },
    ...(r.checks.guard ? [{ label: "Guard required", ok: false, detail: "R312.1: walking surfaces more than 30 in above grade need a guard at least 36 in high." }] : []),
  ];

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${fmtInt(o.bags)} × ${sizeLabel} bags` }}
      inputs={
        <>
          <FieldSection title="How high?">
            <Segmented
              label="I know the…"
              value={v.mode}
              options={[
                { value: "steps", label: "Number of steps" },
                { value: "height", label: "Total height" },
              ]}
              onChange={(mode) => set(mode === "height" ? { mode, height: layout.steps * layout.riseIn } : { mode, n: layout.steps, rise: Math.round(layout.riseIn * 100) / 100 })}
            />
            {v.mode === "height" ? (
              <LengthField
                base="in"
                label="Ground to top of landing or porch"
                value={v.height}
                onChange={(height) => set({ height })}
                help={`→ ${layout.steps} step-ups of ${fmt(layout.riseIn, 2)} in (the fewest that stay at or under 7¾ in)`}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Step-ups (risers)" value={v.n} onChange={(n) => set({ n: Math.max(1, Math.round(n)) })} step={1} min={1} max={20} decimals={0} />
                <LengthField base="in" label="Rise per step" value={v.rise} onChange={(rise) => set({ rise })} />
              </div>
            )}
          </FieldSection>

          <FieldSection title="Size">
            <div className="grid grid-cols-2 gap-3">
              <LengthField base="in" label="Tread depth" value={v.run} onChange={(run) => set({ run })} hint="front to back" />
              <LengthField label="Width" value={v.width} onChange={(width) => set({ width })} />
            </div>
            <Segmented
              label="At the top"
              value={landing ? "landing" : "existing"}
              options={[
                { value: "landing", label: "New landing", sub: "stoop at a door" },
                { value: "existing", label: "Existing porch", sub: "deck or slab" },
              ]}
              onChange={(top) => set({ top })}
            />
            {landing ? <LengthField base="in" label="Landing depth" value={v.land} onChange={(land) => set({ land })} help="At an exterior door the landing must be at least 36 in deep and as wide as the door." /> : null}
          </FieldSection>

          <MoreOptions label="Product, bag size, waste & base">
            <MixFields productId={v.product} bag={v.bag} waste={v.waste} onChange={set} />
            <ToggleField label="Include gravel base" checked={v.base} onChange={(base) => set({ base })} help="4 in of compacted crusher run under the steps, 6 in wider on every side." />
          </MoreOptions>
        </>
      }
      results={
        <>
          <ResultHero
            label="You need"
            value={fmtInt(o.bags)}
            unit={`× ${sizeLabel} bags`}
            sub={
              <>
                {cubic} of concrete for {what}, including {fmt(o.wastePct, 0)}% extra · {fmtInt(o.weightLb)} lb of bags
              </>
            }
          />
          <div className="flex justify-center rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            <StepsProfile steps={layout.steps} riseIn={layout.riseIn} runIn={v.run} top={landing ? "landing" : "existing"} landingIn={v.land} widthFt={v.width} />
          </div>
          <StatGrid
            stats={[
              { label: "Concrete volume", value: metric ? fmt(o.cuftNet / CUFT_PER_CUM, 2) : fmt(o.cuydNet, 2), unit: metric ? "m³" : "yd³", hint: `${fmt(o.cuftNet, 1)} ft³ before waste` },
              landing
                ? { label: "In the landing", value: `${fmt(o.cuftNet > 0 ? (r.landingCuft / o.cuftNet) * 100 : 0, 0)}%`, hint: `${fmt(r.landingCuft, 1)} ft³ of the total` }
                : { label: "Concrete treads", value: fmtInt(Math.max(0, layout.steps - 1)), hint: "the last step-up is your porch" },
              metric
                ? { label: "Total rise × run", value: `${fmt(r.totalRiseIn * CM_PER_IN, 0)} × ${fmt(r.runLengthIn * CM_PER_IN, 0)}`, unit: "cm", hint: `footprint ${fmt(r.footprintSqFt / SQFT_PER_SQM, 2)} m²` }
                : { label: "Total rise × run", value: `${fmt(r.totalRiseIn, 1)} × ${fmt(r.runLengthIn, 1)}`, unit: "in", hint: `footprint ${fmt(r.footprintSqFt, 1)} sq ft` },
              { label: "Finished weight", value: metric ? fmt(o.concreteWeightLb / 2204.6, 2) : fmt(o.concreteWeightLb / 2000, 2), unit: metric ? "t" : "tons" },
            ]}
          />
          <p className="-mt-1 text-[0.8rem] leading-relaxed text-ink-3">
            Volume = width × [rise × tread × (n−1)·n ÷ 2{landing ? " + n × rise × landing" : ""}] with n = {layout.steps} step-ups: {fmt(v.width, 2)} ft × {fmtInt(r.crossSectionSqIn)} sq in ÷ 144 = {fmt(o.cuftNet, 2)} ft³.
          </p>

          <ResultsHeading>Code check (IRC)</ResultsHeading>
          <CheckList items={checks} />

          <ResultsHeading>Other bag sizes</ResultsHeading>
          <OptionTable
            caption="Bags needed by size"
            columns={["Bag", "Bags", "Est. cost"]}
            highlight={o.bagsBySize.findIndex((b) => b.size === o.bagSize)}
            rows={o.bagsBySize.map((b) => [`${b.size} lb · ${BAG_YIELD_CUFT[b.size]} ft³`, fmtInt(b.bags), b.cost != null ? fmtMoney(b.cost) : "—"])}
          />

          <BagsVsTruck order={o} fees={v} onFees={set} />

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {!p.airEntrained ? (
            <Callout tone="tip" title="Freeze–thaw climate?">
              Steps sit out in the weather. Where winters are moderate or severe, IRC Table R402.2 asks for 3,000–3,500 psi air-entrained concrete (5–7% air) for steps. Regular bagged mix has no added air; Crack-Resistant mix (4–8% air) or air-entrained ready-mix holds up better.
            </Callout>
          ) : null}

          <ProductTimeline p={p} />

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Typical U.S. big-box prices checked October 2026. Tap any price to enter your store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Concrete steps",
            title: `Concrete for ${what}`,
            summary: `${fmtInt(o.bags)} × ${sizeLabel} bags (${fmt(o.cuydWithWaste, 2)} yd³ incl. ${fmt(o.wastePct, 0)}% extra)`,
            items,
          })}
        />
      }
    />
  );
}
