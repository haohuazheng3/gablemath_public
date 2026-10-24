"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { FieldSection, LengthField, NumberField, Segmented, SelectField, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney, plural } from "@/lib/format";
import { FT_PER_M, LB_PER_KG, SQFT_PER_SQM, formatFeetInches } from "@/lib/units";
import { bundlesFor, computeRoof, hipFactor, pitchFactor } from "./compute";
import {
  CAP_NAILS,
  DUMPSTER_COST,
  ICE_WATER_ROLLS,
  INSTALL_EXTRAS,
  INSTALLED_PER_SQUARE,
  NAILS,
  PITCH,
  PITCH_OPTIONS,
  SHINGLES,
  UNDERLAYMENTS,
  VENTILATION,
  iceWaterRoll,
  shingle,
  underlayment,
} from "./data";
import { EdgeSwatch, RoofPlan, type EdgeKey } from "./RoofDiagrams";
import { ROOFING_DEFAULTS, roofingInputFrom, type RoofingValues } from "./roofing-model";

const CALC_KEY = "roofing/roofing-calculator";

const EDGE_ROWS: { key: EdgeKey; label: string; feeds: string }[] = [
  { key: "eaves", label: "Eaves", feeds: "starter, drip edge, ice & water" },
  { key: "rakes", label: "Rakes", feeds: "drip edge, starter" },
  { key: "ridge", label: "Ridge", feeds: "ridge cap, ridge vent" },
  { key: "hips", label: "Hips", feeds: "hip & ridge cap" },
  { key: "valleys", label: "Valleys", feeds: "ice & water, extra cutting" },
];

export default function RoofingCalculator({ initial }: { initial?: Partial<RoofingValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, ROOFING_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const [more, setMore] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const r = useMemo(() => computeRoof(roofingInputFrom(v)), [v]);
  const p = r.product;
  const u = underlayment(v.under);
  const roll = iceWaterRoll(v.roll);
  const footprint = v.mode !== "area";
  const customPitch = !PITCH_OPTIONS.includes(v.pitch);
  const len = (ft: number) => (metric ? `${fmt(ft / FT_PER_M, 1)} m` : `${fmtInt(ft)} ft`);
  const areaText = (sqft: number) => (metric ? `${fmtInt(sqft / SQFT_PER_SQM)} m²` : `${fmtInt(sqft)} sq ft`);
  const squaresOrdered = r.bundles / p.bundlesPerSquare;
  const lbPerBundle = r.bundles > 0 ? r.shingleWeightLb / r.bundles : 0;
  const weight = (lb: number) =>
    metric ? (lb >= 2000 ? { value: fmt(lb / LB_PER_KG / 1000, 1), unit: "t" } : { value: fmtInt(lb / LB_PER_KG), unit: "kg" }) : lb >= 2000 ? { value: fmt(lb / 2000, 1), unit: "tons" } : { value: fmtInt(lb), unit: "lb" };
  const handNails = r.nails.pack === "hand";
  const bulkTip =
    p.bulk && r.bundles > 0 && !r.bulkApplied && p.bulk.minBundles * p.bulk.price <= r.shingles.cost
      ? { min: p.bulk.minBundles, price: p.bulk.price, bulkCost: p.bulk.minBundles * p.bulk.price }
      : undefined;

  const dims = footprint ? `${formatFeetInches(v.l)} × ${formatFeetInches(v.w)}` : `${fmtInt(v.area)} sq ft`;
  const title = `Shingles for a ${dims} ${v.style} roof, ${fmt(v.pitch, 2)}/12`;

  function switchMode(mode: string) {
    if (mode === "area" && footprint) {
      const round1 = (n: number) => Math.round(n * 10) / 10;
      set({
        mode,
        area: Math.round(r.roofAreaSqFt),
        eaves: round1(r.edges.eaves),
        rakes: round1(r.edges.rakes),
        ridge: round1(r.edges.ridge),
        hips: round1(r.edges.hips),
        valleys: round1(r.edges.valleys),
      });
    } else set({ mode });
  }

  const items: ShoppingItem[] = [
    { id: "shingles", name: `${p.name} shingles`, qty: r.bundles, unit: "bundles", cost: r.shingles.cost, note: `${fmt(p.sqftPerBundle, 1)} sq ft per bundle · ${fmt(squaresOrdered, 1)} squares${r.bulkApplied ? " · bulk price" : ""}` },
    { id: "starter", name: `${p.starter.name} (eaves${v.rakeStarter ? " + rakes" : ""})`, qty: r.starter.qty, unit: "bundles", cost: r.starter.cost, note: `${fmtInt(r.starter.lf)} ft ÷ ${fmt(p.starter.lfPerBundle, 1)} ft per bundle` },
    { id: "cap", name: `Hip & ridge cap — ${p.cap.name}`, qty: r.cap.qty, unit: "bundles", cost: r.cap.cost, note: `${fmtInt(r.cap.lf)} ft ÷ ${fmt(p.cap.lfPerBundle, 1)} ft per bundle` },
    { id: "underlayment", name: u.name, qty: r.underlayment.qty, unit: "rolls", cost: r.underlayment.cost, note: r.underlayment.double ? "Two layers (pitch under 4/12)" : `${fmtInt(r.underlayment.netSqFtPerRoll)} sq ft net per roll after laps` },
    { id: "cap-nails", name: "1-in plastic cap nails, bucket of 3,000", qty: r.capNails.qty, unit: "buckets", cost: r.capNails.cost, note: `≈ ${fmtInt(r.capNails.count)} at the IRC high-wind spacing` },
    ...(r.iceWater && r.iceWater.qty > 0
      ? [{ id: "ice-water", name: `Ice & water shield, ${roll.name}`, qty: r.iceWater.qty, unit: "rolls", cost: r.iceWater.cost, note: `${fmtInt(r.iceWater.eaveStripLf + r.iceWater.valleyLf)} ft of 36-in strip incl. 6-in end laps` }]
      : []),
    { id: "drip-edge", name: "Drip edge, 10 ft (eaves + rakes)", qty: r.dripEdge.qty, unit: "pieces", cost: r.dripEdge.cost, note: `${fmtInt(r.dripEdge.lf)} ft with 2-in laps` },
    handNails
      ? { id: "hand-nails", name: "1¼-in roofing nails, 5-lb box (≈978)", qty: r.nails.qty, unit: plural(r.nails.qty, "box", "boxes"), cost: r.nails.cost, note: `${fmtInt(r.nails.total)} nails (${r.nails.perShingle} per shingle) — or 1 coil box of 7,200 for a nail gun` }
      : { id: "coil-nails", name: "1¼-in coil roofing nails, box of 7,200", qty: r.nails.qty, unit: plural(r.nails.qty, "box", "boxes"), cost: r.nails.cost, note: `${fmtInt(r.nails.total)} nails (${r.nails.perShingle} per shingle) — or ${fmtInt(r.nails.fiveLbBoxes)} × 5-lb boxes for hand nailing` },
    ...(r.vent && r.vent.sections > 0
      ? [
          { id: "ridge-vent", name: "Ridge vent, 4-ft sections (18 sq in/ft)", qty: r.vent.sections, unit: "sections", note: `${fmtInt(r.vent.ridgeLf)} ft of ridge` },
          { id: "intake", name: "Continuous soffit vent (9 sq in/ft)", qty: Math.ceil(r.vent.soffitLf), unit: "ft", note: `or ${r.vent.undereaveVents} × 16×8 under-eave vents` },
        ]
      : []),
  ].filter((it) => it.qty > 0);

  const costLines: CostLine[] = [
    { priceId: `roof-shingle-${p.id}`, label: `${p.short} shingles`, qty: r.bundles, unit: "bundles", defaultPrice: r.shingles.unitPrice, note: r.bulkApplied && p.bulk ? `Bulk price applied (${p.bulk.minBundles}+ bundles)` : p.typicalPrice ? "Typical architectural price — no verified shelf price for this line" : undefined },
    { priceId: `roof-starter-${slug(p.starter.name)}`, label: p.starter.name, qty: r.starter.qty, unit: "bundles", defaultPrice: p.starter.price },
    { priceId: `roof-cap-${slug(p.cap.name)}`, label: `Hip & ridge: ${p.cap.name}`, qty: r.cap.qty, unit: "bundles", defaultPrice: p.cap.price },
    { priceId: `roof-underlayment-${u.id}`, label: u.name, qty: r.underlayment.qty, unit: "rolls", defaultPrice: u.price },
    { priceId: "roof-cap-nails-3000", label: "Plastic cap nails (3,000)", qty: r.capNails.qty, unit: "buckets", defaultPrice: CAP_NAILS.price },
    ...(r.iceWater ? [{ priceId: `roof-ice-water-${roll.lengthFt}`, label: `Ice & water shield (${fmt(roll.lengthFt, 1)} ft roll)`, qty: r.iceWater.qty, unit: "rolls", defaultPrice: roll.price }] : []),
    { priceId: "roof-drip-edge-10", label: "Drip edge, 10 ft", qty: r.dripEdge.qty, unit: "pieces", defaultPrice: r.dripEdge.unitPrice },
    handNails
      ? { priceId: "roof-hand-nails-5lb", label: "Roofing nails, 5-lb box", qty: r.nails.qty, unit: "boxes", defaultPrice: NAILS.handBoxPrice }
      : { priceId: "roof-coil-nails-7200", label: "Coil roofing nails (7,200)", qty: r.nails.qty, unit: "boxes", defaultPrice: NAILS.coilBoxPrice },
  ].filter((l) => l.qty > 0);

  const edgeValue = (k: EdgeKey) => r.edges[k];

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${fmtInt(r.bundles)} bundles · ${fmt(r.squares, 1)} sq` }}
      inputs={
        <>
          <FieldSection title="Your roof">
            <Segmented
              label="Measure from"
              value={footprint ? "footprint" : "area"}
              options={[
                { value: "footprint", label: "House footprint" },
                { value: "area", label: "Roof area / report" },
              ]}
              onChange={switchMode}
            />
            {footprint ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <LengthField label="Length" value={v.l} onChange={(l) => set({ l })} />
                  <LengthField label="Width" value={v.w} onChange={(w) => set({ w })} />
                </div>
                <p className="-mt-2 text-[0.78rem] leading-snug text-ink-3">
                  Outside walls of one floor — not living area. A two-story 2,000 sq ft house has about a 1,000 sq ft footprint.
                </p>
              </>
            ) : (
              <>
                <NumberField label="Roof area" value={v.area} onChange={(area) => set({ area })} suffix="sq ft" step={100} decimals={0} hint={`${fmt(v.area / 100, 1)} squares`} help="From a roof report (EagleView, HOVER, Roofr) or your own plane-by-plane measurements." />
                <div className="grid grid-cols-2 gap-3">
                  {EDGE_ROWS.map((e) => (
                    <NumberField key={e.key} label={e.label} value={v[e.key]} onChange={(n) => set({ [e.key]: n } as Partial<RoofingValues>)} suffix="ft" decimals={1} stepper={false} />
                  ))}
                </div>
              </>
            )}
            <LengthField label={footprint ? "Overhang (eaves & rakes)" : "Eave overhang"} base="in" value={v.oh} onChange={(oh) => set({ oh })} allowZero help={footprint ? "Measured level from the wall to the fascia. Leaving it out under-orders by about 10% on small houses." : "Sets how many courses of ice & water shield you need."} />
          </FieldSection>

          <FieldSection title="Shape & pitch">
            <Segmented
              label="Roof style"
              value={v.style}
              options={[
                { value: "gable", label: "Gable", sub: "2 slopes" },
                { value: "hip", label: "Hip", sub: "4 slopes" },
                { value: "complex", label: "Complex", sub: "valleys, dormers" },
              ]}
              onChange={(style) => set({ style })}
              help={v.style === "complex" && footprint ? "Estimated as a hip roof plus the valleys you enter, with 5 points of extra waste. For exact counts switch to roof area and enter edge lengths." : undefined}
            />
            {v.style === "complex" && footprint ? (
              <LengthField
                label="Valleys, total length"
                value={v.valleys}
                onChange={(valleys) => set({ valleys })}
                allowZero
                help={`Each valley ≈ the wing's half-width × ${fmt(hipFactor(v.pitch), 3)} at this pitch — a 24-ft-wide wing has two valleys of about ${fmt(12 * hipFactor(v.pitch), 1)} ft.`}
              />
            ) : null}
            <Segmented
              label="Pitch (rise per 12 in)"
              columns={4}
              value={customPitch ? -1 : v.pitch}
              options={PITCH_OPTIONS.map((x) => ({ value: x, label: `${x}/12`, sub: `×${fmt(pitchFactor(x), 3)}` }))}
              onChange={(pitch) => pitch >= 0 && set({ pitch })}
            />
            <NumberField
              label="Exact pitch"
              value={v.pitch}
              onChange={(pitch) => set({ pitch })}
              suffix="/12"
              step={0.5}
              min={0}
              max={24}
              decimals={2}
              help={
                <>
                  {fmt(r.angleDeg, 1)}° · multiplier {fmt(r.pitchFactor, 3)}. Not sure? <Link href="/roofing/roof-pitch-calculator" className="font-semibold text-accent">Measure it with a level</Link>.
                </>
              }
            />
          </FieldSection>

          <FieldSection title="Shingles">
            <SelectField
              label="Product line"
              value={v.product}
              onChange={(product) => set({ product, inst: INSTALLED_PER_SQUARE[shingle(product).type].typical })}
              options={SHINGLES.map((x) => ({ value: x.id, label: x.name, group: x.id === "custom" ? "Other" : x.type === "3-tab" ? "3-tab" : "Architectural" }))}
              help={p.note}
            />
            {p.id === "custom" ? <NumberField label="Bundles per square" value={v.bps} onChange={(bps) => set({ bps: Math.round(bps) })} step={1} min={1} max={8} decimals={0} help="Printed on the bundle wrapper." /> : null}
          </FieldSection>

          <div>
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-[0.99]"
            >
              Waste, underlayment, ice & water, nails, tear-off
              <span aria-hidden className={clsx("transition-transform duration-200", more && "rotate-180")}>
                ⌄
              </span>
            </button>
            {more ? (
              <div className="animate-rise mt-4 space-y-4">
                <NumberField
                  label="Extra for waste"
                  value={r.wastePct}
                  onChange={(waste) => set({ waste, wasteAuto: false })}
                  suffix="%"
                  step={1}
                  max={40}
                  decimals={0}
                  hint={
                    v.wasteAuto ? (
                      "auto"
                    ) : (
                      <button type="button" onClick={() => set({ wasteAuto: true })} className="font-semibold text-accent">
                        Use table ({r.autoWastePct}%)
                      </button>
                    )
                  }
                  help="Auto follows CertainTeed's table: big simple gables need 3–4%, small hip roofs up to 17%."
                />
                <ToggleField label="Starter strip on the rakes too" checked={v.rakeStarter} onChange={(rakeStarter) => set({ rakeStarter })} help="GAF, Owens Corning and Atlas enhanced wind warranties call for starter along eaves and rakes." />
                <SelectField label="Underlayment" value={v.under} onChange={(under) => set({ under })} options={UNDERLAYMENTS.map((x) => ({ value: x.id, label: x.name }))} />
                <Segmented
                  label="Ice & water shield"
                  value={v.iw}
                  options={[
                    { value: "eaves", label: "Eaves + valleys" },
                    { value: "valleys", label: "Valleys only" },
                    { value: "none", label: "None" },
                  ]}
                  onChange={(iw) => set({ iw })}
                  help="Code requires it at the eaves wherever your building department lists ice-dam risk — most of the northern US."
                />
                {v.iw !== "none" ? (
                  <div className="grid grid-cols-2 gap-3">
                    {v.iw === "eaves" ? <NumberField label="Wall thickness" value={v.wall} onChange={(wall) => set({ wall })} suffix="in" step={0.5} decimals={1} stepper={false} hint="2×6 ≈ 6" /> : null}
                    <SelectField label="Roll size" value={String(v.roll)} onChange={(x) => set({ roll: Number(x) })} options={ICE_WATER_ROLLS.map((x) => ({ value: String(x.lengthFt), label: `${fmt(x.lengthFt, 1)} ft` }))} />
                  </div>
                ) : null}
                <Segmented
                  label="Nails per shingle"
                  value={v.nails}
                  options={[
                    { value: 4, label: "4 nails", sub: "IRC minimum" },
                    { value: 6, label: "6 nails", sub: "high wind / steep" },
                  ]}
                  onChange={(nails) => set({ nails })}
                />
                <ToggleField label="Ridge vent & soffit intake" checked={v.vent} onChange={(vent) => set({ vent })} help="Sized at 1/150 of the attic floor, split evenly between ridge exhaust and soffit intake." />
                <Segmented
                  label="Old layers to tear off"
                  value={v.layers}
                  options={[
                    { value: 0, label: "None", sub: "new deck" },
                    { value: 1, label: "1 layer" },
                    { value: 2, label: "2 layers" },
                  ]}
                  onChange={(layers) => set({ layers })}
                />
                {v.layers > 0 ? (
                  <Segmented
                    label="Old roof is"
                    value={v.old}
                    options={[
                      { value: "3-tab", label: "3-tab", sub: "≈200 lb/sq" },
                      { value: "laminate", label: "Architectural", sub: "≈240 lb/sq" },
                      { value: "premium", label: "Premium", sub: "≈300 lb/sq" },
                    ]}
                    onChange={(old) => set({ old })}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      }
      results={
        <>
          <ResultHero
            label="Shingles to buy"
            value={fmtInt(r.bundles)}
            unit="bundles"
            sub={
              <>
                {fmt(r.squares, 1)} squares of roof ({areaText(r.roofAreaSqFt)}) + {fmt(r.wastePct, 0)}% waste · {p.short}, {fmt(p.sqftPerBundle, 1)} sq ft per bundle
              </>
            }
          />

          <div className="rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            {r.geometry && r.geometry.lengthFt > 0 ? (
              <div className="flex justify-center">
                <RoofPlan lengthFt={r.geometry.lengthFt} widthFt={r.geometry.widthFt} overhangFt={v.oh / 12} style={v.style === "gable" ? "gable" : "hip"} />
              </div>
            ) : null}
            <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 px-1 sm:grid-cols-2">
              {EDGE_ROWS.filter((e) => edgeValue(e.key) > 0).map((e) => (
                <li key={e.key} className="flex items-center gap-2 text-[0.8rem] text-ink-2">
                  <EdgeSwatch edge={e.key} />
                  <span className="font-semibold text-ink">{e.label}</span>
                  <span className="num">{len(edgeValue(e.key))}</span>
                  <span className="min-w-0 truncate text-ink-3">· {e.feeds}</span>
                </li>
              ))}
            </ul>
          </div>

          <StatGrid
            stats={[
              { label: "Roofing squares", value: fmt(r.squares, 1), unit: "sq", hint: "100 sq ft each, before waste", emphasis: true },
              { label: "Roof surface", value: metric ? fmtInt(r.roofAreaSqFt / SQFT_PER_SQM) : fmtInt(r.roofAreaSqFt), unit: metric ? "m²" : "sq ft", hint: `plan ${areaText(r.planAreaSqFt)} × ${fmt(r.pitchFactor, 3)}` },
              { label: "Shingle weight", ...weight(r.shingleWeightLb), hint: `≈ ${metric ? `${fmtInt(lbPerBundle / LB_PER_KG)} kg` : `${fmtInt(lbPerBundle)} lb`} a bundle — plan on delivery` },
              { label: "Waste", value: `${fmt(r.wastePct, 0)}%`, hint: v.wasteAuto ? "CertainTeed table for this size & shape" : `table suggests ${r.autoWastePct}%` },
            ]}
          />

          <ResultsHeading>What each part takes</ResultsHeading>
          <OptionTable
            caption="Accessory quantities"
            columns={["Item", "Covers", "Buy"]}
            rows={[
              ["Starter strip", len(r.starter.lf), `${fmtInt(r.starter.qty)} ${plural(r.starter.qty, "bundle")}`],
              ["Hip & ridge cap", len(r.cap.lf), `${fmtInt(r.cap.qty)} ${plural(r.cap.qty, "bundle")}`],
              ["Underlayment", `${areaText(r.roofAreaSqFt)}${r.underlayment.double ? " ×2" : ""}`, `${fmtInt(r.underlayment.qty)} ${plural(r.underlayment.qty, "roll")}`],
              ...(r.iceWater ? [["Ice & water", len(r.iceWater.eaveStripLf + r.iceWater.valleyLf), `${fmtInt(r.iceWater.qty)} ${plural(r.iceWater.qty, "roll")}`]] : []),
              ["Drip edge", len(r.dripEdge.lf), `${fmtInt(r.dripEdge.qty)} × 10 ft`],
              ["Nails", `${fmtInt(r.nails.total)} nails`, `${fmtInt(r.nails.qty)} ${handNails ? "× 5 lb" : `coil ${plural(r.nails.qty, "box", "boxes")}`}`],
              ...(r.vent ? [["Ridge vent", len(r.vent.ridgeLf), `${fmtInt(r.vent.sections)} × 4 ft`]] : []),
            ]}
          />

          {r.iceWater && v.iw === "eaves" ? (
            <Card title="How far up the ice & water shield goes">
              Code runs it from the eave edge to 24 in inside the exterior wall, measured level — counted here from the wall&apos;s inside face, as Owens Corning requires. With a {fmt(v.oh, 1)}-in overhang and {fmt(v.wall, 1)}-in wall at {fmt(v.pitch, 2)}/12 that is{" "}
              <strong className="text-ink">{fmt(r.iceWater.requiredIn, 0)} in up the slope</strong> → {r.iceWater.courses} {plural(r.iceWater.courses, "course")} of 36-in membrane
              {v.pitch >= PITCH.steep ? " (8/12 and steeper also need at least 36 in along the slope)" : ""}. Valleys get one 36-in strip centered on the valley line.
            </Card>
          ) : null}

          {r.vent ? (
            <Card title="Attic ventilation (1/150)">
              Exhaust {fmtInt(r.vent.exhaustSqIn)} sq in → <strong className="text-ink">{len(r.vent.ridgeLf)} of ridge vent</strong> at {VENTILATION.ridgeNfaPerLf} sq in per ft
              {r.vent.shortfall ? ` (you'd want ${len(r.vent.ridgeLfNeeded)})` : ""}. Intake {fmtInt(r.vent.intakeSqIn)} sq in → {len(r.vent.soffitLf)} of continuous soffit vent or {r.vent.undereaveVents} 16×8 vents. Intake should match or beat exhaust; if your attic qualifies for 1/300 (balanced vents, plus a vapor retarder in climate zones 6–8), halve these.
            </Card>
          ) : null}

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {p.checkWrapper ? (
            <Callout tone="tip" title="Check the wrapper">
              Atlas doesn&apos;t print coverage per bundle for Pinnacle Pristine; 3 bundles per square is derived from its 42 × 14 in size and 6-in exposure. Confirm on the bundle before ordering.
            </Callout>
          ) : null}
          {bulkTip ? (
            <Callout tone="tip" title="Round up to the bulk price">
              {bulkTip.min} bundles at the {fmtMoney(bulkTip.price)} bulk price cost {fmtMoney(bulkTip.bulkCost)} — less than {r.bundles} at {fmtMoney(p.price)} ({fmtMoney(r.shingles.cost)}), and the spares match your color lot.
            </Callout>
          ) : null}

          <ResultsHeading>Same roof, other shingle lines</ResultsHeading>
          <OptionTable
            caption="Bundles by product line"
            columns={["Line", "Bundles", "Est. cost"]}
            highlight={SHINGLES.filter((x) => x.id !== "custom").findIndex((x) => x.id === p.id)}
            rows={SHINGLES.filter((x) => x.id !== "custom").map((x) => {
              const n = bundlesFor(r.roofAreaSqFt, r.wastePct, x.sqftPerBundle);
              const price = x.bulk && n >= x.bulk.minBundles ? x.bulk.price : x.price;
              return [
                <>
                  {x.short}
                  <span className="block text-[0.74rem] font-normal text-ink-3">{fmt(x.sqftPerBundle, 1)} sq ft per bundle</span>
                </>,
                fmtInt(n),
                fmtMoney(n * price),
              ];
            })}
          />

          <div className="rounded-[18px] border border-line p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[0.95rem] font-semibold text-ink">Hiring a roofer?</h3>
              <button type="button" onClick={() => setCostOpen((o) => !o)} className="text-[0.78rem] font-semibold text-accent">
                {costOpen ? "Done" : "Edit prices"}
              </button>
            </div>
            <div className="num mt-2 text-[1.6rem] font-semibold tracking-[-0.02em] text-ink">{fmtMoney(r.installed.total)}</div>
            <p className="text-[0.8rem] text-ink-3">
              Typical range {fmtMoney(r.installed.low)}–{fmtMoney(r.installed.high)} · about {fmtMoney(r.squares > 0 ? r.installed.total / r.roofAreaSqFt : 0, { cents: true })} per sq ft of roof
            </p>
            <dl className="mt-3 space-y-1.5 text-[0.84rem]">
              <CostRow label={`${fmt(r.squares, 1)} squares × ${fmtMoney(v.inst)} installed (incl. 1-layer tear-off)`} value={r.installed.base} />
              {r.installed.tearoffAdjust !== 0 ? (
                <CostRow label={v.layers === 0 ? `No tear-off (−${fmtMoney(INSTALL_EXTRAS.tearoffPerSquare)}/sq)` : `Second layer (+${fmtMoney(INSTALL_EXTRAS.extraLayerPerSquare)}/sq)`} value={r.installed.tearoffAdjust} />
              ) : null}
              {r.installed.steep > 0 ? <CostRow label={`Steep roof, 8/12+ (+${fmtMoney(INSTALL_EXTRAS.steepPerSquare)}/sq)`} value={r.installed.steep} /> : null}
              <CostRow label="Permit" value={r.installed.permit} />
            </dl>
            {costOpen ? (
              <div className="animate-rise mt-4 grid grid-cols-2 gap-3">
                <NumberField label="Installed per square" value={v.inst} onChange={(inst) => set({ inst })} prefix="$" step={25} decimals={0} stepper={false} hint={`${fmtMoney(INSTALLED_PER_SQUARE[p.type].low)}–${fmtMoney(INSTALLED_PER_SQUARE[p.type].high)}`} />
                <NumberField label="Permit" value={v.permit} onChange={(permit) => set({ permit })} prefix="$" step={25} decimals={0} stepper={false} hint="$150–500" />
                <p className="col-span-2 text-[0.76rem] leading-snug text-ink-3">
                  When comparing bids, ask whether tear-off and disposal are included, how many sheets of decking are allowed for ({fmtMoney(INSTALL_EXTRAS.deckSheet)} a sheet is typical, 2–6 sheets common on older roofs), and which starter, ridge cap and underlayment they use.
                </p>
              </div>
            ) : null}
          </div>

          {r.debris ? (
            <Card title="Tear-off debris">
              {v.layers === 2 ? "Two layers" : "One layer"} of old {v.old === "laminate" ? "architectural" : v.old} shingles ≈ <strong className="text-ink">{fmt(r.debris.tons, 1)} tons</strong> and {fmt(r.debris.cubicYards, 1)} cu yd.
              {r.debris.dumpster
                ? ` Book ${r.debris.dumpster.count > 1 ? `${r.debris.dumpster.count} × ` : "a "}${r.debris.dumpster.yd}-yard dumpster (about ${fmt(r.debris.dumpster.tonsIncluded, 1)} tons included${r.debris.dumpster.overTons > 0 ? `; expect ~${fmt(r.debris.dumpster.overTons, 1)} tons over, roughly ${fmtMoney(r.debris.dumpster.overageCost)} at $${DUMPSTER_COST.overagePerTon}/ton` : ""}).`
                : ""}{" "}
              Rentals run {fmtMoney(DUMPSTER_COST.low)}–{fmtMoney(DUMPSTER_COST.high)}; shingles hit the weight limit long before the bin is full.
            </Card>
          ) : null}

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Shelf prices from McCoy's (San Marcos, TX) checked Oct 23, 2026; GAF Timberline HDZ, IKO and Atlas shingles use a typical architectural price. Tap any price to use your supplier's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Shingle roof",
            title,
            summary: `${fmtInt(r.bundles)} bundles (${fmt(r.squares, 1)} squares + ${fmt(r.wastePct, 0)}% waste), ${r.starter.qty} starter, ${r.cap.qty} ridge cap, ${r.underlayment.qty} underlayment`,
            items,
          })}
        />
      }
    />
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[18px] border border-line p-4">
      <h3 className="text-[0.95rem] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-[0.86rem] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-2">{label}</dt>
      <dd className="num shrink-0 font-semibold text-ink">{value < 0 ? `−${fmtMoney(-value)}` : fmtMoney(value)}</dd>
    </div>
  );
}
