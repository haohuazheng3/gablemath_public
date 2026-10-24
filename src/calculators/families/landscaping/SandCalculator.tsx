"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { CircleDiagram, IsoBlock } from "@/components/calc/diagrams";
import { FieldSection, NumberField, Segmented, SelectField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { areaLabel } from "./area-model";
import { buyMode, computeSand, convertPrice, costOf, coveragePerCuyd, resolveBuy } from "./compute";
import { SAND_BAGS, SAND_RANGE, SAND_TYPES, SAND_USES, sandType } from "./data";
import { LayersDiagram } from "./diagrams";
import { BUY_OPTIONS, areaText, cuftText, tonsText, tonsValue, volumeText, volumeValue, weightText } from "./display";
import { AreaFields, BuyCompare, DepthFields, HaulCard, MoreOptions } from "./parts";
import { SAND_DEFAULTS, sandBag, sandInputFrom, sandPatch, sandUsePatch, type SandValues } from "./sand-model";

const CALC_KEY = "landscaping/sand-calculator";

const DEPTHS = [
  { value: 1, label: "1 in" },
  { value: 2, label: "2 in" },
  { value: 4, label: "4 in" },
  { value: 6, label: "6 in" },
  { value: 12, label: "12 in" },
];

export default function SandCalculator({ initial }: { initial?: Partial<SandValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, SAND_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const t = sandType(v.sand);
  const bag = sandBag(v.bag);
  const use = SAND_USES.find((u) => u.id === v.use);
  const isVol = v.shape === "vol";
  const r = useMemo(() => computeSand(sandInputFrom(v)), [v]);
  const choice = resolveBuy(buyMode(v.buy), r.buy);
  const bagWord = `${bag.label} bags`;
  const bulkByYd = v.bulku === "yd";

  const hero =
    choice === "bags"
      ? { value: fmtInt(r.bags), unit: `× ${bagWord}` }
      : bulkByYd
        ? { value: fmt(volumeValue(r.q.cuydOrder, metric), 2), unit: `${metric ? "m³" : "cu yd"} of ${t.short}` }
        : { value: fmt(tonsValue(r.tons, metric), 1), unit: `${metric ? "t" : "tons"} of ${t.short}` };

  const where = isVol ? `${fmt(v.vol)} ${v.vu === "ton" ? "tons" : "cu yd"}` : `${areaLabel(v, formatFeetInches)}, ${fmt(v.d)} in deep`;
  const title = `${t.short[0].toUpperCase()}${t.short.slice(1)} for ${where}`;
  const bulkAmount = bulkByYd ? Math.ceil(r.q.cuydOrder * 100) / 100 : Math.ceil(r.tons * 10) / 10;

  const items: ShoppingItem[] =
    choice === "bags"
      ? [{ id: "sand-bags", name: `${t.name}, ${bagWord}`, qty: r.bags, unit: "bags", cost: r.buy.bagCost, note: `${weightText(r.bags * bag.lb, false)} to lift` }]
      : [
          { id: "sand-bulk", name: `${t.name}, bulk`, qty: bulkAmount, unit: bulkByYd ? "cu yd" : "tons", cost: r.buy.bulkMaterial, note: choice === "pickup" ? `${fmtInt(r.pickupTrips)} pickup trips at ${fmtInt(v.payload)} lb` : undefined },
          ...(choice === "delivered" ? [{ id: "delivery", name: "Delivery", qty: Math.max(1, r.truck.loads), unit: r.truck.loads > 1 ? "loads" : "load", cost: Math.max(1, r.truck.loads) * v.del }] : []),
        ];

  const costLines: CostLine[] =
    choice === "bags"
      ? v.bp > 0
        ? [{ priceId: `sand-${t.id}-bag-${bag.id}`, label: `${t.short}, ${bagWord}`, qty: r.bags, unit: "bags", defaultPrice: v.bp }]
        : []
      : [
          ...(v.bulkp > 0 ? [{ priceId: `sand-${t.id}-${bulkByYd ? "yd" : "ton"}`, label: `${t.short}, bulk`, qty: bulkAmount, unit: bulkByYd ? "cu yd" : "tons", defaultPrice: v.bulkp }] : []),
          ...(choice === "delivered" && v.del > 0 ? [{ priceId: "landscape-delivery", label: "Delivery", qty: Math.max(1, r.truck.loads), unit: r.truck.loads > 1 ? "loads" : "load", defaultPrice: v.del }] : []),
        ];

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${hero.value} ${hero.unit}` }}
      inputs={
        <>
          <FieldSection title="What's it for?">
            <Segmented label="Job" columns={4} value={v.use} options={SAND_USES.map((u) => ({ value: u.id, label: u.label }))} onChange={(id) => set(sandUsePatch(id))} help={use?.note} />
          </FieldSection>

          <FieldSection title="Size">
            <AreaFields
              v={v}
              set={set}
              shapes={[
                { value: "rect", label: "Rectangle" },
                { value: "circle", label: "Round" },
                { value: "sqft", label: "Sq ft" },
                { value: "vol", label: "Amount", sub: "yd or tons" },
              ]}
            />
            {isVol ? null : <DepthFields label="Depth" value={v.d} options={DEPTHS} onChange={(d) => set({ d })} />}
          </FieldSection>

          <FieldSection title="Sand & bags">
            <SelectField label="Sand" value={t.id as string} onChange={(id) => set(sandPatch(id))} options={SAND_TYPES.map((x) => ({ value: x.id as string, label: x.name }))} help={t.note} />
            <Segmented
              label="Bag"
              columns={SAND_BAGS.length}
              value={bag.id as string}
              options={SAND_BAGS.map((b) => ({ value: b.id as string, label: b.label, sub: `${fmt(b.cuft)} cu ft` }))}
              onChange={(id) => set({ bag: id })}
              help="Weight-labelled bags hold about 1 cu ft per 100 lb (Sakrete: a 60 lb bag yields about 0.6 cu ft)."
            />
          </FieldSection>

          <Segmented label="How you'll buy it" columns={4} value={v.buy} options={BUY_OPTIONS} onChange={(buy) => set({ buy })} />

          <MoreOptions title="Weight factor, extra & count">
            <NumberField
              label="Loose weight of sand"
              value={v.den}
              onChange={(den) => set({ den })}
              suffix="t / cu yd"
              step={0.05}
              min={0.8}
              max={2}
              decimals={2}
              help={`Published ${fmt(SAND_RANGE[0])}–${fmt(SAND_RANGE[1])} t for damp bulk sand (Vulcan, Martin Marietta, Kokosing, MI LTAP). Dry sand is lighter, wet sand heavier.`}
            />
            {isVol ? null : (
              <>
                <NumberField label="Extra for spillage & uneven ground" value={v.extra} onChange={(extra) => set({ extra })} suffix="%" step={5} min={0} max={50} decimals={0} help="Roseville Rock Supply suggests 5–10%." />
                <NumberField label="How many identical areas?" value={v.count} onChange={(count) => set({ count: Math.max(1, Math.round(count)) })} step={1} min={1} max={500} decimals={0} />
              </>
            )}
          </MoreOptions>
        </>
      }
      results={
        <>
          <ResultHero
            label="You need"
            value={hero.value}
            unit={hero.unit}
            sub={
              <>
                {volumeText(r.q.cuydOrder, metric)} ({cuftText(r.q.cuftOrder, metric)}) · {tonsText(r.tons, metric)}
                {choice === "bags" ? ` · ${weightText(r.bags * bag.lb, metric)} of bags` : ` · or ${fmtInt(r.bags)} × ${bagWord}`}
                {isVol ? "" : ` · incl. ${fmt(v.extra, 0)}% extra`}
              </>
            }
          />

          {isVol ? null : (
            <div className="flex justify-center rounded-[18px] border border-line bg-surface-2 px-3 py-4">
              {v.shape === "rect" ? (
                <IsoBlock length={v.l1} width={v.w1} depthIn={v.d} label="Sand area" />
              ) : v.shape === "circle" ? (
                <CircleDiagram diameter={v.l1} label="Sand area" />
              ) : (
                <LayersDiagram layers={[{ label: t.short, depthIn: v.d, kind: "sand" }]} caption={`${fmt(v.d)} in of ${t.short}`} />
              )}
            </div>
          )}

          <StatGrid
            stats={[
              { label: "Cubic yards", value: fmt(volumeValue(r.q.cuydOrder, metric), 2), unit: metric ? "m³" : "cu yd", hint: `${fmt(r.q.cuftOrder, 1)} cu ft` },
              {
                label: "Weight range",
                value: `${fmt(tonsValue(r.tonsLow, metric), 1)}–${fmt(tonsValue(r.tonsHigh, metric), 1)}`,
                unit: metric ? "t" : "tons",
                hint: "dry to damp; wet sand weighs more",
              },
              { label: `${bag.label} bags per ton`, value: fmtInt(Math.ceil(r.bagsPerTon)), hint: "by weight" },
              isVol
                ? { label: "Covers at 1 in", value: areaText(r.q.cuydOrder * coveragePerCuyd(1), metric), hint: "a paver bed" }
                : { label: "Area", value: areaText(r.areaSqFt, metric) },
            ]}
          />

          <ResultsHeading>Every bag size</ResultsHeading>
          <OptionTable
            caption="Bags needed by bag size"
            columns={["Bag", "Yield", "Bags", "Total weight"]}
            highlight={r.bagsByOption.findIndex((b) => b.id === bag.id)}
            rows={r.bagsByOption.map((b) => {
              const opt = SAND_BAGS.find((x) => x.id === b.id)!;
              return [b.label, `${fmt(opt.cuft)} cu ft`, fmtInt(b.bags), weightText(b.bags * opt.lb, metric)];
            })}
          />

          <BuyCompare
            heading="Bags or bulk?"
            bagsTitle={`${fmtInt(r.bags)} × ${bagWord}`}
            bagCost={r.buy.bagCost}
            bulkTitle={`${bulkByYd ? volumeText(r.q.cuydOrder, metric) : tonsText(r.tons, metric)} delivered`}
            bulkCost={r.buy.bulkDelivered}
            bulkNote={r.buy.bulkDelivered != null ? `incl. ${Math.max(1, r.truck.loads)} delivery fee${r.truck.loads > 1 ? "s" : ""}` : "no bulk price — add one"}
            cheaper={r.buy.cheaper}
            editor={
              <>
                <NumberField label="Price per bag" value={v.bp} onChange={(bp) => set({ bp })} prefix="$" step={0.25} decimals={2} stepper={false} />
                <NumberField label={`Bulk price per ${bulkByYd ? "cu yd" : "ton"}`} value={v.bulkp} onChange={(bulkp) => set({ bulkp })} prefix="$" step={1} decimals={2} stepper={false} />
                <Segmented
                  label="Yard sells by"
                  value={v.bulku}
                  options={[
                    { value: "ton", label: "Ton" },
                    { value: "yd", label: "Cu yd" },
                  ]}
                  onChange={(bulku) => set({ bulku, bulkp: convertPrice(v.bulkp, v.bulku, bulku, v.den) })}
                />
                <NumberField label="Delivery fee per load" value={v.del} onChange={(del) => set({ del })} prefix="$" step={5} decimals={0} stepper={false} />
                <p className="col-span-2 text-[0.76rem] leading-snug text-ink-3">
                  {t.bulk ? `Bulk default: ${t.bulk.note}. ` : "No dated bulk price for this sand — enter your yard's. "}Bags: Mulch Pros play sand $4.95 per 0.5 cu ft; bagged all-purpose sand $4.67–$6.20.
                </p>
              </>
            }
          >
            {r.buy.breakEvenYd != null
              ? `Bulk becomes cheaper from about ${tonsText(r.buy.breakEvenYd * v.den, metric)} (${fmtInt(Math.ceil((r.buy.breakEvenYd * 27) / bag.cuft))} bags). `
              : r.buy.bagCost != null && r.buy.bulkDelivered != null
                ? "Bags stay cheaper at these prices. "
                : ""}
            {costOf(choice, r.buy) != null ? `Your plan: ${fmtMoney(costOf(choice, r.buy)!)}.` : ""}
          </BuyCompare>

          {r.tons >= 0.25 ? <HaulCard tons={r.tons} weightLb={r.weightLb} truck={r.truck} trips={r.pickupTrips} payloadLb={v.payload} metric={metric} onPayload={(payload) => set({ payload })} /> : null}

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {v.use === "pavers" ? (
            <Callout tone="tip" title="Screed it, don't compact it">
              Unilock lays pavers on a 1 in screeded bed of coarse sand, then runs the plate compactor over the pavers to settle them in. Quikrete allows
              1–2 in; any more and pavers settle unevenly. Need the gravel base too? The{" "}
              <Link href="/landscaping/paver-base-calculator" className="font-semibold text-accent">
                paver base calculator
              </Link>{" "}
              does both layers and the edging.
            </Callout>
          ) : null}
          {v.use === "pavers" && v.d > 2 ? <Callout tone="warn">More than 2 in of bedding sand (Quikrete&apos;s upper limit) lets pavers sink unevenly — build the gravel base up instead.</Callout> : null}
          {v.use === "play" ? (
            <Callout tone="warn" title="Sand protects only low equipment">
              CPSC&apos;s public handbook rates 9 in of sand for falls up to 4 ft. For taller play sets use wood chips (10 ft) or shredded rubber — see the{" "}
              <Link href="/landscaping/mulch-calculator" className="font-semibold text-accent">
                playground mulch mode
              </Link>
              .
            </Callout>
          ) : null}
          {v.use === "slab" ? (
            <Callout tone="tip" title="Under a slab">
              The IRC allows a 4 in base of clean graded sand, gravel or crushed stone under slabs on ground. Working out the concrete? Use the{" "}
              <Link href="/concrete/slab-calculator" className="font-semibold text-accent">
                slab calculator
              </Link>
              .
            </Callout>
          ) : null}

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Bag prices are retail snapshots; bulk prices from Mulch Pros (GA) and Roseville Rock Supply (CA), Oct 2026. Tap any price to use your store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Sand",
            title,
            summary: `${fmtInt(r.bags)} × ${bagWord} or ${tonsText(r.tons, false)} (${fmt(r.q.cuydOrder, 2)} cu yd)`,
            items,
          })}
        />
      }
    />
  );
}
