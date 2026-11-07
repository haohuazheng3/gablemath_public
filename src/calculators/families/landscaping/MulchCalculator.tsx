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
import { bagPriceFor, buyMode, computeMulch, costOf, coveragePerCuyd, resolveBuy } from "./compute";
import { MULCH_DEPTHS, MULCH_REPLACE_YEARS, PLAY_INITIAL_IN, PLAY_MAINTAIN_IN, PLAY_SURFACES, PLAY_USE_ZONE_FT, TREE_RING, mulchType } from "./data";
import { LayersDiagram, RingDiagram } from "./diagrams";
import { BUY_OPTIONS, areaText, bagSizeLabel, cuftText, volumeText, volumeValue, weightText } from "./display";
import { MODE_MATERIALS, MULCH_DEFAULTS, bagPatch, materialPatch, modePatch, mulchInputFrom, mulchMode, type MulchValues } from "./mulch-model";
import { AreaFields, BuyCompare, DepthFields, MoreOptions } from "./parts";

const CALC_KEY = "landscaping/mulch-calculator";

const MODES = [
  { value: "bed", label: "Beds" },
  { value: "ring", label: "Tree rings" },
  { value: "topup", label: "Top up" },
  { value: "play", label: "Playground" },
];

const MODE_HELP: Record<string, string> = {
  bed: "New beds or bare soil.",
  ring: "Flat rings around trees: 2–3 in deep, kept 3 in back from the bark (City of Rockville).",
  topup: "Measure what's left with a ruler and add only the difference.",
  play: "CPSC: loose fill over the equipment footprint plus 6 ft on every side.",
};

/** CPSC Table 2 row for each playground material offered. */
const PLAY_ROW: Record<string, string> = { playground: "chips", hardwood: "mulch", rubber: "rubber" };

export default function MulchCalculator({ initial }: { initial?: Partial<MulchValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, MULCH_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const mode = mulchMode(v.mode);
  const t = mulchType(v.mat);
  const r = useMemo(() => computeMulch(mulchInputFrom(v)), [v]);
  const choice = resolveBuy(buyMode(v.buy), r.buy);
  const isStraw = t.id === "pinestraw";
  const bagged = t.bagSizes.length > 0;
  const showYards = mode === "play" || !bagged;
  const sizeLabel = bagSizeLabel(v.bag);
  const bagEstimate = bagPriceFor(t.bagPrice, v.bag).estimated;
  const playRow = PLAY_SURFACES.find((p) => p.id === PLAY_ROW[t.id]);

  const hero = isStraw
    ? { value: fmtInt(r.bales), unit: r.bales === 1 ? "bale of pine straw" : "bales of pine straw" }
    : showYards
      ? { value: fmt(volumeValue(r.q.cuydOrder, metric), 1), unit: `${metric ? "m³" : "cu yd"} of ${t.short}` }
      : { value: fmtInt(r.bags), unit: `× ${sizeLabel} bags` };

  const where = mode === "play" ? `${formatFeetInches(v.l1)} × ${formatFeetInches(v.w1)} play set` : areaLabel(v, formatFeetInches);
  const title = `${t.short[0].toUpperCase()}${t.short.slice(1)} for ${where}${mode === "topup" ? " (top-up)" : ""}`;
  const depthNow = r.addDepthIn;

  const items: ShoppingItem[] = isStraw
    ? [{ id: "straw", name: "Pine straw bales", qty: r.bales, unit: "bales", note: "about 40 sq ft each, laid 6–8 in loose" }]
    : [
        choice === "bags" && bagged
          ? { id: "bags", name: `${t.name}, ${sizeLabel} bags`, qty: r.bags, unit: "bags", cost: r.buy.bagCost }
          : {
              id: "bulk",
              name: `${t.name}, bulk`,
              qty: Math.ceil(r.q.cuydOrder * 10) / 10,
              unit: "cu yd",
              cost: r.buy.bulkMaterial,
              note: "round up to your yard's smallest scoop",
            },
        ...(choice === "delivered" && r.buy.bulkMaterial != null ? [{ id: "delivery", name: "Delivery", qty: 1, unit: "load", cost: v.del }] : []),
        ...(mode === "bed" && r.perimeterFt > 0 ? [{ id: "edging", name: "Bed edging (optional)", qty: Math.ceil(r.perimeterFt), unit: "ft", note: "a clean edge keeps mulch out of the lawn" }] : []),
      ];

  const costLines: CostLine[] = isStraw
    ? []
    : choice === "bags" && bagged
      ? v.bp > 0
        ? [{ priceId: `mulch-${t.id}-${v.bag}`, label: `${t.short}, ${sizeLabel} bags`, qty: r.bags, unit: "bags", defaultPrice: v.bp, note: bagEstimate ? "estimated from the price per cu ft of another bag size" : undefined }]
        : []
      : [
          ...(v.bulk > 0 ? [{ priceId: `mulch-${t.id}-yd`, label: `${t.short}, bulk`, qty: Math.ceil(r.q.cuydOrder * 10) / 10, unit: "cu yd", defaultPrice: v.bulk }] : []),
          ...(choice === "delivered" && v.del > 0 ? [{ priceId: "landscape-delivery", label: "Delivery", qty: 1, unit: "load", defaultPrice: v.del }] : []),
        ];

  const breakEvenSqFt = r.buy.breakEvenYd != null && depthNow > 0 ? r.buy.breakEvenYd * coveragePerCuyd(depthNow) : undefined;

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${hero.value} ${hero.unit}` }}
      inputs={
        <>
          <FieldSection title="What are you mulching?">
            <Segmented label="Job" columns={4} value={mode} options={MODES} onChange={(m) => set(modePatch(mulchMode(m), v))} help={MODE_HELP[mode]} />
          </FieldSection>

          <FieldSection title={mode === "play" ? "Play equipment footprint" : "Size"}>
            {mode === "ring" ? (
              <>
                <AreaFields v={v} set={set} shapes={[{ value: "ring", label: "Ring" }]} />
                <NumberField label="How many trees?" value={v.count} onChange={(count) => set({ count: Math.max(1, Math.round(count)) })} step={1} min={1} max={500} decimals={0} help={`MSU Extension: mulch ${TREE_RING.minRadiusFt}–${TREE_RING.maxRadiusFt} ft out from the trunk, so a ${TREE_RING.minRadiusFt * 2}–${TREE_RING.maxRadiusFt * 2} ft ring.`} />
              </>
            ) : mode === "play" ? (
              <>
                <AreaFields v={v} set={set} shapes={[{ value: "rect", label: "Rectangle" }]} lengthLabel="Equipment length" widthLabel="Equipment width" />
                <p className="text-[0.78rem] leading-snug text-ink-3">
                  We add the {PLAY_USE_ZONE_FT} ft use zone on every side: {formatFeetInches(v.l1 + 2 * PLAY_USE_ZONE_FT)} × {formatFeetInches(v.w1 + 2 * PLAY_USE_ZONE_FT)} of surfacing.
                </p>
              </>
            ) : (
              <AreaFields
                v={v}
                set={set}
                shapes={[
                  { value: "rect", label: "Rectangle" },
                  { value: "circle", label: "Round" },
                  { value: "sqft", label: "Sq ft" },
                ]}
              />
            )}
          </FieldSection>

          <FieldSection title="Mulch & depth">
            <SelectField
              label="Mulch"
              value={t.id as string}
              onChange={(id) => set(materialPatch(id, mode))}
              options={MODE_MATERIALS[mode].map((id) => ({ value: id as string, label: mulchType(id).name }))}
              help={t.note}
            />
            {isStraw ? null : mode === "topup" ? (
              <>
                <NumberField label="Mulch there now" value={v.ex} onChange={(ex) => set({ ex })} suffix="in" step={0.5} min={0} max={12} decimals={2} help="Push a ruler down to the soil in a few spots and average." />
                <DepthFields label="Target depth" value={v.d} options={MULCH_DEPTHS} onChange={(d) => set({ d })} exactLabel="Exact target" />
              </>
            ) : mode === "play" ? (
              <DepthFields
                label="Initial fill depth"
                value={v.d}
                options={[
                  { value: 6, label: "6 in", sub: "rubber" },
                  { value: PLAY_MAINTAIN_IN, label: `${PLAY_MAINTAIN_IN} in`, sub: "minimum" },
                  { value: PLAY_INITIAL_IN, label: `${PLAY_INITIAL_IN} in`, sub: "start here" },
                ]}
                onChange={(d) => set({ d })}
                help={t.id === "rubber" ? "CPSC: 6 in of shredded rubber." : "CPSC: start at 12 in; loose fill compresses at least 25%, and must never drop below 9 in."}
              />
            ) : (
              <DepthFields label="Depth" value={v.d} options={MULCH_DEPTHS} onChange={(d) => set({ d })} help={`MSU Extension: ${t.depth[0]}–${t.depth[1]} in for ${t.short}.`} />
            )}
            {t.bagSizes.length > 1 ? (
              <Segmented
                label="Bag size"
                columns={t.bagSizes.length}
                value={v.bag}
                options={t.bagSizes.map((s) => {
                  const p = bagPriceFor(t.bagPrice, s);
                  return { value: s, label: bagSizeLabel(s), sub: p.price != null ? `${p.estimated ? "≈ " : ""}${fmtMoney(p.price)}` : undefined };
                })}
                onChange={(bag) => set(bagPatch(t.id, bag))}
                help="Check the label: the same brand comes in 1.5 and 2 cu ft bags."
              />
            ) : null}
          </FieldSection>

          {isStraw ? null : <Segmented label="How you'll buy it" columns={4} value={v.buy} options={BUY_OPTIONS} onChange={(buy) => set({ buy })} />}

          <MoreOptions title="Extra, identical beds & delivery">
            <NumberField label="Extra for settling & uneven beds" value={v.extra} onChange={(extra) => set({ extra })} suffix="%" step={5} min={0} max={50} decimals={0} help="Bag labels assume a flat bed. Roseville Rock Supply suggests 5–10% extra for settling." />
            {mode === "bed" || mode === "topup" ? (
              <NumberField label="How many identical beds?" value={v.count} onChange={(count) => set({ count: Math.max(1, Math.round(count)) })} step={1} min={1} max={500} decimals={0} />
            ) : null}
            <NumberField label="Delivery fee" value={v.del} onChange={(del) => set({ del })} prefix="$" step={5} decimals={0} stepper={false} help="LawnStarter (Oct 2026): $70–$140; some yards deliver free above a few yards." />
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
              isStraw ? (
                <>{areaText(r.areaSqFt, metric)} · one bale covers about 40 sq ft (Mulch Pros)</>
              ) : (
                <>
                  {volumeText(r.q.cuydOrder, metric)} ({cuftText(r.q.cuftOrder, metric)}) · {areaText(r.areaSqFt, metric)} at {fmt(depthNow, 2)} in
                  {showYards && bagged ? ` · ${fmtInt(r.bags)} × ${sizeLabel} bags` : ""}
                  {!showYards && r.buy.bulkMaterial != null ? ` · or ${fmt(r.q.cuydOrder, 2)} cu yd bulk` : ""}
                  {v.extra > 0 ? ` · incl. ${fmt(v.extra, 0)}% extra` : ""}
                </>
              )
            }
          />

          <div className="flex justify-center rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            {mode === "ring" ? (
              <RingDiagram ringFt={v.l1} trunkIn={v.tr} gapIn={TREE_RING.gapIn} />
            ) : mode === "topup" ? (
              <LayersDiagram
                layers={[
                  { label: "New mulch", depthIn: depthNow, kind: "mulch" },
                  { label: "Mulch there now", depthIn: v.ex, kind: "soil" },
                ]}
                caption={`Top-up: ${fmt(depthNow)} in of new mulch over ${fmt(v.ex)} in already there`}
              />
            ) : mode === "play" ? (
              <IsoBlock length={v.l1 + 2 * PLAY_USE_ZONE_FT} width={v.w1 + 2 * PLAY_USE_ZONE_FT} depthIn={v.d} label="Playground surfacing" />
            ) : v.shape === "circle" ? (
              <CircleDiagram diameter={v.l1} label="Mulch bed" />
            ) : v.shape === "rect" ? (
              <IsoBlock length={v.l1} width={v.w1} depthIn={v.d} label="Mulch bed" />
            ) : (
              <LayersDiagram layers={[{ label: t.short, depthIn: depthNow, kind: "mulch" }]} caption={`${fmt(depthNow)} in of ${t.short}`} />
            )}
          </div>

          <StatGrid
            stats={isStraw ? [
              { label: "Area", value: areaText(r.areaSqFt, metric) },
              { label: "Bales", value: fmtInt(r.bales), hint: v.extra > 0 ? `incl. ${fmt(v.extra, 0)}% extra` : "no extra added" },
            ] : [
              { label: "Cubic yards", value: fmt(volumeValue(r.q.cuydOrder, metric), 2), unit: metric ? "m³" : "cu yd", hint: `${fmt(r.q.cuftOrder, 1)} cu ft` },
              { label: mode === "play" ? "Area incl. use zone" : "Area", value: areaText(r.areaSqFt, metric) },
              bagged && !isStraw
                ? { label: `One ${sizeLabel} bag covers`, value: fmt(r.coveragePerBagSqFt, 1), unit: "sq ft", hint: `at ${fmt(depthNow, 2)} in` }
                : { label: "One cubic yard covers", value: fmtInt(r.coveragePerYdSqFt), unit: "sq ft", hint: `at ${fmt(depthNow, 2)} in` },
              r.weightLb != null
                ? { label: "Weight, roughly", value: weightText(r.weightLb, metric), hint: "wood mulch 400–800 lb/yd³, more when wet" }
                : { label: "Bags per cubic yard", value: bagged ? fmt(27 / v.bag, 1) : "—", hint: bagged ? `${sizeLabel} bags` : "bulk only" },
            ]}
          />

          {t.bagSizes.length > 1 && !isStraw ? (
            <>
              <ResultsHeading>Every bag size</ResultsHeading>
              <OptionTable
                caption="Bags needed by bag size"
                columns={["Bag", "Bags", "Est. cost"]}
                highlight={r.bagsBySize.findIndex((b) => b.size === v.bag)}
                rows={r.bagsBySize.map((b) => {
                  const p = bagPriceFor(t.bagPrice, b.size);
                  return [bagSizeLabel(b.size), fmtInt(b.bags), p.price != null ? `${p.estimated ? "≈ " : ""}${fmtMoney(b.bags * p.price)}` : "—"];
                })}
              />
            </>
          ) : null}

          {isStraw ? null : (
            <BuyCompare
              heading="Bags or bulk?"
              bagsTitle={bagged ? `${fmtInt(r.bags)} × ${sizeLabel} bags` : "Bags"}
              bagCost={r.buy.bagCost}
              bulkTitle={`${fmt(r.q.cuydOrder, 2)} cu yd delivered`}
              bulkCost={r.buy.bulkDelivered}
              bulkNote={r.buy.bulkDelivered != null ? `incl. $${fmt(v.del, 0)} delivery` : "no bulk price — add one"}
              cheaper={r.buy.cheaper}
              editor={
                <>
                  {bagged ? <NumberField label={`Price per ${sizeLabel} bag`} value={v.bp} onChange={(bp) => set({ bp })} prefix="$" step={0.25} decimals={2} stepper={false} /> : null}
                  <NumberField label="Bulk price per cu yd" value={v.bulk} onChange={(bulk) => set({ bulk })} prefix="$" step={1} decimals={2} stepper={false} />
                  <NumberField label="Delivery fee" value={v.del} onChange={(del) => set({ del })} prefix="$" step={5} decimals={0} stepper={false} />
                  <p className="col-span-2 text-[0.76rem] leading-snug text-ink-3">
                    Defaults: Mulch Pros (GA) price list, Oct 22, 2026. LawnStarter puts bulk mulch at $30–$135 per yard nationally. Big-box pallet prices include delivery, so they cost more per bag than the shelf.
                  </p>
                </>
              }
            >
              {r.buy.breakEvenYd != null
                ? `Bulk becomes cheaper from about ${fmt(r.buy.breakEvenYd, 1)} cu yd (${fmtInt(Math.ceil((r.buy.breakEvenYd * 27) / v.bag))} bags)${breakEvenSqFt ? ` — roughly ${fmtInt(breakEvenSqFt)} sq ft at ${fmt(depthNow, 2)} in` : ""}. `
                : r.buy.bagCost != null && r.buy.bulkDelivered != null
                  ? "Bags stay cheaper at these prices. "
                  : ""}
              {r.buy.bagPerYd != null ? `Bags work out to ${fmtMoney(r.buy.bagPerYd)} per cubic yard. ` : ""}
              {costOf(choice, r.buy) != null ? `Your plan (${choice === "bags" ? "bags" : choice === "pickup" ? "pick up bulk" : "bulk delivered"}): ${fmtMoney(costOf(choice, r.buy)!)}.` : ""}
            </BuyCompare>
          )}

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}

          {mode === "ring" ? (
            <Callout tone="tip" title="No mulch volcanoes">
              Spread it flat, {TREE_RING.gapIn} in back from the bark and no deeper than 2–3 in (City of Rockville, 2026). Mulch piled against the trunk keeps bark wet and invites rot and pests.
            </Callout>
          ) : null}
          {mode === "topup" ? (
            <Callout tone="info" title="Refresh or replace?">
              Organic mulch breaks down every year, so a 1 in top-up usually restores the look. MSU Extension advises raking off the old layer and starting fresh after about {MULCH_REPLACE_YEARS} years.
            </Callout>
          ) : null}
          {mode === "play" ? (
            <>
              <ResultsHeading>How high a fall each surface protects (CPSC)</ResultsHeading>
              <OptionTable
                caption="CPSC Table 2: depth of loose fill and protected fall height"
                columns={["Surface", "Depth", "Protects falls to"]}
                highlight={PLAY_SURFACES.findIndex((p) => p.id === playRow?.id)}
                rows={PLAY_SURFACES.map((p) => [p.label, `${p.depthIn} in`, `${p.protectsFt} ft`])}
              />
              <Callout tone="tip" title="Swings need a longer zone">
                For to-and-fro swings, CPSC extends surfacing in front of and behind the swing to twice the height of the top bar; for tire swings, a circle of chain length plus 6 ft. Add those areas as extra length here.
              </Callout>
              <p className="text-[0.78rem] leading-snug text-ink-3">
                Pea gravel or sand instead? Use the <Link href="/landscaping/gravel-calculator" className="font-semibold text-accent">gravel</Link> or{" "}
                <Link href="/landscaping/sand-calculator" className="font-semibold text-accent">
                  sand
                </Link>{" "}
                calculator — CPSC rates 9 in of either for lower falls (5 ft and 4 ft).
              </p>
            </>
          ) : null}

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Bag and bulk prices from the Mulch Pros (GA) list of Oct 22, 2026 and retail snapshots. Tap any price to use your store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Mulch",
            title,
            summary: isStraw ? `${fmtInt(r.bales)} bales of pine straw` : `${fmtInt(r.bags)} × ${sizeLabel} bags or ${fmt(r.q.cuydOrder, 2)} cu yd at ${fmt(depthNow, 2)} in`,
            items,
          })}
        />
      }
    />
  );
}
