"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines } from "@/components/calc/CostLines";
import { FieldSection, LengthField, NumberField, Segmented, SelectField, ToggleField } from "@/components/calc/fields";
import { Callout, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { autoTrimLf, computeExterior, packText } from "./compute";
import { EXTERIOR_PAINTS, EXTERIOR_PRIMERS, SIDING, SPRAY_LOSS_PCT, exteriorPaint, planRate, ratedText, siding } from "./data";
import { EXTERIOR_DEFAULTS, exteriorInputFrom, type ExteriorValues } from "./exterior-model";
import { MoreOptions, NeedsTable, PackCompare, needCostLines, needItems, supplyCostLines, supplyItems } from "./parts";

const CALC_KEY = "paint/exterior-paint-calculator";
const SQM = 10.7639;
const name = (p: { brand: string; name: string }) => (p.brand === "Any brand" ? p.name : `${p.brand} ${p.name}`);

export default function ExteriorCalculator({ initial }: { initial?: Partial<ExteriorValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, EXTERIOR_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const input = useMemo(() => exteriorInputFrom(v), [v]);
  const r = useMemo(() => computeExterior(input), [input]);
  const p = exteriorPaint(v.product);
  const s = siding(v.siding);
  const main = r.needs.find((n) => n.key === "siding") ?? r.needs[0];
  const area = (sqft: number) => (metric ? `${fmt(sqft / SQM, 1)} m²` : `${fmtInt(sqft)} sq ft`);
  const items = [...needItems(r.needs), ...supplyItems(r.supplies)];
  const costLines = [...needCostLines(r.needs), ...supplyCostLines(r.supplies)];
  const title = v.measure === "area" ? `Exterior paint for ${fmtInt(v.area)} sq ft of siding` : `Exterior paint for a house with ${fmtInt(input.perimeterFt)} ft of walls, ${fmt(v.h)} ft high`;

  return (
    <CalcFrame
      dock={{ label: "Buy", value: main ? `${packText(main.pack)} ${main.label.toLowerCase()}` : "—" }}
      inputs={
        <>
          <FieldSection title="House size">
            <Segmented
              label="Measure by"
              columns={3}
              value={v.measure}
              options={[
                { value: "footprint", label: "Footprint", sub: "length × width" },
                { value: "perimeter", label: "Perimeter", sub: "odd shapes" },
                { value: "area", label: "Wall area", sub: "measured" },
              ]}
              onChange={(measure) => set({ measure })}
            />
            {v.measure === "footprint" ? (
              <div className="grid grid-cols-2 gap-3">
                <LengthField label="House length" value={v.len} onChange={(len) => set({ len })} />
                <LengthField label="House width" value={v.wid} onChange={(wid) => set({ wid })} />
              </div>
            ) : v.measure === "perimeter" ? (
              <LengthField label="Perimeter (all walls)" value={v.perim} onChange={(perim) => set({ perim })} hint="walk around the house" />
            ) : (
              <NumberField label="Siding area" value={v.area} onChange={(a) => set({ area: a })} suffix="sq ft" step={50} min={0} max={50000} decimals={0} help="Not the floor area: the wall surface you will paint, gables included." />
            )}
            {v.measure !== "area" ? (
              <>
                <Segmented
                  label="Stories"
                  columns={3}
                  value={v.h <= 10 ? 9 : v.h <= 19 ? 18 : 27}
                  options={[
                    { value: 9, label: "1 story", sub: "~9 ft" },
                    { value: 18, label: "2 stories", sub: "~18 ft" },
                    { value: 27, label: "3 stories", sub: "~27 ft" },
                  ]}
                  onChange={(h) => set({ h })}
                />
                <LengthField label="Wall height (ground to eaves)" value={v.h} onChange={(h) => set({ h })} />
                <NumberField label="Gable ends" value={v.gables} onChange={(gables) => set({ gables: Math.max(0, Math.round(gables)) })} step={1} min={0} max={8} decimals={0} stepper help="Triangles under the roof peak; 0 for a hip roof." />
                {v.gables > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    <LengthField label="Gable width" value={v.gableW} onChange={(gableW) => set({ gableW })} />
                    <LengthField label="Gable height (peak)" value={v.rise} onChange={(rise) => set({ rise })} />
                  </div>
                ) : null}
              </>
            ) : null}
          </FieldSection>

          <FieldSection title="Doors & windows">
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="Doors" value={v.doors} onChange={(doors) => set({ doors: Math.max(0, Math.round(doors)) })} step={1} min={0} max={20} decimals={0} />
              <NumberField label="Windows" value={v.windows} onChange={(windows) => set({ windows: Math.max(0, Math.round(windows)) })} step={1} min={0} max={100} decimals={0} />
              <NumberField label="Garage doors" value={v.garage} onChange={(garage) => set({ garage: Math.max(0, Math.round(garage)) })} step={1} min={0} max={6} decimals={0} />
            </div>
          </FieldSection>

          <FieldSection title="Siding & paint">
            <SelectField label="Siding" value={v.siding} options={SIDING.map((x) => ({ value: x.id, label: x.label }))} onChange={(id) => set({ siding: id })} help={s.note} />
            <SelectField
              label="Exterior paint"
              value={v.product}
              options={EXTERIOR_PAINTS.map((x) => ({ value: x.id, label: `${name(x)} — ${ratedText(x)} sq ft/gal` }))}
              onChange={(id) => set({ product: id, cov: planRate(exteriorPaint(id)) })}
              help={`${p.note} Label: ${p.coats}.`}
            />
            <Segmented
              label="Coats"
              value={v.coats}
              options={[
                { value: 1, label: "1 coat", sub: "same-color repaint" },
                { value: 2, label: "2 coats", sub: "color change / bare" },
              ]}
              onChange={(coats) => set({ coats })}
            />
            <NumberField label="Plan with coverage" value={v.cov} onChange={(cov) => set({ cov })} suffix="sq ft/gal" step={25} min={100} max={600} decimals={0} help="Per coat on smooth siding; rough surfaces are adjusted automatically." />
          </FieldSection>

          <MoreOptions label="Trim, primer, garage size & spraying">
            <ToggleField label="Estimate trim automatically" checked={v.trimAuto} onChange={(trimAuto) => set({ trimAuto })} help={`Fascia along the eaves, gable rakes and casing around openings: ${fmtInt(autoTrimLf(input))} ft.`} />
            <div className="grid grid-cols-2 gap-3">
              {!v.trimAuto ? <NumberField label="Trim length" value={v.trimLf} onChange={(trimLf) => set({ trimLf })} suffix="ft" step={10} min={0} max={5000} decimals={0} /> : null}
              <NumberField label="Trim face width" value={v.trimIn} onChange={(trimIn) => set({ trimIn })} suffix="in" step={1} min={0} max={24} decimals={0} />
            </div>
            {v.garage > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <LengthField label="Garage door width" value={v.garageW} onChange={(garageW) => set({ garageW })} />
                <LengthField label="Garage door height" value={v.garageH} onChange={(garageH) => set({ garageH })} />
              </div>
            ) : null}
            <ToggleField label="Prime first" checked={v.primer} onChange={(primer) => set({ primer })} help="Bare wood, new fiber cement, stucco or masonry, or chalky old paint." />
            {v.primer ? <SelectField label="Primer product" value={v.primerProduct} onChange={(primerProduct) => set({ primerProduct })} options={EXTERIOR_PRIMERS.map((x) => ({ value: x.id, label: `${name(x)} — ${x.porous} sq ft/gal` }))} /> : null}
            <Segmented
              label="Application"
              value={v.loss >= SPRAY_LOSS_PCT ? "spray" : "roller"}
              options={[
                { value: "roller", label: "Brush & roller" },
                { value: "spray", label: "Airless sprayer", sub: `+${SPRAY_LOSS_PCT}% est.` },
              ]}
              onChange={(m) => set({ method: m, loss: m === "spray" ? SPRAY_LOSS_PCT : 0 })}
            />
            <ToggleField label="Home built before 1978" checked={v.pre1978} onChange={(pre1978) => set({ pre1978 })} help="Adds lead-safe prep steps and a test kit." />
          </MoreOptions>
        </>
      }
      results={
        <>
          <ResultHero
            label="Buy for the siding"
            value={main ? packText(main.pack) : "0 gal"}
            sub={
              main ? (
                <>
                  {fmt(main.gallons, 1)} gal for {area(main.areaSqFt)} × {main.coats} coat{main.coats > 1 ? "s" : ""} at {fmtInt(main.rate)} sq ft/gal · {fmtMoney(main.pack.cost)}
                </>
              ) : (
                "Enter the house size to see paint."
              )
            }
          />
          <StatGrid
            stats={[
              { label: "Siding to paint", value: metric ? fmt(r.sidingSqFt / SQM, 1) : fmtInt(r.sidingSqFt), unit: metric ? "m²" : "sq ft", hint: `${area(r.grossSqFt)} gross${r.gableSqFt ? ` (gables ${area(r.gableSqFt)})` : ""} − ${area(r.openingsSqFt)} openings` },
              { label: "Trim & fascia", value: metric ? fmt(r.trimSqFt / SQM, 1) : fmtInt(r.trimSqFt), unit: metric ? "m²" : "sq ft", hint: `${fmtInt(input.trimLf)} ft × ${fmt(v.trimIn)} in` },
              { label: "Finish paint range", value: `${fmt(r.range.lowGal, 1)}–${fmt(r.range.highGal, 1)}`, unit: "gal", hint: `label range ${ratedText(p)} sq ft/gal` },
              { label: "Paint + supplies", value: fmtMoney(r.paintCost + r.suppliesCost), hint: `${fmtMoney(r.paintCost)} paint · ${fmtMoney(r.suppliesCost)} supplies` },
            ]}
          />

          <NeedsTable needs={r.needs} metric={metric} />
          {main ? <PackCompare need={main} priced={main.priced} /> : null}

          {r.sidingSqFt > 0 ? (
            <Callout tone="info" title="Compared with Sherwin-Williams' calculator">
              It assumes 350 sq ft/gal on every surface and says {fmt(r.sw.total, 1)} gal for siding and trim at {v.coats} coat{v.coats > 1 ? "s" : ""}. We use your paint&apos;s label rate and adjust for {s.label.toLowerCase()}
              {s.factor < 1 ? ` (${Math.round(s.factor * 100)}% of the smooth-surface rate)` : ""}.
            </Callout>
          ) : null}
          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {main && main.gallons >= 4 ? (
            <Callout tone="tip" title="Box your paint">
              Pour every can of the siding color into one 5-gallon bucket and mix before you start, then refill as you go, so a color shift between cans never lands in the middle of a wall.
            </Callout>
          ) : null}

          <ResultsHeading>Shopping list</ResultsHeading>
          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Online prices checked October 23, 2026. Typical prices are labelled; tap any price to enter your store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Exterior paint",
            title,
            summary: r.needs.map((n) => `${n.label}: ${packText(n.pack)}`).join(" · ") || "No paint needed",
            items,
          })}
        />
      }
    />
  );
}
