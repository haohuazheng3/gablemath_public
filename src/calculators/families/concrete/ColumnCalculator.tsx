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
import { CUFT_PER_CUM, formatFeetInches } from "@/lib/units";
import { computeColumns, tubeCuftPerFt } from "./compute";
import { BAG_YIELD_CUFT, BAGS_PER_PALLET, FORM_TUBE_PRICE, GRAVEL_BAG_CUFT, TUBE_DIAMETERS, TUBE_RULES, product } from "./data";
import { TubeSection } from "./diagrams";
import { COLUMN_DEFAULTS, columnInputFrom, type ColumnValues } from "./column-model";
import { BagsVsTruck, MixFields, MoreOptions, ProductTimeline } from "./parts";

const CALC_KEY = "concrete/column-calculator";
const QUICK_DIAMETERS = [8, 10, 12, 16, 18, 24];
const CM_PER_IN = 2.54;

export default function ColumnCalculator({ initial }: { initial?: Partial<ColumnValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, COLUMN_DEFAULTS, initial);
  const { system } = useUnits();
  const r = useMemo(() => computeColumns(columnInputFrom(v)), [v]);
  const p = product(v.product);
  const o = r.order;
  const sizeLabel = `${o.bagSize}-lb`;
  const metric = system === "metric";
  const unitPrice = o.bagsBySize.find((b) => b.size === o.bagSize)?.price;
  const pallet = BAGS_PER_PALLET[o.bagSize];
  const tubePrice = r.tubes.lengthFt === TUBE_RULES.stockLengthFt ? FORM_TUBE_PRICE[v.dia] : undefined;
  const what = `${v.count > 1 ? `${fmtInt(v.count)} × ` : ""}${fmt(v.dia, 1)} in × ${formatFeetInches(v.len)} column${v.count > 1 ? "s" : ""}`;
  const gravelBags = Math.ceil(r.gravelCuft / GRAVEL_BAG_CUFT - 1e-9);
  const per = r.perColumn.find((x) => x.size === o.bagSize);
  const vol = (cuft: number) => (metric ? `${fmt((cuft * 1000) / CUFT_PER_CUM, 0)} L` : `${fmt(cuft, 2)} ft³`);

  const items: ShoppingItem[] = [
    { id: "bags", name: `${p.short} — ${sizeLabel} bags`, qty: o.bags, unit: "bags", cost: o.bagCost },
    {
      id: "tubes",
      name: `${fmt(v.dia, 1)} in form tube, ${r.tubes.lengthFt} ft`,
      qty: r.tubes.buy,
      unit: "tubes",
      cost: tubePrice != null ? tubePrice * r.tubes.buy : undefined,
      note: r.tubes.perTube > 1 ? `cut ${r.tubes.perTube} columns from each tube` : r.tubes.lengthFt > TUBE_RULES.longLengthFt ? "order full-length tube" : undefined,
    },
    ...(gravelBags ? [{ id: "gravel", name: `All-purpose gravel, ${GRAVEL_BAG_CUFT} cu ft bags (2 in under each footing)`, qty: gravelBags, unit: "bags" }] : []),
    { id: "anchors", name: "Post bases or anchor bolts, set in the wet concrete", qty: v.count, unit: "pcs" },
    { id: "water", name: "Clean water for mixing", qty: Math.ceil(o.waterGal[1]), unit: "gal", note: `${fmt(o.waterGal[0], 0)}–${fmt(o.waterGal[1], 0)} gal; start low, never exceed the max` },
  ];

  const costLines: CostLine[] = [
    ...(unitPrice != null
      ? [{ priceId: `concrete-${p.id}-${o.bagSize}`, label: `${sizeLabel} ${p.short}`, qty: o.bags, unit: "bags", defaultPrice: unitPrice, note: pallet && o.bags >= pallet && p.bulkPrice?.[o.bagSize] ? `Pallet price applied (${pallet}+ bags)` : undefined }]
      : []),
    ...(tubePrice != null ? [{ priceId: `form-tube-${v.dia}-48`, label: `${v.dia} in × 48 in form tube`, qty: r.tubes.buy, unit: "tubes", defaultPrice: tubePrice }] : []),
  ];

  const tableRows = [
    ["This calculator (geometry)", fmtInt(Math.ceil(r.cuftPerColumn / BAG_YIELD_CUFT[60] - 1e-9)), fmtInt(Math.ceil(r.cuftPerColumn / BAG_YIELD_CUFT[80] - 1e-9))],
    ...(r.quikTube && !r.footingCuft ? [["Quik-Tube data sheet", fmtInt(r.quikTube[60]), fmtInt(r.quikTube[80])]] : []),
    ...(r.sonoco && !r.footingCuft ? [["Sonoco Sonotube table", fmtInt(r.sonoco[60]), fmtInt(r.sonoco[80])]] : []),
  ];

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${fmtInt(o.bags)} × ${sizeLabel} bags` }}
      inputs={
        <>
          <FieldSection title="Tube size">
            <Segmented
              label="Diameter"
              columns={3}
              value={QUICK_DIAMETERS.includes(v.dia) ? v.dia : -1}
              options={QUICK_DIAMETERS.map((d) => ({ value: d, label: `${d} in`, sub: `${fmt(tubeCuftPerFt(d), 2)} ft³/ft` }))}
              onChange={(dia) => dia > 0 && set({ dia })}
              help={`Sonotube sizes include ${TUBE_DIAMETERS.join(", ")} in; Quik-Tube comes in 8, 10 and 12 in.`}
            />
            <div className="grid grid-cols-2 gap-3">
              <LengthField base="in" label="Exact diameter" value={v.dia} onChange={(dia) => set({ dia })} />
              <NumberField label="How many?" value={v.count} onChange={(count) => set({ count: Math.max(1, Math.round(count)) })} step={1} min={1} max={500} decimals={0} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LengthField label="Concrete height" value={v.len} onChange={(len) => set({ len })} hint="whole tube" />
              <LengthField base="in" label="Above ground" value={v.above} onChange={(above) => set({ above })} allowZero hint="part of it" />
            </div>
          </FieldSection>

          <FieldSection title="Footing under the tube">
            <ToggleField
              label="Pour a footing first"
              checked={v.ftg > 0}
              onChange={(on) => set({ ftg: on ? TUBE_RULES.footingIn : 0 })}
              help="Quik-Tube method: 2 in of gravel, a 4–6 in footing as wide as the hole (2× the tube), then set the tube on it."
            />
            {v.ftg > 0 ? (
              <div className="animate-rise grid grid-cols-2 gap-3">
                <LengthField base="in" label="Footing thickness" value={v.ftg} onChange={(ftg) => set({ ftg })} />
                <LengthField
                  base="in"
                  label="Footing diameter"
                  value={r.footingDiaIn}
                  onChange={(fdia) => set({ fdia })}
                  hint={
                    v.fdia > 0 ? (
                      <button type="button" onClick={() => set({ fdia: 0 })} className="font-semibold text-accent active:scale-95">
                        use 2× tube
                      </button>
                    ) : (
                      "2× tube"
                    )
                  }
                />
              </div>
            ) : null}
          </FieldSection>

          <MoreOptions label="Product, bag size & waste">
            <MixFields productId={v.product} bag={v.bag} waste={v.waste} onChange={set} wasteHelp="Tubes hold an exact volume, but bags spill and holes run wide — 10% is the usual cushion." />
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
                {per ? `${fmt(per.exact, 1)} bags per column` : ""} · {metric ? `${fmt(o.cuftWithWaste / CUFT_PER_CUM, 2)} m³` : `${fmt(o.cuydWithWaste, 2)} yd³`} including {fmt(o.wastePct, 0)}% extra · {fmtInt(o.weightLb)} lb
              </>
            }
          />
          <div className="flex justify-center rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            <TubeSection diaIn={v.dia} lengthFt={v.len} aboveIn={v.above} footingIn={v.ftg} footingDiaIn={r.footingDiaIn} />
          </div>
          <StatGrid
            stats={[
              { label: "Per column", value: vol(r.cuftPerColumn), hint: r.footingCuft ? `tube ${vol(r.tubeCuft)} + footing ${vol(r.footingCuft)}` : `${fmt(tubeCuftPerFt(v.dia), 3)} ft³ per foot of tube` },
              { label: "Total concrete", value: metric ? fmt(o.cuftNet / CUFT_PER_CUM, 2) : fmt(o.cuydNet, 2), unit: metric ? "m³" : "yd³", hint: "before waste" },
              { label: "Hole to dig", value: metric ? fmt(r.holeDiaIn * CM_PER_IN, 0) : fmt(r.holeDiaIn, 1), unit: metric ? "cm" : "in", hint: "2× the tube diameter (Quik-Tube)" },
              { label: "Bottom below grade", value: metric ? `${fmt(r.belowGradeIn * CM_PER_IN, 0)} cm` : formatFeetInches(r.belowGradeIn / 12), hint: "compare with your frost depth" },
            ]}
          />

          <ResultsHeading>Check against the tube makers</ResultsHeading>
          <OptionTable caption="Bags per column, whole bags, no waste" columns={["Per column", "60-lb", "80-lb"]} highlight={0} rows={tableRows} />
          {r.footingCuft ? <p className="-mt-2 text-[0.78rem] text-ink-3">Maker tables cover the tube only, so they are hidden while a footing is included.</p> : null}

          <ResultsHeading>All bag sizes for the job</ResultsHeading>
          <OptionTable
            caption="Bags needed by size"
            columns={["Bag", "Bags", "Est. cost"]}
            highlight={o.bagsBySize.findIndex((b) => b.size === o.bagSize)}
            rows={o.bagsBySize.map((b) => [`${b.size} lb · ${BAG_YIELD_CUFT[b.size]} ft³`, fmtInt(b.bags), b.cost != null ? fmtMoney(b.cost) : "—"])}
          />

          {o.cuydWithWaste >= 0.75 ? <BagsVsTruck order={o} fees={v} onFees={set} /> : null}

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          <Callout tone="tip" title="Footing depth">
            Deck and porch footings must sit at least 12 in below undisturbed ground (IRC R507.3.2 / R403.1.4) and below your local frost depth. Builder&apos;s-grade tubes stay in place — Sonoco notes they are not designed to be stripped.
          </Callout>

          <ProductTimeline p={p} />

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Typical U.S. big-box prices checked 2026. Tap any price to enter your store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Sonotube / column",
            title: `Concrete for ${what}`,
            summary: `${fmtInt(o.bags)} × ${sizeLabel} bags (${fmt(o.cuydWithWaste, 2)} yd³ incl. ${fmt(o.wastePct, 0)}% extra)`,
            items,
          })}
        />
      }
    />
  );
}
