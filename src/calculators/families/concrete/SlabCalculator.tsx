"use client";

import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { CircleDiagram, IsoBlock } from "@/components/calc/diagrams";
import { FieldSection, LengthField, NumberField, Segmented, SelectField, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { CUFT_PER_CUM, formatFeetInches } from "@/lib/units";
import { computeSlab } from "./compute";
import { SLAB_DEFAULTS, slabInputFrom, type SlabValues } from "./slab-model";
import { BAG_YIELD_CUFT, BAGS_PER_PALLET, GRAVEL_BASE, PRODUCTS, PROJECTS, REBAR, THICKNESS_OPTIONS, product } from "./data";
import { BagsVsTruck, ProductTimeline } from "./parts";

const CALC_KEY = "concrete/slab-calculator";

export default function SlabCalculator({ initial }: { initial?: Partial<SlabValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, SLAB_DEFAULTS, initial);
  const { system } = useUnits();
  const [more, setMore] = useState(false);
  const r = useMemo(() => computeSlab(slabInputFrom(v)), [v]);
  const p = product(v.product);
  const metric = system === "metric";
  const proj = PROJECTS.find((x) => x.id === v.project);
  const customThickness = !THICKNESS_OPTIONS.some((o) => o.value === v.t);
  const sizeLabel = `${r.bagSize}-lb`;

  const dims = v.shape === "circle" ? `${formatFeetInches(v.l1)} round` : `${formatFeetInches(v.l1)} × ${formatFeetInches(v.w1)}`;
  const title = `Concrete for ${v.count > 1 ? `${v.count} × ` : ""}${dims}${v.sections > 1 ? ` + ${v.sections - 1} more area${v.sections > 2 ? "s" : ""}` : ""}, ${fmt(v.t)} in thick`;

  const items: ShoppingItem[] = [
    { id: "bags", name: `${p.short} — ${sizeLabel} bags`, qty: r.bags, unit: "bags", cost: r.bagCost },
    ...(r.gravel ? [{ id: "gravel", name: `Crusher run / road base (${GRAVEL_BASE.depthIn} in compacted)`, qty: Math.round(r.gravel.tons * 10) / 10, unit: "tons", cost: r.gravel.cost }] : []),
    ...(r.forms.boards8ft ? [{ id: "forms", name: `${r.forms.lumber} form boards, 8 ft`, qty: r.forms.boards8ft, unit: "boards" }, { id: "stakes", name: "Wood form stakes", qty: r.forms.stakes, unit: "stakes" }] : []),
    ...(r.rebarPlan ? [{ id: "rebar", name: `${r.rebarPlan.size} rebar, 20 ft sticks (${r.rebarPlan.spacingIn} in grid)`, qty: r.rebarPlan.sticks, unit: "sticks" }, { id: "chairs", name: `Rebar chairs, ${fmt(r.rebarPlan.chairIn, 1)} in (bars at mid-depth to upper third)`, qty: r.rebarPlan.chairs, unit: "chairs" }] : []),
    { id: "water", name: "Clean water for mixing", qty: Math.ceil(r.waterGal[1]), unit: "gal", note: `${fmt(r.waterGal[0], 0)}–${fmt(r.waterGal[1], 0)} gal; start low, never exceed the max` },
  ];

  const costLines: CostLine[] = [
    ...(r.bagsBySize.find((b) => b.size === r.bagSize)?.price != null
      ? [{ priceId: `concrete-${p.id}-${r.bagSize}`, label: `${sizeLabel} ${p.short}`, qty: r.bags, unit: "bags", defaultPrice: r.bagsBySize.find((b) => b.size === r.bagSize)!.price!, note: BAGS_PER_PALLET[r.bagSize] && r.bags >= BAGS_PER_PALLET[r.bagSize]! && p.bulkPrice?.[r.bagSize] ? "Pallet price applied (42+ bags)" : undefined }]
      : []),
    ...(r.gravel ? [{ priceId: "gravel-base-ton", label: "Gravel base (bulk)", qty: Math.round(r.gravel.tons * 10) / 10, unit: "tons", defaultPrice: GRAVEL_BASE.pricePerTon }] : []),
    ...(r.rebarPlan ? [{ priceId: `rebar-${r.rebarPlan.size}-20`, label: `${r.rebarPlan.size} rebar, 20 ft`, qty: r.rebarPlan.sticks, unit: "sticks", defaultPrice: REBAR.pricePerStick[r.rebarPlan.size] }] : []),
  ];

  const cubic = metric ? `${fmt(r.cuftWithWaste / CUFT_PER_CUM, 2)} m³` : `${fmt(r.cuydWithWaste, 2)} yd³`;

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${fmtInt(r.bags)} × ${sizeLabel} bags` }}
      inputs={
        <>
          <FieldSection title="What are you pouring?">
            <Segmented
              label="Project"
              columns={3}
              value={v.project}
              options={PROJECTS.map((x) => ({ value: x.id, label: x.label }))}
              onChange={(id) => {
                const pr = PROJECTS.find((x) => x.id === id);
                set({ project: id, ...(pr ? { t: pr.thickness } : {}), rebar: id === "driveway" || id === "garage" ? "driveway" : id === "hottub" ? "patio" : v.rebar === "driveway" ? "none" : v.rebar });
              }}
              help={proj?.note}
            />
          </FieldSection>

          <FieldSection title="Size">
            <Segmented
              label="Shape"
              value={v.shape}
              options={[
                { value: "rect", label: "Square / rectangle" },
                { value: "circle", label: "Round" },
              ]}
              onChange={(shape) => set({ shape })}
            />
            {v.shape === "circle" ? (
              <LengthField label="Diameter" value={v.l1} onChange={(l1) => set({ l1 })} hint="edge to edge" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <LengthField label="Length" value={v.l1} onChange={(l1) => set({ l1 })} />
                <LengthField label="Width" value={v.w1} onChange={(w1) => set({ w1 })} />
              </div>
            )}
            {v.sections >= 2 ? (
              <ExtraSection n={2} l={v.l2} w={v.w2} onL={(l2) => set({ l2 })} onW={(w2) => set({ w2 })} onRemove={() => set({ sections: 1 })} />
            ) : null}
            {v.sections >= 3 ? (
              <ExtraSection n={3} l={v.l3} w={v.w3} onL={(l3) => set({ l3 })} onW={(w3) => set({ w3 })} onRemove={() => set({ sections: 2 })} />
            ) : null}
            {v.sections < 3 ? (
              <button
                type="button"
                onClick={() => set({ sections: v.sections + 1 })}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong text-[0.86rem] font-semibold text-ink-2 transition hover:border-accent hover:text-accent active:scale-[0.99]"
              >
                + Add another rectangle <span className="hidden font-normal text-ink-3 sm:inline">(L-shapes, steps landing)</span>
              </button>
            ) : null}
          </FieldSection>

          <FieldSection title="Thickness">
            <Segmented
              label="Slab thickness"
              columns={4}
              value={customThickness ? -1 : v.t}
              options={THICKNESS_OPTIONS}
              onChange={(t) => t > 0 && set({ t })}
              help="Form lumber is smaller than its name: a 2×4 is 3.5 in tall, a 2×6 is 5.5 in."
            />
            <NumberField label="Exact thickness" value={v.t} onChange={(t) => set({ t })} suffix="in" step={0.5} min={0} max={36} decimals={2} />
          </FieldSection>

          <div>
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-[0.99]"
            >
              Product, bag size, waste & extras
              <span aria-hidden className={clsx("transition-transform duration-200", more && "rotate-180")}>
                ⌄
              </span>
            </button>
            {more ? (
              <div className="animate-rise mt-4 space-y-4">
                <SelectField label="Concrete mix" value={v.product} onChange={(product) => set({ product })} options={PRODUCTS.map((x) => ({ value: x.id, label: `${x.short} — ${x.name}` }))} help={p.bestFor} />
                <Segmented
                  label="Bag size"
                  columns={p.sizes.length}
                  value={r.bagSize}
                  options={p.sizes.map((s) => ({ value: s, label: `${s} lb`, sub: `${BAG_YIELD_CUFT[s]} ft³` }))}
                  onChange={(bag) => set({ bag })}
                />
                <NumberField label="Extra for waste & spillage" value={v.waste} onChange={(waste) => set({ waste })} suffix="%" step={5} min={0} max={50} decimals={0} help="10% is standard for bagged concrete (uneven ground, spillage, form bulges)." />
                <NumberField label="How many identical slabs or pads?" value={v.count} onChange={(count) => set({ count: Math.max(1, Math.round(count)) })} step={1} min={1} max={500} decimals={0} />
                <ToggleField label="Include gravel base" checked={v.base} onChange={(base) => set({ base })} help="4 in of compacted crusher run under the slab, extending 6 in past the edges." />
                <SelectField
                  label="Reinforcement"
                  value={v.rebar}
                  onChange={(rebar) => set({ rebar })}
                  options={[
                    { value: "none", label: "None (fiber or unreinforced)" },
                    { value: "patio", label: "#3 rebar, 18 in grid — patios & walks" },
                    { value: "driveway", label: "#4 rebar, 12 in grid — driveways & heavy loads" },
                  ]}
                />
              </div>
            ) : null}
          </div>
        </>
      }
      results={
        <>
          <ResultHero
            label="You need"
            value={fmtInt(r.bags)}
            unit={`× ${sizeLabel} bags`}
            sub={
              <>
                {cubic} of concrete including {fmt(v.waste, 0)}% extra · {fmtInt(r.weightLb)} lb of bags to lift
                {r.pallets >= 0.5 ? ` · ${fmt(r.pallets, 1)} pallets` : ""}
              </>
            }
          />
          <div className="flex justify-center rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            {v.shape === "circle" ? <CircleDiagram diameter={v.l1} label="Round slab" /> : <IsoBlock length={v.l1} width={v.w1} depthIn={v.t} />}
          </div>
          <StatGrid
            stats={[
              { label: "Concrete volume", value: metric ? fmt(r.cuftNet / CUFT_PER_CUM, 2) : fmt(r.cuydNet, 2), unit: metric ? "m³" : "yd³", hint: "before waste" },
              { label: "Area", value: metric ? fmt(r.areaSqFt / 10.7639, 1) : fmt(r.areaSqFt, 1), unit: metric ? "m²" : "sq ft" },
              { label: "Mixing water", value: `${fmt(r.waterGal[0], 0)}–${fmt(r.waterGal[1], 0)}`, unit: "gal", hint: "start low; max weakens the slab" },
              { label: "Finished weight", value: metric ? fmt(r.concreteWeightLb / 2204.6, 1) : fmt(r.concreteWeightLb / 2000, 1), unit: metric ? "t" : "tons" },
            ]}
          />

          <ResultsHeading>Other bag sizes</ResultsHeading>
          <OptionTable
            caption="Bags needed by size"
            columns={["Bag", "Bags", "Est. cost"]}
            highlight={r.bagsBySize.findIndex((b) => b.size === r.bagSize)}
            rows={r.bagsBySize.map((b) => [`${b.size} lb · ${BAG_YIELD_CUFT[b.size]} ft³`, fmtInt(b.bags), b.cost != null ? fmtMoney(b.cost) : "—"])}
          />

          <BagsVsTruck order={r} fees={v} onFees={set} />

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {!p.airEntrained && (v.project === "driveway" || v.project === "patio" || v.project === "walkway") ? (
            <Callout tone="tip" title="Freeze–thaw climate?">
              Regular bagged mixes are not air-entrained. For exposed slabs where winters freeze, Crack-Resistant mix (4–8% air) or air-entrained ready-mix holds up better against scaling.
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
            calcName: "Concrete slab",
            title,
            summary: `${fmtInt(r.bags)} × ${sizeLabel} bags (${fmt(r.cuydWithWaste, 2)} yd³ incl. ${fmt(v.waste, 0)}% extra)`,
            items,
          })}
        />
      }
    />
  );
}

function ExtraSection({ n, l, w, onL, onW, onRemove }: { n: number; l: number; w: number; onL: (v: number) => void; onW: (v: number) => void; onRemove: () => void }) {
  return (
    <div className="animate-rise rounded-[16px] border border-line bg-surface-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.8rem] font-semibold text-ink-2">Area {n}</span>
        <button type="button" onClick={onRemove} className="rounded-full px-2 py-0.5 text-[0.76rem] font-semibold text-ink-3 hover:text-bad">
          Remove
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LengthField label="Length" value={l} onChange={onL} />
        <LengthField label="Width" value={w} onChange={onW} />
      </div>
    </div>
  );
}
