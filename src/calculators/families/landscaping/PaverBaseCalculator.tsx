"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { FieldSection, NumberField, Segmented } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { areaLabel } from "./area-model";
import { buyMode, computePaverBase, convertPrice, costOf, resolveBuy } from "./compute";
import { PAVER, PAVER_BASE_DEPTHS, PAVER_BASES, PAVER_USES, aggregate } from "./data";
import { LayersDiagram } from "./diagrams";
import { BUY_OPTIONS, areaText, inchText, tonsText, tonsValue, volumeText, volumeValue } from "./display";
import { AreaFields, BuyCompare, DepthFields, HaulCard, MoreOptions } from "./parts";
import { PAVER_DEFAULTS, basePatch, paverBase, paverInputFrom, paverUse, type PaverValues } from "./paver-base-model";

const CALC_KEY = "landscaping/paver-base-calculator";

export default function PaverBaseCalculator({ initial }: { initial?: Partial<PaverValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, PAVER_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const use = paverUse(v.use);
  const base = paverBase(v.base);
  const m = aggregate(base.gravel);
  const r = useMemo(() => computePaverBase(paverInputFrom(v)), [v]);
  const b = r.base;
  const choice = resolveBuy(buyMode(v.buy), b.buy);
  const byYd = v.u === "yd";
  const chip = base.id === "clear";
  const bedding = base.bedding.toLowerCase();

  const hero =
    choice === "bags"
      ? { value: fmtInt(b.bags), unit: "× 0.5 cu ft bags of paver base" }
      : byYd
        ? { value: fmt(volumeValue(b.q.cuydOrder, metric), 2), unit: `${metric ? "m³" : "cu yd"} of ${m.short}` }
        : { value: fmt(tonsValue(b.tons, metric), 1), unit: `${metric ? "t" : "tons"} of ${m.short}` };

  const title = `Paver base for ${areaLabel(v, formatFeetInches)} ${use.label.toLowerCase()}`;
  const bulkQty = byYd ? Math.ceil(b.q.cuydOrder * 100) / 100 : Math.ceil(b.tons * 10) / 10;

  const items: ShoppingItem[] = [
    choice === "bags"
      ? { id: "base-bags", name: `Paver base, 0.5 cu ft bags — ${fmt(v.bd)} in compacted`, qty: b.bags, unit: "bags", cost: b.buy.bagCost, note: b.pallets >= 0.5 ? `${fmt(b.pallets, 1)} pallets of ${PAVER.bagsPerPallet}` : undefined }
      : { id: "base-bulk", name: `${m.name} — ${fmt(v.bd)} in compacted base`, qty: bulkQty, unit: byYd ? "cu yd" : "tons", cost: b.buy.bulkMaterial, note: choice === "pickup" ? `${fmtInt(b.pickupTrips)} pickup trips at ${fmtInt(v.payload)} lb` : undefined },
    ...(choice === "delivered" ? [{ id: "delivery", name: "Delivery", qty: Math.max(1, b.truck.loads), unit: b.truck.loads > 1 ? "loads" : "load", cost: Math.max(1, b.truck.loads) * v.del }] : []),
    chip
      ? { id: "bedding", name: `${base.bedding} bedding — ${fmt(v.sd)} in`, qty: Math.ceil(r.bedding.q.cuftOrder * 10) / 10, unit: "cu ft", note: `${fmtInt(r.bedding.bags)} bags of 0.5 cu ft` }
      : { id: "bedding", name: `Paver leveling sand (coarse concrete sand), 0.5 cu ft bags — ${fmt(v.sd)} in`, qty: r.bedding.bags, unit: "bags", cost: r.bedding.cost },
    ...(r.edgeFt > 0 ? [{ id: "edge", name: "Paver edge restraint (plastic, metal or concrete), spiked into the base", qty: Math.ceil(r.edgeFt), unit: "ft" }] : []),
    { id: "pipes", name: "1 in pipes for screed guides", qty: 2, unit: "pipes" },
    { id: "compactor", name: "Plate compactor rental (with paver pad)", qty: 1, unit: "day" },
  ];

  const costLines: CostLine[] = [
    ...(choice === "bags"
      ? v.bp > 0
        ? [{ priceId: `paver-base-bag`, label: "Paver base, 0.5 cu ft bags", qty: b.bags, unit: "bags", defaultPrice: v.bp }]
        : []
      : v.p > 0
        ? [{ priceId: `gravel-${m.id}-${byYd ? "yd" : "ton"}`, label: `${m.short}, bulk`, qty: bulkQty, unit: byYd ? "cu yd" : "tons", defaultPrice: v.p }]
        : []),
    ...(choice === "delivered" && v.del > 0 ? [{ priceId: "landscape-delivery", label: "Delivery", qty: Math.max(1, b.truck.loads), unit: b.truck.loads > 1 ? "loads" : "load", defaultPrice: v.del }] : []),
    ...(!chip && v.sp > 0 ? [{ priceId: "sand-leveling-bag-c05", label: "Paver leveling sand, 0.5 cu ft bags", qty: r.bedding.bags, unit: "bags", defaultPrice: v.sp }] : []),
  ];

  return (
    <CalcFrame
      dock={{ label: "Base to order", value: `${hero.value} ${hero.unit.replace(" of paver base", "")}` }}
      inputs={
        <>
          <FieldSection title="What are you paving?">
            <Segmented
              label="Project"
              columns={4}
              value={v.use}
              options={PAVER_USES.map((u) => ({ value: u.id, label: u.label }))}
              onChange={(id) => set({ use: id, bd: paverUse(id).baseIn })}
              help={`Unilock: ${use.range[0]}–${use.range[1]} in of compacted base under ${use.label.toLowerCase()}s. Clay soil needs the deeper end; sandy soil less.`}
            />
          </FieldSection>

          <FieldSection title="Paved area">
            <AreaFields
              v={v}
              set={set}
              shapes={[
                { value: "rect", label: "Rectangle" },
                { value: "circle", label: "Round" },
                { value: "sqft", label: "Sq ft" },
              ]}
            />
          </FieldSection>

          <FieldSection title="Base & bedding">
            <Segmented label="Base stone" value={base.id as string} options={PAVER_BASES.map((x) => ({ value: x.id as string, label: x.label, sub: x.sub }))} onChange={(id) => set(basePatch(id))} help={`Bedding layer for this base: ${bedding} (Unilock).`} />
            <DepthFields label="Compacted base depth" value={v.bd} options={PAVER_BASE_DEPTHS} onChange={(bd) => set({ bd })} exactLabel="Exact base depth" />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Bedding layer" value={v.sd} onChange={(sd) => set({ sd })} suffix="in" step={0.25} min={0} max={4} decimals={2} stepper={false} hint="Unilock: 1 in" />
              <NumberField label="Paver thickness" value={v.pv} onChange={(pv) => set({ pv })} suffix="in" step={0.125} min={0} max={6} decimals={3} stepper={false} hint="from the label" />
            </div>
          </FieldSection>

          <Segmented label="How you'll buy the base" columns={4} value={v.buy} options={BUY_OPTIONS} onChange={(buy) => set({ buy })} />

          <MoreOptions title="Edges, compaction, weight & extra">
            <NumberField label="Extend base past the edges" value={v.ext} onChange={(ext) => set({ ext })} suffix="in" step={1} min={0} max={24} decimals={0} help="Quikrete extends the base at least 6 in beyond the paved area, so edge restraints sit on compacted stone." />
            <NumberField label="Edges against a house, steps or slab" value={v.wall} onChange={(wall) => set({ wall })} suffix="ft" step={1} min={0} max={1000} decimals={1} help="These sides need no edge restraint." />
            {chip ? null : (
              <NumberField label="Compaction factor" value={v.cf} onChange={(cf) => set({ cf })} suffix="× loose" step={0.05} min={1} max={1.6} decimals={2} help="Loose volume per compacted volume. Penn State: 8 in loose → 6 in compacted (1.33)." />
            )}
            <NumberField label={`Loose weight — ${m.short}`} value={v.den} onChange={(den) => set({ den })} suffix="t / cu yd" step={0.05} min={0.8} max={3} decimals={2} help={`${m.densityNote}.`} />
            <NumberField label="Extra for an uneven subgrade" value={v.extra} onChange={(extra) => set({ extra })} suffix="%" step={5} min={0} max={50} decimals={0} help="Compaction is already counted; Roseville Rock Supply suggests 5–10% extra." />
            <NumberField label="How many identical areas?" value={v.count} onChange={(count) => set({ count: Math.max(1, Math.round(count)) })} step={1} min={1} max={500} decimals={0} />
          </MoreOptions>
        </>
      }
      results={
        <>
          <ResultHero
            label="Base to order"
            value={hero.value}
            unit={hero.unit}
            sub={
              <>
                {volumeText(b.q.cuydOrder, metric)} loose for {fmt(v.bd)} in compacted · plus {fmtInt(r.bedding.bags)} × 0.5 cu ft bags of {chip ? "chip stone" : "bedding sand"}
                {r.edgeFt > 0 ? ` · ${fmtInt(Math.ceil(r.edgeFt))} ft of edge restraint` : ""}
              </>
            }
          />

          <div className="flex justify-center rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            <LayersDiagram
              layers={[
                { label: "Pavers", depthIn: v.pv, kind: "paver" },
                { label: chip ? "Chip stone bed" : "Bedding sand", depthIn: v.sd, kind: chip ? "fines" : "sand" },
                { label: `${m.short[0].toUpperCase()}${m.short.slice(1)} base`, depthIn: v.bd, kind: chip ? "stone" : "fines" },
              ]}
              caption={`Cross-section: ${fmt(v.pv)} in pavers on ${fmt(v.sd)} in ${bedding} over ${fmt(v.bd)} in compacted ${m.short}`}
            />
          </div>

          <StatGrid
            stats={[
              { label: "Base, tons", value: fmt(tonsValue(b.tons, metric), 1), unit: metric ? "t" : "tons", hint: `published range ${fmt(tonsValue(b.tonsLow, metric), 1)}–${fmt(tonsValue(b.tonsHigh, metric), 1)}` },
              { label: "Base, 0.5 cu ft bags", value: fmtInt(b.bags), hint: `${fmt(b.pallets, 1)} pallets of ${PAVER.bagsPerPallet}` },
              { label: chip ? "Chip stone bedding" : "Bedding sand", value: fmtInt(r.bedding.bags), unit: "bags", hint: `${fmt(r.bedding.q.cuftOrder, 1)} cu ft · ${tonsText(r.bedding.tons, metric, 2)}` },
              { label: "Dig down", value: inchText(r.excavation.depthIn, metric), hint: `${volumeText(r.excavation.cuyd, metric)} of soil to remove` },
            ]}
          />

          {b.factor > 1 ? (
            <Callout tone="info" title="Order loose, finish compacted">
              Spread about {fmt(b.looseDepthIn, 1)} in of {m.short} and compact it in {fmtInt(b.lifts)} lifts no thicker than 3 in (Unilock) to finish at {fmt(v.bd)} in. That is why the
              order is {fmt(b.factor)}× the compacted volume — County Materials&apos; bag rule (sq ft ÷ 6 × depth) leaves compaction out, and DIYers run short.
            </Callout>
          ) : (
            <Callout tone="info" title="Clear stone base">
              Open-graded 3/4 in stone drains freely and doesn&apos;t shrink much under the compactor, so it is ordered at its finished depth. Unilock beds pavers on it with 1/8 in chip stone instead of sand,
              which can migrate down into the stone&apos;s open voids.
            </Callout>
          )}

          <ResultsHeading>Other base depths</ResultsHeading>
          <OptionTable
            caption="Base needed at other compacted depths"
            columns={["Base depth", "Tons", "0.5 cu ft bags", "Dig down"]}
            highlight={PAVER_BASE_DEPTHS.findIndex((d) => d.value === v.bd)}
            rows={PAVER_BASE_DEPTHS.map((d) => {
              const x = computePaverBase(paverInputFrom({ ...v, bd: d.value }));
              return [`${d.label}${d.value >= use.range[0] && d.value <= use.range[1] ? " ✓" : ""}`, tonsText(x.base.tons, metric), fmtInt(x.base.bags), inchText(x.excavation.depthIn, metric)];
            })}
          />
          <p className="-mt-2 text-[0.76rem] text-ink-3">✓ within Unilock&apos;s range for a {use.label.toLowerCase()}.</p>

          <BuyCompare
            heading="Bulk or bags for the base?"
            bagsTitle={`${fmtInt(b.bags)} × 0.5 cu ft bags`}
            bagCost={b.buy.bagCost}
            bulkTitle={`${byYd ? volumeText(b.q.cuydOrder, metric) : tonsText(b.tons, metric)} delivered`}
            bulkCost={b.buy.bulkDelivered}
            bulkNote={`incl. ${Math.max(1, b.truck.loads)} delivery fee${b.truck.loads > 1 ? "s" : ""}`}
            cheaper={b.buy.cheaper}
            editor={
              <>
                <NumberField label={`Bulk price per ${byYd ? "cu yd" : "ton"}`} value={v.p} onChange={(p) => set({ p })} prefix="$" step={1} decimals={2} stepper={false} />
                <Segmented
                  label="Yard sells by"
                  value={v.u}
                  options={[
                    { value: "ton", label: "Ton" },
                    { value: "yd", label: "Cu yd" },
                  ]}
                  onChange={(u) => set({ u, p: convertPrice(v.p, v.u, u, v.den) })}
                />
                <NumberField label="Delivery fee per load" value={v.del} onChange={(del) => set({ del })} prefix="$" step={5} decimals={0} stepper={false} />
                <NumberField label="Base, per 0.5 cu ft bag" value={v.bp} onChange={(bp) => set({ bp })} prefix="$" step={0.25} decimals={2} stepper={false} />
                {chip ? null : <NumberField label="Leveling sand, per bag" value={v.sp} onChange={(sp) => set({ sp })} prefix="$" step={0.25} decimals={2} stepper={false} />}
                <p className="col-span-2 text-[0.76rem] leading-snug text-ink-3">
                  {m.priceNote}. Bagged paver base runs $5.37–$7.49 per 0.5 cu ft; big-box pallet prices include delivery.
                </p>
              </>
            }
          >
            {b.buy.breakEvenYd != null ? `Bulk becomes cheaper from about ${tonsText(b.buy.breakEvenYd * v.den, metric)} of base (${fmtInt(Math.ceil((b.buy.breakEvenYd * 27) / PAVER.bagCuft))} bags). ` : ""}
            {costOf(choice, b.buy) != null ? `Your plan for the base: ${fmtMoney(costOf(choice, b.buy)!)}` : ""}
            {r.bedding.cost != null ? `, plus ${fmtMoney(r.bedding.cost)} of bedding sand.` : "."}
          </BuyCompare>

          <HaulCard tons={b.tons} weightLb={b.weightLb} truck={b.truck} trips={b.pickupTrips} payloadLb={v.payload} metric={metric} onPayload={(payload) => set({ payload })} />

          <div className="rounded-[18px] border border-line p-4">
            <h3 className="text-[0.95rem] font-semibold text-ink">Digging out</h3>
            <p className="mt-1.5 text-[0.86rem] leading-relaxed text-ink-2">
              Excavate {inchText(r.excavation.depthIn, metric)} below finished grade ({fmt(v.bd)} in base + {fmt(v.sd)} in bedding + {fmt(v.pv, 3)} in paver) over{" "}
              {areaText(r.baseAreaSqFt, metric)}. That is {volumeText(r.excavation.cuyd, metric)} of soil — about {tonsText(r.excavation.tons, metric)} in place, more once it is dug and loose. Slope the base away
              from the house (Unilock).
            </p>
          </div>

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {r.approxEdges ? <Callout tone="info">Edges and the base extension are estimated as if the area were square. Enter length and width for an exact edging count.</Callout> : null}
          <Callout tone="tip" title="Don't skip the edge restraint">
            Unilock calls edge restraints critical: plastic, metal or concrete edging, spiked into the compacted base, keeps pavers from creeping sideways. After the pavers are compacted, sweep jointing
            or polymeric sand into the joints — coverage depends on paver and joint size, so go by the bag label.
          </Callout>
          {v.use === "driveway" ? (
            <Callout tone="tip" title="Gravel driveway instead?">
              The <Link href="/landscaping/gravel-calculator" className="font-semibold text-accent">gravel calculator</Link> handles layered driveways with compaction and truck loads.
            </Callout>
          ) : null}

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Bulk base and bag prices are typical 2026 figures (American Rock Supply, Kellogg Supply, retail snapshots). Tap any price to use your yard's or store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Paver base",
            title,
            summary: `${tonsText(b.tons, false)} of ${m.short} (${fmt(v.bd)} in compacted) + ${fmtInt(r.bedding.bags)} bags of ${chip ? "chip stone" : "bedding sand"}`,
            items,
          })}
        />
      }
    />
  );
}
