"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { IsoBlock } from "@/components/calc/diagrams";
import { FieldSection, LengthField, NumberField, Segmented, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { CUFT_PER_CUM } from "@/lib/units";
import { computeFooting } from "./compute";
import { BAG_YIELD_CUFT, BAGS_PER_PALLET, IRC_FOOTING, REBAR, product } from "./data";
import { FootingSection } from "./diagrams";
import { FOOTING_DEFAULTS, footingInputFrom, type FootingValues } from "./footing-model";
import { BagsVsTruck, CheckList, MixFields, MoreOptions, ProductTimeline } from "./parts";

const CALC_KEY = "concrete/footing-calculator";

const WALL_SIZES = [
  { w: 12, t: 6, sub: "IRC min" },
  { w: 16, t: 8, sub: "common" },
  { w: 20, t: 10, sub: "wider" },
  { w: 24, t: 12, sub: "2 × 1 ft" },
];
const PAD_SIZES = [
  { l: 12, w: 12, t: 12 },
  { l: 18, w: 18, t: 10 },
  { l: 24, w: 24, t: 12 },
  { l: 30, w: 30, t: 12 },
];

export default function FootingCalculator({ initial }: { initial?: Partial<FootingValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, FOOTING_DEFAULTS, initial);
  const { system } = useUnits();
  const r = useMemo(() => computeFooting(footingInputFrom(v)), [v]);
  const p = product(v.product);
  const o = r.order;
  const sizeLabel = `${o.bagSize}-lb`;
  const metric = system === "metric";
  const wall = v.type !== "pad";
  const wallKey = WALL_SIZES.findIndex((s) => s.w === v.w && s.t === v.t);
  const padKey = PAD_SIZES.findIndex((s) => s.l === v.pl && s.w === v.pw && s.t === v.pt);
  const unitPrice = o.bagsBySize.find((b) => b.size === o.bagSize)?.price;
  const pallet = BAGS_PER_PALLET[o.bagSize];
  const what = wall ? `${fmt(v.len, 1)} ft of ${fmt(v.w, 1)} × ${fmt(v.t, 1)} in footing` : `${fmtInt(v.pads)} × ${fmt(v.pl, 1)}×${fmt(v.pw, 1)}×${fmt(v.pt, 1)} in pad${v.pads === 1 ? "" : "s"}`;
  const cubic = metric ? `${fmt(o.cuftWithWaste / CUFT_PER_CUM, 2)} m³` : `${fmt(o.cuydWithWaste, 2)} yd³`;

  const items: ShoppingItem[] = [
    { id: "bags", name: `${p.short} — ${sizeLabel} bags`, qty: o.bags, unit: "bags", cost: o.bagCost },
    ...(r.rebar
      ? [{ id: "rebar", name: `#4 rebar, 20 ft sticks (${r.rebar.bars} continuous ${r.rebar.bars === 1 ? "bar" : "bars"})`, qty: r.rebar.sticks, unit: "sticks", cost: r.rebar.cost, note: `${fmt(r.rebar.linearFt, 0)} ft incl. 10% for laps · ${fmt(r.rebar.weightLb, 0)} lb` }]
      : []),
    ...(r.forms
      ? [
          { id: "forms", name: `${r.forms.lumber} form boards, 8 ft`, qty: r.forms.boards8ft, unit: "boards", note: `${fmt(r.forms.linearFt, 0)} lin ft${wall ? ", both sides" : ""}` },
          { id: "stakes", name: "Wood form stakes", qty: r.forms.stakes, unit: "stakes" },
        ]
      : []),
    { id: "water", name: "Clean water for mixing", qty: Math.ceil(o.waterGal[1]), unit: "gal", note: `${fmt(o.waterGal[0], 0)}–${fmt(o.waterGal[1], 0)} gal; start low, never exceed the max` },
  ];

  const costLines: CostLine[] = [
    ...(unitPrice != null
      ? [{ priceId: `concrete-${p.id}-${o.bagSize}`, label: `${sizeLabel} ${p.short}`, qty: o.bags, unit: "bags", defaultPrice: unitPrice, note: pallet && o.bags >= pallet && p.bulkPrice?.[o.bagSize] ? `Pallet price applied (${pallet}+ bags)` : undefined }]
      : []),
    ...(r.rebar ? [{ priceId: "rebar-#4-20", label: "#4 rebar, 20 ft", qty: r.rebar.sticks, unit: "sticks", defaultPrice: REBAR.pricePerStick["#4"] }] : []),
  ];

  const checks = wall
    ? [
        { label: `Width ${fmt(v.w, 1)} in, thickness ${fmt(v.t, 1)} in`, ok: v.w >= IRC_FOOTING.minWidthIn && v.t >= IRC_FOOTING.minThickIn, detail: "IRC R403.1.1: at least 12 in wide and 6 in thick; soft soil or more stories need wider (Table R403.1(1))." },
        ...(r.projectionIn != null
          ? [{ label: `Projection ${fmt(Math.max(0, r.projectionIn), 1)} in each side`, ok: r.projectionIn >= IRC_FOOTING.minProjectionIn && r.projectionIn <= v.t, detail: "R403.1.1: at least 2 in past the wall face, and no more than the footing thickness." }]
          : []),
      ]
    : [{ label: `Thickness ${fmt(v.pt, 1)} in`, ok: v.pt >= IRC_FOOTING.minThickIn, detail: "R403.1.1: footings at least 6 in thick. Deck footing size comes from Table R507.3.1 (load and soil)." }];

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${fmtInt(o.bags)} × ${sizeLabel} bags` }}
      inputs={
        <>
          <FieldSection title="Footing type">
            <Segmented
              label="What are you pouring?"
              value={wall ? "wall" : "pad"}
              options={[
                { value: "wall", label: "Continuous footing", sub: "walls, garages" },
                { value: "pad", label: "Pad footings", sub: "piers, posts, decks" },
              ]}
              onChange={(type) => set({ type })}
            />
          </FieldSection>

          {wall ? (
            <FieldSection title="Size">
              <LengthField label="Total length of footing" value={v.len} onChange={(len) => set({ len })} help="Add every run. For a closed rectangle use the perimeter: a 20×20 garage is 80 ft." />
              <Segmented
                label="Width × thickness"
                columns={4}
                value={wallKey}
                options={WALL_SIZES.map((s, i) => ({ value: i, label: `${s.w}×${s.t}`, sub: s.sub }))}
                onChange={(i) => i >= 0 && set({ w: WALL_SIZES[i].w, t: WALL_SIZES[i].t })}
              />
              <div className="grid grid-cols-2 gap-3">
                <LengthField base="in" label="Width" value={v.w} onChange={(w) => set({ w })} />
                <LengthField base="in" label="Thickness" value={v.t} onChange={(t) => set({ t })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LengthField base="in" label="Wall on top" value={v.wall} onChange={(wl) => set({ wall: wl })} allowZero hint="0 = skip" />
                <NumberField label="#4 bars, continuous" value={v.bars} onChange={(bars) => set({ bars: Math.round(bars) })} step={1} min={0} max={6} decimals={0} />
              </div>
            </FieldSection>
          ) : (
            <FieldSection title="Pads">
              <NumberField label="Number of pads" value={v.pads} onChange={(pads) => set({ pads: Math.max(1, Math.round(pads)) })} step={1} min={1} max={500} decimals={0} />
              <Segmented
                label="Common pad sizes (L × W × thick, in)"
                columns={4}
                value={padKey}
                options={PAD_SIZES.map((s, i) => ({ value: i, label: `${s.l}×${s.w}`, sub: `${s.t} in thick` }))}
                onChange={(i) => i >= 0 && set({ pl: PAD_SIZES[i].l, pw: PAD_SIZES[i].w, pt: PAD_SIZES[i].t })}
              />
              <div className="grid grid-cols-3 gap-3">
                <LengthField base="in" label="Length" value={v.pl} onChange={(pl) => set({ pl })} />
                <LengthField base="in" label="Width" value={v.pw} onChange={(pw) => set({ pw })} />
                <LengthField base="in" label="Thick" value={v.pt} onChange={(pt) => set({ pt })} />
              </div>
            </FieldSection>
          )}

          <MoreOptions label="Product, bag size, waste & forms">
            <MixFields productId={v.product} bag={v.bag} waste={v.waste} onChange={set} />
            <ToggleField label="Build wood forms" checked={v.forms} onChange={(forms) => set({ forms })} help="Off = trench pour, where firm soil is the form. On = boards on both sides, staked every 3 ft." />
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
            {wall ? <FootingSection widthIn={v.w} thickIn={v.t} wallIn={v.wall} bars={v.bars} /> : <IsoBlock length={v.pl / 12} width={v.pw / 12} depthIn={v.pt} label="Footing pad" />}
          </div>
          <StatGrid
            stats={[
              { label: "Concrete volume", value: metric ? fmt(o.cuftNet / CUFT_PER_CUM, 2) : fmt(o.cuydNet, 2), unit: metric ? "m³" : "yd³", hint: `${fmt(o.cuftNet, 1)} ft³ before waste` },
              wall
                ? { label: "Per foot of footing", value: fmt(r.cuftPerUnit, 2), unit: "ft³", hint: `${fmt(r.cuftPerUnit / BAG_YIELD_CUFT[o.bagSize], 2)} × ${sizeLabel} bags` }
                : { label: "Per pad", value: fmt(r.cuftPerUnit, 2), unit: "ft³", hint: `${fmt(r.cuftPerUnit / BAG_YIELD_CUFT[o.bagSize], 2)} × ${sizeLabel} bags` },
              { label: "Ready-mix order", value: fmt(o.readyMixYd, 2), unit: "yd³", hint: "quarter-yard steps, 1 yd minimum" },
              r.rebar
                ? { label: "#4 rebar", value: fmtInt(r.rebar.sticks), unit: "× 20 ft", hint: `${fmt(r.rebar.weightLb, 0)} lb incl. laps` }
                : { label: "Finished weight", value: metric ? fmt(o.concreteWeightLb / 2204.6, 1) : fmt(o.concreteWeightLb / 2000, 1), unit: metric ? "t" : "tons" },
            ]}
          />

          <ResultsHeading>Code check (IRC 2021)</ResultsHeading>
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
          <Callout tone="tip" title="How deep?">
            The bottom of every exterior footing must sit at least {IRC_FOOTING.minDepthBelowGradeIn} in below undisturbed ground (IRC R403.1.4) and below your local frost depth, which the building department sets. Dig to firm, undisturbed soil — never pour on loose fill.
          </Callout>
          {r.rebar ? (
            <Callout tone="info" title="Rebar placement">
              Hold bars {IRC_FOOTING.coverIn} in off the soil on chairs or concrete blocks (IRC R403.1.3.5.3) and overlap splices. The IRC only mandates footing bars in Seismic Design Categories D0–D2; elsewhere follow your plans or engineer.
            </Callout>
          ) : null}

          <ProductTimeline p={p} />

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Typical U.S. prices checked October 2026. Tap any price to enter your store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Concrete footing",
            title: `Concrete for ${what}`,
            summary: `${fmtInt(o.bags)} × ${sizeLabel} bags (${fmt(o.cuydWithWaste, 2)} yd³ incl. ${fmt(o.wastePct, 0)}% extra)`,
            items,
          })}
        />
      }
    />
  );
}
