"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { CircleDiagram, IsoBlock } from "@/components/calc/diagrams";
import { FieldSection, LengthField, NumberField, Segmented, SelectField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { areaLabel } from "./area-model";
import { bagsFor, buyMode, computeSoil, costOf, resolveBuy } from "./compute";
import { RAISED_BED_HEIGHTS, SOIL_BAG_SIZES, SOIL_TYPES, SOIL_USES, soilType } from "./data";
import { LayersDiagram } from "./diagrams";
import { BUY_OPTIONS, areaText, bagSizeLabel, cuftText, tonsText, volumeText, volumeValue } from "./display";
import { AreaFields, BuyCompare, DepthFields, HaulCard, MoreOptions } from "./parts";
import { TOPSOIL_DEFAULTS, materialPatch, modePatch, soilBagPrice, soilUsePatch, topsoilInputFrom, type TopsoilValues } from "./topsoil-model";

const CALC_KEY = "landscaping/topsoil-calculator";

const AREA_DEPTHS = [
  { value: 2, label: "2 in" },
  { value: 3, label: "3 in" },
  { value: 4, label: "4 in" },
  { value: 6, label: "6 in" },
];

export default function TopsoilCalculator({ initial }: { initial?: Partial<TopsoilValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, TOPSOIL_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const beds = v.mode === "beds";
  const s = soilType(v.mat);
  const r = useMemo(() => computeSoil(topsoilInputFrom(v)), [v]);
  const choice = resolveBuy(buyMode(v.buy), r.buy);
  const showBags = beds || choice === "bags";
  const sizeLabel = bagSizeLabel(v.bag);
  const use = SOIL_USES.find((u) => u.id === v.use);
  const priceInfo = soilBagPrice(s.id, v.bag);
  const approx = s.weightEstimate ? "≈ " : "";

  const hero = showBags ? { value: fmtInt(r.bags), unit: `× ${sizeLabel} bags` } : { value: fmt(volumeValue(r.q.cuydOrder, metric), 2), unit: `${metric ? "m³" : "cu yd"} of ${s.short}` };
  const where = beds ? `${v.beds > 1 ? `${v.beds} × ` : ""}${formatFeetInches(v.bl)} × ${formatFeetInches(v.bw)} raised bed${v.beds > 1 ? "s" : ""}, ${fmt(v.bh)} in deep` : `${areaLabel(v, formatFeetInches)}, ${fmt(v.d)} in deep`;
  const title = `${s.short[0].toUpperCase()}${s.short.slice(1)} for ${where}`;

  const split = r.blendSplit;
  const diyTop = split ? bagsFor(split.topsoilCuft, 1) : 0;
  const diyCompost = split ? bagsFor(split.compostCuft, 1.5) : 0;
  const topPrice = soilBagPrice("topsoil", 1).price ?? 0;
  const compostPrice = soilBagPrice("compost", 1.5).price ?? 0;

  const items: ShoppingItem[] =
    choice === "bags"
      ? split
        ? [
            { id: "diy-topsoil", name: "Topsoil, 1 cu ft bags (half of a 50/50 mix)", qty: diyTop, unit: "bags", cost: diyTop * topPrice },
            { id: "diy-compost", name: "Compost, 1.5 cu ft bags (half of a 50/50 mix)", qty: diyCompost, unit: "bags", cost: diyCompost * compostPrice },
          ]
        : [{ id: "soil-bags", name: `${s.name}, ${sizeLabel} bags`, qty: r.bags, unit: "bags", cost: r.buy.bagCost }]
      : [
          { id: "soil-bulk", name: `${s.name}, bulk`, qty: Math.ceil(r.q.cuydOrder * 10) / 10, unit: "cu yd", cost: r.buy.bulkMaterial, note: choice === "pickup" ? `${fmtInt(r.pickupTrips)} pickup trips at ${fmtInt(v.payload)} lb` : undefined },
          ...(choice === "delivered" ? [{ id: "delivery", name: "Delivery", qty: Math.max(1, r.truck.loads), unit: r.truck.loads > 1 ? "loads" : "load", cost: Math.max(1, r.truck.loads) * v.del }] : []),
        ];

  const costLines: CostLine[] = items.flatMap((it): CostLine[] => {
    if (it.id === "diy-topsoil") return topPrice ? [{ priceId: "soil-topsoil-1", label: "Topsoil, 1 cu ft bags", qty: it.qty, unit: "bags", defaultPrice: topPrice }] : [];
    if (it.id === "diy-compost") return compostPrice ? [{ priceId: "soil-compost-1.5", label: "Compost, 1.5 cu ft bags", qty: it.qty, unit: "bags", defaultPrice: compostPrice }] : [];
    if (it.id === "soil-bags") return v.bp > 0 ? [{ priceId: `soil-${s.id}-${v.bag}`, label: `${s.short}, ${sizeLabel} bags`, qty: it.qty, unit: "bags", defaultPrice: v.bp, note: priceInfo.estimated ? "estimated from the per-cu-ft price of another bag" : undefined }] : [];
    if (it.id === "soil-bulk") return v.bulk > 0 ? [{ priceId: `soil-${s.id}-yd`, label: `${s.short}, bulk`, qty: it.qty, unit: "cu yd", defaultPrice: v.bulk }] : [];
    if (it.id === "delivery") return v.del > 0 ? [{ priceId: "landscape-delivery", label: "Delivery", qty: it.qty, unit: it.unit, defaultPrice: v.del }] : [];
    return [];
  });

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${hero.value} ${hero.unit}` }}
      inputs={
        <>
          <FieldSection title="What are you filling?">
            <Segmented
              label="Job"
              value={v.mode}
              options={[
                { value: "area", label: "Yard or garden" },
                { value: "beds", label: "Raised beds" },
              ]}
              onChange={(m) => set(modePatch(m))}
            />
            {beds ? null : (
              <Segmented label="Project" columns={3} value={v.use} options={SOIL_USES.map((u) => ({ value: u.id, label: u.label }))} onChange={(id) => set(soilUsePatch(id, v.bag))} help={use?.note} />
            )}
          </FieldSection>

          {beds ? (
            <FieldSection title="Bed size (inside the frame)">
              <div className="grid grid-cols-2 gap-3">
                <LengthField label="Length" value={v.bl} onChange={(bl) => set({ bl })} />
                <LengthField label="Width" value={v.bw} onChange={(bw) => set({ bw })} />
              </div>
              <DepthFields label="Soil depth" value={v.bh} options={RAISED_BED_HEIGHTS} onChange={(bh) => set({ bh })} help="Measure inside the boards: a frame of 2×12s stands about 11¼ in, not 12." max={48} />
              <NumberField label="How many beds this size?" value={v.beds} onChange={(n) => set({ beds: Math.max(1, Math.round(n)) })} step={1} min={1} max={200} decimals={0} />
            </FieldSection>
          ) : (
            <FieldSection title="Size & depth">
              <AreaFields
                v={v}
                set={set}
                shapes={[
                  { value: "rect", label: "Rectangle" },
                  { value: "circle", label: "Round" },
                  { value: "sqft", label: "Sq ft" },
                ]}
              />
              <DepthFields label="Depth" value={v.d} options={AREA_DEPTHS} onChange={(d) => set({ d })} />
            </FieldSection>
          )}

          <FieldSection title="Material & bags">
            <SelectField label="Material" value={s.id as string} onChange={(id) => set(materialPatch(id, v.bag))} options={SOIL_TYPES.map((x) => ({ value: x.id as string, label: x.name }))} help={s.note} />
            <Segmented
              label="Bag size"
              columns={SOIL_BAG_SIZES.length}
              value={v.bag}
              options={SOIL_BAG_SIZES.map((size) => {
                const p = soilBagPrice(s.id, size);
                return { value: size, label: bagSizeLabel(size), sub: p.price != null ? `${p.estimated ? "≈ " : ""}${fmtMoney(p.price)}` : undefined };
              })}
              onChange={(bag) => set({ bag, bp: soilBagPrice(s.id, bag).price ?? 0 })}
            />
          </FieldSection>

          <Segmented label="How you'll buy it" columns={4} value={v.buy} options={BUY_OPTIONS} onChange={(buy) => set({ buy })} />

          <MoreOptions title="Settling, identical areas & delivery">
            <NumberField label="Extra for settling" value={v.settle} onChange={(settle) => set({ settle })} suffix="%" step={5} min={0} max={50} decimals={0} help="Loose soil settles after the first watering; Roseville Rock Supply suggests ordering 5–10% extra." />
            {beds ? null : <NumberField label="How many identical areas?" value={v.count} onChange={(count) => set({ count: Math.max(1, Math.round(count)) })} step={1} min={1} max={500} decimals={0} />}
            <NumberField label="Delivery fee per load" value={v.del} onChange={(del) => set({ del })} prefix="$" step={5} decimals={0} stepper={false} />
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
                {volumeText(r.q.cuydOrder, metric)} ({cuftText(r.q.cuftOrder, metric)}) of {s.short}
                {showBags ? "" : ` · or ${fmtInt(r.bags)} × ${sizeLabel} bags`}
                {beds && v.beds > 1 ? ` · ${fmtInt(r.perBed?.bags ?? 0)} bags per bed` : ""} · incl. {fmt(v.settle, 0)}% for settling
              </>
            }
          />

          <div className="flex justify-center rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            {beds ? (
              <IsoBlock length={v.bl} width={v.bw} depthIn={v.bh} label="Raised bed" />
            ) : v.shape === "circle" ? (
              <CircleDiagram diameter={v.l1} label="Soil area" />
            ) : v.shape === "rect" ? (
              <IsoBlock length={v.l1} width={v.w1} depthIn={v.d} label="Soil area" />
            ) : (
              <LayersDiagram layers={[{ label: s.short, depthIn: v.d, kind: "soil" }]} caption={`${fmt(v.d)} in of ${s.short}`} />
            )}
          </div>

          <StatGrid
            stats={[
              { label: "Cubic yards", value: fmt(volumeValue(r.q.cuydOrder, metric), 2), unit: metric ? "m³" : "cu yd", hint: `${fmt(r.q.cuydFinished, 2)} before settling` },
              { label: "Cubic feet", value: fmt(r.q.cuftOrder, 1), unit: "cu ft" },
              { label: "Weight", value: `${approx}${tonsText(r.tons, metric)}`, hint: s.weightEstimate ? "estimate — varies with moisture" : "dry; wet soil weighs more" },
              beds ? { label: "Soil per bed", value: fmt(r.perBed?.cuft ?? 0, 1), unit: "cu ft", hint: `${fmtInt(r.perBed?.bags ?? 0)} × ${sizeLabel} bags` } : { label: "Area", value: areaText(r.areaSqFt, metric) },
            ]}
          />

          <ResultsHeading>Every bag size</ResultsHeading>
          <OptionTable
            caption="Bags needed by bag size"
            columns={["Bag", "Bags", "Est. cost"]}
            highlight={r.bagsBySize.findIndex((b) => b.size === v.bag)}
            rows={r.bagsBySize.map((b) => {
              const p = soilBagPrice(s.id, b.size);
              return [bagSizeLabel(b.size), fmtInt(b.bags), p.price != null ? `${p.estimated ? "≈ " : ""}${fmtMoney(b.bags * p.price)}` : "—"];
            })}
          />

          {split ? (
            <Callout tone="info" title="Mix it yourself">
              A 50/50 blend is {fmt(split.topsoilCuft, 1)} cu ft of topsoil plus {fmt(split.compostCuft, 1)} cu ft of compost — {fmtInt(diyTop)} × 1 cu ft bags of topsoil and {fmtInt(diyCompost)} × 1.5 cu ft
              bags of compost, about {fmtMoney(diyTop * topPrice + diyCompost * compostPrice)}. Premixed bulk blend runs {s.bulkNote}.
            </Callout>
          ) : null}

          <BuyCompare
            heading="Bags or bulk?"
            bagsTitle={`${fmtInt(r.bags)} × ${sizeLabel} bags`}
            bagCost={r.buy.bagCost}
            bulkTitle={`${fmt(r.q.cuydOrder, 2)} cu yd delivered`}
            bulkCost={r.buy.bulkDelivered}
            bulkNote={`incl. ${Math.max(1, r.truck.loads)} delivery fee${r.truck.loads > 1 ? "s" : ""}`}
            cheaper={r.buy.cheaper}
            editor={
              <>
                <NumberField label={`Price per ${sizeLabel} bag`} value={v.bp} onChange={(bp) => set({ bp })} prefix="$" step={0.25} decimals={2} stepper={false} />
                <NumberField label="Bulk price per cu yd" value={v.bulk} onChange={(bulk) => set({ bulk })} prefix="$" step={1} decimals={2} stepper={false} />
                <NumberField label="Delivery fee per load" value={v.del} onChange={(del) => set({ del })} prefix="$" step={5} decimals={0} stepper={false} />
                <p className="col-span-2 text-[0.76rem] leading-snug text-ink-3">Bulk {s.short}: {s.bulkNote}. Bag prices: Mulch Pros (GA), Oct 22, 2026.</p>
              </>
            }
          >
            {r.buy.breakEvenYd != null
              ? `Bulk becomes cheaper from about ${fmt(r.buy.breakEvenYd, 1)} cu yd (${fmtInt(Math.ceil((r.buy.breakEvenYd * 27) / v.bag))} bags of ${sizeLabel}). `
              : r.buy.bagCost != null && r.buy.bulkDelivered != null
                ? "Bags stay cheaper at these prices. "
                : ""}
            {r.buy.bagPerYd != null ? `Bagged ${s.short} works out to ${fmtMoney(r.buy.bagPerYd)} per cubic yard. ` : ""}
            {costOf(choice, r.buy) != null ? `Your plan: ${fmtMoney(costOf(choice, r.buy)!)}.` : ""}
          </BuyCompare>

          {r.tons >= 0.5 ? <HaulCard tons={r.tons} weightLb={r.weightLb} truck={r.truck} trips={r.pickupTrips} payloadLb={v.payload} metric={metric} onPayload={(payload) => set({ payload })} /> : null}

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {beds && v.bh >= 18 ? (
            <Callout tone="tip" title="Filling a deep bed?">
              Some gardeners fill the bottom of tall beds with coarse organic material and save bought soil for the top foot — set the soil depth to
              just that top layer to price it.
            </Callout>
          ) : v.use === "lawn" ? (
            <Callout tone="tip" title="Spread it over loosened ground">
              Roseville Rock Supply recommends 4–6 in of topsoil under new lawn. Loosen the subsoil first so the layers knit together, and order screened
              topsoil — unscreened material carries rocks and roots.
            </Callout>
          ) : null}

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Bag prices from the Mulch Pros (GA) list of Oct 22, 2026; bulk prices from Mulch Pros and Roseville Rock Supply. Tap any price to use your store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Topsoil & raised beds",
            title,
            summary: `${fmt(r.q.cuydOrder, 2)} cu yd (${fmtInt(r.bags)} × ${sizeLabel} bags) incl. ${fmt(v.settle, 0)}% for settling`,
            items,
          })}
        />
      }
    />
  );
}
