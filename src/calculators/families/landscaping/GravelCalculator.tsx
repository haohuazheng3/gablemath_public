"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { CircleDiagram, IsoBlock } from "@/components/calc/diagrams";
import { FieldSection, NumberField, Segmented, SelectField, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { areaLabel } from "./area-model";
import { buyMode, computeGravel, convertPrice, costOf, coveragePerCuyd, pickupTrips, resolveBuy, type BuyChoice, type GravelLayerResult } from "./compute";
import { AGGREGATES, GRAVEL_DEPTHS, GRAVEL_USES, STONE_BAG_CUFT, aggregate } from "./data";
import { LayersDiagram, type DiagramLayer } from "./diagrams";
import { BUY_OPTIONS, areaText, tonsText, tonsValue, volumeText, volumeValue } from "./display";
import { GRAVEL_DEFAULTS, gravelInputFrom, layerPatch, layerValues, materialPatch, projectPatch, type GravelValues } from "./gravel-model";
import { AreaFields, BuyCompare, DepthFields, HaulCard, MoreOptions } from "./parts";

const CALC_KEY = "landscaping/gravel-calculator";

type Row = GravelLayerResult & { n: 1 | 2; choice: BuyChoice };

export default function GravelCalculator({ initial }: { initial?: Partial<GravelValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, GRAVEL_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const r = useMemo(() => computeGravel(gravelInputFrom(v)), [v]);
  const use = GRAVEL_USES.find((u) => u.id === v.use);
  const isVol = v.shape === "vol";
  const mode = buyMode(v.buy);
  const rows: Row[] = r.layers.map((l, i) => ({ ...l, n: (i + 1) as 1 | 2, choice: resolveBuy(mode, l.buy) }));
  const main = rows[0];
  const m1 = aggregate(main.layer.material);
  const twoLayers = rows.length > 1;

  const amountOf = (l: Row) =>
    l.choice === "bags"
      ? { value: fmtInt(l.buy.bags), unit: `× ${fmt(STONE_BAG_CUFT)} cu ft bags` }
      : l.layer.unit === "yd"
        ? { value: fmt(volumeValue(l.q.cuydOrder, metric), 2), unit: metric ? "m³" : "cu yd" }
        : { value: fmt(tonsValue(l.tons, metric), 1), unit: metric ? "t" : "tons" };
  const hero = twoLayers ? { value: fmt(tonsValue(r.totalTons, metric), 1), unit: metric ? "t total" : "tons total" } : amountOf(main);
  const describe = (l: Row) => {
    const a = amountOf(l);
    return `${a.value} ${a.unit} ${aggregate(l.layer.material).short}`;
  };

  const dims = isVol ? `${fmt(v.vol)} ${v.vu === "ton" ? "tons" : "cu yd"}` : areaLabel(v, formatFeetInches);
  const title = `Gravel for ${dims}${use && !isVol ? ` (${use.label.toLowerCase()})` : ""}`;

  const diagramLayers: DiagramLayer[] = rows.map((l) => {
    const m = aggregate(l.layer.material);
    return { label: `${m.short}${l.factor > 1 ? " (compacted)" : ""}`, depthIn: l.layer.depthIn, kind: m.compaction ? "fines" : "stone" };
  });
  const showSection = !isVol && (twoLayers || main.factor > 1 || (v.shape !== "rect" && v.shape !== "circle"));

  const delivered = rows.filter((l) => l.choice === "delivered");
  const deliveryLoads = delivered.reduce((s, l) => s + Math.max(1, l.truck.loads), 0);
  const fabric = !isVol && (v.use === "cover" || v.use === "path" || v.use === "drive" || v.use === "play");
  const edging = !isVol && (v.use === "cover" || v.use === "path" || v.use === "play") && r.perimeterFt > 0;

  const items: ShoppingItem[] = [
    ...rows.map((l): ShoppingItem => {
      const m = aggregate(l.layer.material);
      const depth = isVol ? "" : ` — ${fmt(l.layer.depthIn)} in${l.factor > 1 ? " compacted" : ""}`;
      if (l.choice === "bags") return { id: `l${l.n}-bags`, name: `${m.name}, ${fmt(STONE_BAG_CUFT)} cu ft bags${depth}`, qty: l.buy.bags, unit: "bags", cost: l.buy.bagCost };
      const byYd = l.layer.unit === "yd";
      return {
        id: `l${l.n}-bulk`,
        name: `${m.name}${depth}`,
        qty: byYd ? Math.ceil(l.q.cuydOrder * 100) / 100 : Math.ceil(l.tons * 10) / 10,
        unit: byYd ? "cu yd" : "tons",
        cost: l.buy.bulkMaterial,
        note: l.choice === "pickup" ? `${fmtInt(l.pickupTrips)} pickup trip${l.pickupTrips === 1 ? "" : "s"} at ${fmtInt(v.payload)} lb` : undefined,
      };
    }),
    ...(deliveryLoads ? [{ id: "delivery", name: "Delivery", qty: deliveryLoads, unit: deliveryLoads === 1 ? "load" : "loads", cost: deliveryLoads * v.del }] : []),
    ...(fabric ? [{ id: "fabric", name: v.use === "drive" ? "Woven geotextile fabric (driveway grade)" : "Landscape fabric", qty: Math.ceil(r.areaSqFt), unit: "sq ft", note: "plus overlap at seams" }] : []),
    ...(edging ? [{ id: "edging", name: "Landscape edging", qty: Math.ceil(r.perimeterFt), unit: "ft", note: "keeps gravel out of the lawn" }] : []),
    ...(rows.some((l) => l.factor > 1) ? [{ id: "compactor", name: "Plate compactor rental", qty: 1, unit: "day" }] : []),
  ];

  const costLines: CostLine[] = [
    ...rows.flatMap((l): CostLine[] => {
      const m = aggregate(l.layer.material);
      if (l.choice === "bags") return l.layer.bagPrice > 0 ? [{ priceId: `gravel-${m.id}-bag`, label: `${m.short}, ${fmt(STONE_BAG_CUFT)} cu ft bags`, qty: l.buy.bags, unit: "bags", defaultPrice: l.layer.bagPrice }] : [];
      const byYd = l.layer.unit === "yd";
      return l.layer.price > 0
        ? [
            {
              priceId: `gravel-${m.id}-${byYd ? "yd" : "ton"}`,
              label: `${m.short}, bulk`,
              qty: byYd ? Math.ceil(l.q.cuydOrder * 100) / 100 : Math.ceil(l.tons * 10) / 10,
              unit: byYd ? "cu yd" : "tons",
              defaultPrice: l.layer.price,
            },
          ]
        : [];
    }),
    ...(deliveryLoads && v.del > 0 ? [{ priceId: "landscape-delivery", label: "Delivery", qty: deliveryLoads, unit: deliveryLoads === 1 ? "load" : "loads", defaultPrice: v.del }] : []),
  ];

  return (
    <CalcFrame
      dock={{ label: "Order", value: `${hero.value} ${hero.unit}` }}
      inputs={
        <>
          <FieldSection title="What's it for?">
            <Segmented label="Project" columns={3} value={v.use} options={GRAVEL_USES.map((u) => ({ value: u.id, label: u.label }))} onChange={(id) => set(projectPatch(id))} help={use?.note} />
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
          </FieldSection>

          <FieldSection title={twoLayers ? "Top layer" : "Material & depth"}>
            <LayerFields n={1} v={v} set={set} isVol={isVol} />
          </FieldSection>

          {!isVol && v.layers >= 2 ? (
            <FieldSection
              title="Base layer (underneath)"
              aside={
                <button type="button" onClick={() => set({ layers: 1 })} className="rounded-full px-2 py-0.5 text-[0.76rem] font-semibold text-ink-3 hover:text-bad">
                  Remove
                </button>
              }
            >
              <LayerFields n={2} v={v} set={set} isVol={false} />
            </FieldSection>
          ) : !isVol ? (
            <button
              type="button"
              onClick={() => set({ layers: 2 })}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong text-[0.86rem] font-semibold text-ink-2 transition hover:border-accent hover:text-accent active:scale-[0.99]"
            >
              + Add a base layer <span className="font-normal text-ink-3">(driveways, paths)</span>
            </button>
          ) : null}

          <Segmented label="How you'll buy it" columns={4} value={v.buy} options={BUY_OPTIONS} onChange={(buy) => set({ buy })} help="“Cheapest” compares bulk delivered with 0.5 cu ft bags at the prices below." />

          <MoreOptions title="Weight factor, compaction, extra & count">
            {rows.map((l) => {
              const m = aggregate(l.layer.material);
              const lv = layerValues(v, l.n);
              return (
                <div key={l.n} className="space-y-4">
                  <NumberField
                    label={`Loose weight — ${m.short}`}
                    value={lv.den}
                    onChange={(den) => set(layerPatch(l.n, { den }))}
                    suffix="t / cu yd"
                    step={0.05}
                    min={0.5}
                    max={3}
                    decimals={2}
                    help={`Published range ${fmt(m.range[0])}–${fmt(m.range[1])}: ${m.densityNote}. Use your yard's number if it gives one.`}
                  />
                  {m.compaction && lv.c && !isVol ? (
                    <NumberField
                      label={`Compaction factor — ${m.short}`}
                      value={lv.cf}
                      onChange={(cf) => set(layerPatch(l.n, { cf }))}
                      suffix="× loose"
                      step={0.05}
                      min={1}
                      max={1.6}
                      decimals={2}
                      help="Loose volume needed per compacted volume. Penn State: 8 in loose → 6 in compacted (1.33). Roseville allows up to 15% for fines."
                    />
                  ) : null}
                </div>
              );
            })}
            {!isVol ? (
              <>
                <NumberField label="Extra for waste & uneven ground" value={v.extra} onChange={(extra) => set({ extra })} suffix="%" step={5} min={0} max={50} decimals={0} help="Roseville Rock Supply and Stone Center both add 10%." />
                <NumberField label="How many identical areas?" value={v.count} onChange={(count) => set({ count: Math.max(1, Math.round(count)) })} step={1} min={1} max={500} decimals={0} />
              </>
            ) : null}
          </MoreOptions>
        </>
      }
      results={
        <>
          <ResultHero
            label="Order"
            value={hero.value}
            unit={twoLayers ? hero.unit : `${hero.unit} of ${m1.short}`}
            sub={
              twoLayers ? (
                <>
                  {rows.map((l) => describe(l)).join(" + ")} · {volumeText(r.totalCuyd, metric)} loose
                </>
              ) : (
                <>
                  {volumeText(main.q.cuydOrder, metric)} loose · {tonsText(main.tons, metric)} · {fmtInt(main.buy.bags)} × {fmt(STONE_BAG_CUFT)} cu ft bags
                  {isVol ? "" : ` · incl. ${fmt(v.extra, 0)}% extra${main.factor > 1 ? ` and ${fmt(main.factor)}× for compaction` : ""}`}
                </>
              )
            }
          />

          {isVol ? null : (
            <div className="flex justify-center rounded-[18px] border border-line bg-surface-2 px-3 py-4">
              {showSection ? (
                <LayersDiagram layers={diagramLayers} caption={`Cross-section: ${diagramLayers.map((l) => `${fmt(l.depthIn)} in ${l.label}`).join(" over ")}`} />
              ) : v.shape === "circle" ? (
                <CircleDiagram diameter={v.l1} label="Gravel area" />
              ) : (
                <IsoBlock length={v.l1} width={v.w1} depthIn={main.layer.depthIn} label="Gravel area" />
              )}
            </div>
          )}

          <StatGrid
            stats={
              isVol
                ? [
                    { label: "Volume", value: volumeText(main.q.cuydOrder, metric), hint: "loose" },
                    { label: "Weight", value: tonsText(main.tons, metric), hint: `${fmt(main.layer.tonsPerYd)} t per cu yd` },
                    { label: "Covers at 2 in", value: areaText(main.q.cuydOrder * coveragePerCuyd(2), metric) },
                    { label: "Covers at 4 in", value: areaText(main.q.cuydOrder * coveragePerCuyd(4), metric) },
                  ]
                : [
                    { label: twoLayers ? "Loose volume, all layers" : "Loose volume to order", value: volumeText(r.totalCuyd, metric), hint: `${volumeText(rows.reduce((s, l) => s + l.q.cuydFinished, 0), metric)} in place` },
                    {
                      label: "Weight range",
                      value: `${fmt(tonsValue(rows.reduce((s, l) => s + l.tonsLow, 0), metric), 1)}–${fmt(tonsValue(rows.reduce((s, l) => s + l.tonsHigh, 0), metric), 1)}`,
                      unit: metric ? "t" : "tons",
                      hint: "same volume across published quarry factors",
                    },
                    { label: "Area", value: areaText(r.areaSqFt, metric) },
                    { label: `1 ton of ${m1.short} covers`, value: areaText(main.coveragePerTonSqFt, metric), hint: `at ${fmt(main.layer.depthIn)} in${main.factor > 1 ? " compacted" : ""}` },
                  ]
            }
          />

          {twoLayers ? (
            <>
              <ResultsHeading>Layer by layer</ResultsHeading>
              <OptionTable
                caption="Gravel needed for each layer"
                columns={["Layer", "Depth", "Order", "Weight", "Bags"]}
                rows={rows.map((l) => [
                  aggregate(l.layer.material).short,
                  `${fmt(l.layer.depthIn)} in${l.factor > 1 ? "*" : ""}`,
                  volumeText(l.q.cuydOrder, metric),
                  tonsText(l.tons, metric),
                  fmtInt(l.buy.bags),
                ])}
              />
              {rows.some((l) => l.factor > 1) ? <p className="-mt-2 text-[0.76rem] text-ink-3">* finished depth after compaction</p> : null}
            </>
          ) : null}

          {rows
            .filter((l) => l.factor > 1 && !isVol)
            .map((l) => (
              <Callout key={`cf-${l.n}`} tone="info" title={`Order loose, finish compacted`}>
                Spread about {fmt(l.looseDepthIn, 1)} in of {aggregate(l.layer.material).short} and compact it in {fmtInt(l.lifts)} lift{l.lifts === 1 ? "" : "s"} of no more than 3 in to
                finish at {fmt(l.layer.depthIn)} in. That is why the order is {fmt(l.factor)}× the finished volume — bag labels and most calculators skip this and leave you short.
              </Callout>
            ))}

          <Callout tone="tip" title="Weight factors vary by quarry">
            {rows.map((l) => {
              const m = aggregate(l.layer.material);
              return (
                <span key={`d-${l.n}`} className="block">
                  {m.name}: {fmt(l.layer.tonsPerYd)} t per loose cu yd (published {fmt(m.range[0])}–{fmt(m.range[1])}).
                </span>
              );
            })}
            Your yard&apos;s scale ticket is the final word — enter its factor under “Weight factor”.
          </Callout>

          {rows.map((l) => (
            <BuyRow key={`buy-${l.n}`} l={l} v={v} set={set} metric={metric} titled={twoLayers} />
          ))}

          <HaulCard
            tons={r.totalTons}
            weightLb={r.totalWeightLb}
            truck={{ truck: rows.some((l) => l.truck.truck === "tandem") ? "tandem" : "single-axle", loads: rows.reduce((s, l) => s + l.truck.loads, 0) }}
            trips={pickupTrips(r.totalWeightLb, v.payload)}
            payloadLb={v.payload}
            metric={metric}
            onPayload={(payload) => set({ payload })}
          />

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {v.use === "play" && !isVol && main.layer.depthIn < 9 ? (
            <Callout tone="warn">CPSC: never less than 9 in of pea gravel under play equipment. Start with 12 in — loose fill compresses at least 25%.</Callout>
          ) : null}
          {v.use === "play" ? (
            <Callout tone="tip" title="Fall height">
              9 in of pea gravel protects falls up to 5 ft (CPSC). For taller equipment, wood chips (10 ft) or shredded rubber (10 ft at 6 in) protect more — see the{" "}
              <Link href="/landscaping/mulch-calculator" className="font-semibold text-accent">
                playground mulch mode
              </Link>
              .
            </Callout>
          ) : null}
          {v.use === "pad" ? (
            <Callout tone="tip" title="Make the base bigger than the slab">
              Extend the base at least 6 in past every edge (Quikrete) — add 1 ft to each dimension above. Pouring concrete on it? The{" "}
              <Link href="/concrete/slab-calculator" className="font-semibold text-accent">
                slab calculator
              </Link>{" "}
              covers bags and ready-mix.
            </Callout>
          ) : null}
          {v.use === "drive" || v.use === "refresh" ? (
            <Callout tone="tip" title="Crown it">
              Shape the surface with a crown or cross-slope of 1/2–3/4 in per foot so water runs off instead of soaking the base (Penn State Center for Dirt &amp; Gravel Roads).
            </Callout>
          ) : null}
          {v.use === "path" ? (
            <Callout tone="tip" title="Laying pavers instead?">
              Pavers need a deeper compacted base plus 1 in of bedding sand — the{" "}
              <Link href="/landscaping/paver-base-calculator" className="font-semibold text-accent">
                paver base calculator
              </Link>{" "}
              works out both.
            </Callout>
          ) : null}

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Bulk prices are typical 2026 yard and national-guide prices (American Rock Supply, Mulch Pros, Roseville Rock Supply); bag prices are retail snapshots. Tap any price to use your yard's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Gravel",
            title,
            summary: rows.map((l) => describe(l)).join(" + "),
            items,
          })}
        />
      }
    />
  );
}

function LayerFields({ n, v, set, isVol }: { n: 1 | 2; v: GravelValues; set: (p: Partial<GravelValues>) => void; isVol: boolean }) {
  const lv = layerValues(v, n);
  const m = aggregate(lv.m);
  return (
    <>
      <SelectField
        label="Material"
        value={m.id as string}
        onChange={(id) => set(materialPatch(n, id))}
        options={AGGREGATES.map((a) => ({ value: a.id as string, label: a.name }))}
        help={
          <>
            {m.bestFor} <span className="text-ink-3">Also sold as: {m.aka}.</span>
          </>
        }
      />
      {isVol ? null : (
        <>
          <DepthFields
            label={m.compaction && lv.c ? "Finished (compacted) depth" : "Depth"}
            value={lv.d}
            options={GRAVEL_DEPTHS}
            onChange={(d) => set(layerPatch(n, { d }))}
          />
          {m.compaction ? (
            <ToggleField
              label="Compacted layer"
              checked={lv.c}
              onChange={(c) => set(layerPatch(n, { c }))}
              help={lv.c ? `Depth is after tamping; the order includes ${fmt(lv.cf)}× loose volume.` : "Off: spread loose, e.g. a decorative or top-dressing layer."}
            />
          ) : null}
        </>
      )}
    </>
  );
}

function BuyRow({ l, v, set, metric, titled }: { l: Row; v: GravelValues; set: (p: Partial<GravelValues>) => void; metric: boolean; titled: boolean }) {
  const m = aggregate(l.layer.material);
  const lv = layerValues(v, l.n);
  const byYd = lv.u === "yd";
  const bulkAmount = byYd ? volumeText(l.q.cuydOrder, metric) : tonsText(l.tons, metric);
  const ratio = l.buy.bagPerYd != null && l.bulkPerYd > 0 ? l.buy.bagPerYd / l.bulkPerYd : undefined;
  const chosen = costOf(l.choice, l.buy);
  return (
    <BuyCompare
      heading={titled ? `${m.short[0].toUpperCase()}${m.short.slice(1)}: bulk or bags?` : "Bulk or bags?"}
      bagsTitle={`${fmtInt(l.buy.bags)} × ${fmt(STONE_BAG_CUFT)} cu ft bags`}
      bagCost={l.buy.bagCost}
      bulkTitle={`${bulkAmount} delivered`}
      bulkCost={l.buy.bulkDelivered}
      bulkNote={`incl. ${Math.max(1, l.truck.loads)} delivery fee${l.truck.loads > 1 ? "s" : ""}`}
      cheaper={l.buy.cheaper}
      editor={
        <>
          <NumberField label={`Bulk price per ${byYd ? "cu yd" : "ton"}`} value={lv.p} onChange={(p) => set(layerPatch(l.n, { p }))} prefix="$" step={1} decimals={2} stepper={false} />
          <Segmented
            label="Yard sells by"
            value={lv.u}
            options={[
              { value: "ton", label: "Ton" },
              { value: "yd", label: "Cu yd" },
            ]}
            onChange={(u) => set(layerPatch(l.n, { u, p: convertPrice(lv.p, lv.u, u, lv.den) }))}
          />
          <NumberField label="Delivery fee per load" value={v.del} onChange={(del) => set({ del })} prefix="$" step={5} decimals={0} stepper={false} />
          <NumberField label="Price per 0.5 cu ft bag" value={lv.bp} onChange={(bp) => set(layerPatch(l.n, { bp }))} prefix="$" step={0.25} decimals={2} stepper={false} hint={lv.bp ? undefined : "not bagged"} />
          <p className="col-span-2 text-[0.76rem] leading-snug text-ink-3">{m.priceNote}. Ask the yard: price per ton or yard, delivery fee and minimum, and whether the truck can dump where you need it.</p>
        </>
      }
    >
      {l.buy.breakEvenYd != null
        ? `At these prices bulk is cheaper from about ${tonsText(l.buy.breakEvenYd * l.layer.tonsPerYd, metric)} (${fmtInt(Math.ceil((l.buy.breakEvenYd * 27) / STONE_BAG_CUFT))} bags). `
        : l.buy.bagCost != null && l.buy.bulkDelivered != null
          ? "Bags stay cheaper at these prices. "
          : ""}
      {ratio != null && ratio > 1 ? `Bagged ${m.short} costs ${fmt(ratio, 1)}× the bulk price per yard here; bags make sense for small patches or where a truck can't reach. ` : ""}
      {chosen != null ? `Your plan (${l.choice === "pickup" ? "haul it yourself" : l.choice === "bags" ? "bags" : "delivered"}): ${fmtMoney(chosen)}.` : ""}
    </BuyCompare>
  );
}
