"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines } from "@/components/calc/CostLines";
import { FieldSection, LengthField, NumberField, Segmented, SelectField, ToggleField } from "@/components/calc/fields";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { computeStain, packText, type Need } from "./compute";
import { FENCE_STYLE, OPACITIES, SPRAY_LOSS_PCT, WOOD_CONDITIONS, stain, stainsFor, type Opacity } from "./data";
import { MoreOptions, PackCompare, needCostLines, needItems, supplyCostLines, supplyItems } from "./parts";
import { STAIN_DEFAULTS, stainInputFrom, type StainValues } from "./stain-model";

const CALC_KEY = "paint/deck-stain-calculator";
const SQM = 10.7639;

export default function StainCalculator({ initial }: { initial?: Partial<StainValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, STAIN_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const r = useMemo(() => computeStain(stainInputFrom(v)), [v]);
  const p = stain(v.product);
  const fence = v.mode === "fence";
  const area = (sqft: number) => (metric ? `${fmt(sqft / SQM, 1)} m²` : `${fmtInt(sqft)} sq ft`);
  const need: Need = {
    key: "stain",
    label: fence ? "Fence" : "Deck",
    productId: p.id,
    productName: `${p.brand === "Any brand" ? "" : `${p.brand} `}${p.name}`,
    areaSqFt: r.totalSqFt,
    coats: r.coats,
    rate: r.rate1,
    gallons: r.gallons,
    priced: r.priced,
    pack: r.pack,
  };
  const items = [...needItems(r.totalSqFt > 0 ? [need] : []), ...supplyItems(r.supplies)];
  const costLines = [...needCostLines(r.totalSqFt > 0 ? [need] : []), ...supplyCostLines(r.supplies)];
  const title = fence ? `Stain for ${fmtInt(v.fl)} ft of ${formatFeetInches(v.fh)} fence, ${v.sides === 2 ? "both sides" : "one side"}` : `Stain for a ${formatFeetInches(v.dl)} × ${formatFeetInches(v.dw)} deck`;
  const pickOpacity = (o: Opacity) => {
    const list = stainsFor(o);
    const next = list.find((x) => x.brand === "Any brand") ?? list[0];
    if (next) set({ product: next.id, opacity: o, coats: next.coats });
  };

  return (
    <CalcFrame
      dock={{ label: "Buy", value: `${packText(r.pack)} of stain` }}
      inputs={
        <>
          <FieldSection title="What are you staining?">
            <Segmented
              label="Project"
              value={v.mode}
              options={[
                { value: "deck", label: "Deck" },
                { value: "fence", label: "Fence" },
              ]}
              onChange={(mode) => set({ mode })}
            />
            {fence ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <LengthField label="Fence length" value={v.fl} onChange={(fl) => set({ fl })} />
                  <LengthField label="Fence height" value={v.fh} onChange={(fh) => set({ fh })} />
                </div>
                <Segmented
                  label="Sides"
                  value={v.sides}
                  options={[
                    { value: 1, label: "One side" },
                    { value: 2, label: "Both sides" },
                  ]}
                  onChange={(sides) => set({ sides })}
                />
                <Segmented label="Fence style" value={v.style} options={FENCE_STYLE.map((x) => ({ value: x.id, label: x.label, sub: x.factor > 1 ? `×${x.factor} est.` : undefined }))} onChange={(style) => set({ style })} />
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <LengthField label="Deck length" value={v.dl} onChange={(dl) => set({ dl })} />
                  <LengthField label="Deck width" value={v.dw} onChange={(dw) => set({ dw })} />
                </div>
                <ToggleField label="Railings" checked={v.railings} onChange={(railings) => set({ railings })} />
                {v.railings ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <LengthField label="Railing length" value={v.railLf} onChange={(railLf) => set({ railLf })} />
                      <LengthField label="Railing height" value={v.railH} onChange={(railH) => set({ railH })} />
                    </div>
                    <ToggleField label="Balusters / spindles" checked={v.spindles} onChange={(spindles) => set({ spindles })} help="Spindles have 4 faces each: Sherwin-Williams counts railing area × 2.0 with them, × 0.6 without." />
                  </>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Stair steps" value={v.steps} onChange={(steps) => set({ steps: Math.max(0, Math.round(steps)) })} step={1} min={0} max={40} decimals={0} stepper />
                  <LengthField label="Stair width" value={v.stairW} onChange={(stairW) => set({ stairW })} />
                </div>
              </>
            )}
          </FieldSection>

          <FieldSection title="Stain">
            <Segmented label="Type" columns={2} value={p.opacity} options={OPACITIES.map((o) => ({ value: o.id, label: o.label, sub: o.sub }))} onChange={pickOpacity} />
            <SelectField
              label="Product"
              value={p.id}
              options={stainsFor(p.opacity).map((x) => ({ value: x.id, label: `${x.brand === "Any brand" ? "" : `${x.brand} `}${x.name} — ${x.coat1[0] === x.coat1[1] ? x.coat1[0] : `${x.coat1[0]}–${x.coat1[1]}`} sq ft/gal` }))}
              onChange={(id) => set({ product: id, coats: stain(id).coats })}
              help={`${p.note} ${p.coatsNote}`}
            />
            <Segmented label="Wood condition" columns={3} value={v.cond} options={WOOD_CONDITIONS.map((c) => ({ value: c.id, label: c.label, sub: c.sub }))} onChange={(cond) => set({ cond })} />
            <Segmented
              label="Coats"
              columns={p.maxCoats}
              value={r.coats}
              options={Array.from({ length: p.maxCoats }, (_, i) => ({ value: i + 1, label: `${i + 1} coat${i ? "s" : ""}`, sub: i + 1 === p.coats ? "label" : undefined }))}
              onChange={(coats) => set({ coats })}
            />
          </FieldSection>

          <MoreOptions label="Application">
            <Segmented
              label="Application"
              value={v.loss >= SPRAY_LOSS_PCT ? "spray" : "brush"}
              options={[
                { value: "brush", label: "Brush, roller or pad" },
                { value: "spray", label: "Pump or airless sprayer", sub: `+${SPRAY_LOSS_PCT}% est.` },
              ]}
              onChange={(m) => set({ method: m, loss: m === "spray" ? SPRAY_LOSS_PCT : 0 })}
            />
          </MoreOptions>
        </>
      }
      results={
        <>
          <ResultHero
            label="Buy"
            value={packText(r.pack)}
            unit="of stain"
            sub={
              <>
                {fmt(r.gallons, 2)} gal for {area(r.totalSqFt)} · coat 1 at {fmtInt(r.rate1)} sq ft/gal
                {r.coats > 1 ? `, later coats at ${fmtInt(r.rate2)}` : ""} · {fmtMoney(r.pack.cost)}
              </>
            }
          />
          <StatGrid
            stats={
              fence
                ? [
                    { label: "Fence area", value: metric ? fmt(r.fenceSqFt / SQM, 1) : fmtInt(r.fenceSqFt), unit: metric ? "m²" : "sq ft", hint: `${fmtInt(v.fl)} ft × ${fmt(v.fh)} ft × ${v.sides} side${v.sides > 1 ? "s" : ""}` },
                    { label: "First coat", value: fmt(r.coat1Gal, 2), unit: "gal" },
                    { label: "Later coats", value: fmt(r.laterGal, 2), unit: "gal", hint: r.coats > 1 ? `${r.coats - 1} more` : "one-coat plan" },
                    { label: "Stain + supplies", value: fmtMoney(r.pack.cost + r.suppliesCost) },
                  ]
                : [
                    { label: "Deck boards", value: metric ? fmt(r.floorSqFt / SQM, 1) : fmtInt(r.floorSqFt), unit: metric ? "m²" : "sq ft" },
                    { label: "Railings", value: metric ? fmt(r.railSqFt / SQM, 1) : fmtInt(r.railSqFt), unit: metric ? "m²" : "sq ft", hint: v.railings ? (v.spindles ? "× 2.0 for spindles" : "× 0.6 open rail") : "none" },
                    { label: "Stairs", value: metric ? fmt(r.stairSqFt / SQM, 1) : fmtInt(r.stairSqFt), unit: metric ? "m²" : "sq ft", hint: `${v.steps} treads + risers` },
                    { label: "Stain + supplies", value: fmtMoney(r.pack.cost + r.suppliesCost), hint: `${fmtMoney(r.pack.cost)} stain` },
                  ]
            }
          />

          {r.compare.length > 1 ? (
            <>
              <ResultsHeading>Other {OPACITIES.find((o) => o.id === p.opacity)?.label.toLowerCase()} stains on this job</ResultsHeading>
              <OptionTable
                caption="Same area, each product at its own label coats and coverage, cheapest first"
                columns={["Product", "Coats", "Gallons", "Buy", "Cost"]}
                highlight={r.compare.findIndex((c) => c.product.id === p.id)}
                rows={r.compare.map((c) => [`${c.product.brand === "Any brand" ? "" : `${c.product.brand} `}${c.product.name}`, c.coats, fmt(c.gallons, 2), packText(c.pack), fmtMoney(c.pack.cost)])}
              />
            </>
          ) : null}

          {r.totalSqFt > 0 ? <PackCompare need={need} priced={r.priced} /> : null}

          {r.totalSqFt > 0 ? (
            <Callout tone="info" title="Compared with Sherwin-Williams' deck calculator">
              It assumes 250 sq ft/gal for every stain and wood and says {fmt(r.sw.total, 1)} gal for {r.coats} coat{r.coats > 1 ? "s" : ""}. We use this product&apos;s data-sheet rate for {WOOD_CONDITIONS.find((c) => c.id === v.cond)?.label.toLowerCase()} wood.
            </Callout>
          ) : null}
          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          <Callout tone="tip" title="Test the spread first">
            Stain soaks into dry, weathered wood far faster than into new boards. Do one board run, see how far a gallon really goes, then buy the rest — unopened cans are easier to return than mixed tints.
          </Callout>

          <ResultsHeading>Shopping list</ResultsHeading>
          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Prices checked October 23, 2026 (maker and Walmart.com listings). Typical prices are labelled; tap any price to enter your store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: fence ? "Fence stain" : "Deck stain",
            title,
            summary: `${packText(r.pack)} of ${need.productName} (${fmt(r.gallons, 2)} gal, ${r.coats} coat${r.coats > 1 ? "s" : ""})`,
            items,
          })}
        />
      }
    />
  );
}
