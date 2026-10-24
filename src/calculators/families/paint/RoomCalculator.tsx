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
import { formatFeetInches } from "@/lib/units";
import { computeRoom, packText } from "./compute";
import { CEILING_PAINTS, INTERIOR_PRIMERS, SCENARIOS, SPRAY_LOSS_PCT, TRIM_PAINTS, WALL_PAINTS, WALL_TEXTURES, planRate, ratedText, scenario, wallPaint } from "./data";
import { MoreOptions, NeedsTable, PackCompare, needCostLines, needItems, supplyCostLines, supplyItems } from "./parts";
import { ROOM_DEFAULTS, roomInputFrom, type RoomValues } from "./room-model";

const CALC_KEY = "paint/paint-calculator";
const SQM = 10.7639;
const name = (p: { brand: string; name: string }) => (p.brand === "Any brand" ? p.name : `${p.brand} ${p.name}`);

export default function RoomCalculator({ initial }: { initial?: Partial<RoomValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, ROOM_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const r = useMemo(() => computeRoom(roomInputFrom(v)), [v]);
  const wp = wallPaint(v.product);
  const sc = scenario(v.scenario);
  const main = r.needs.find((n) => n.key === "walls") ?? r.needs[0];
  const area = (sqft: number) => (metric ? `${fmt(sqft / SQM, 1)} m²` : `${fmtInt(sqft)} sq ft`);
  const rooms = Math.min(4, Math.max(1, v.rooms));
  const dims: [number, number, keyof RoomValues, keyof RoomValues][] = [
    [v.l1, v.w1, "l1", "w1"],
    [v.l2, v.w2, "l2", "w2"],
    [v.l3, v.w3, "l3", "w3"],
    [v.l4, v.w4, "l4", "w4"],
  ];
  const title = `Paint for ${rooms > 1 ? `${rooms} rooms` : `a ${formatFeetInches(v.l1)} × ${formatFeetInches(v.w1)} room`}, ${formatFeetInches(v.h)} walls`;
  const items = [...needItems(r.needs), ...supplyItems(r.supplies)];
  const costLines = [...needCostLines(r.needs), ...supplyCostLines(r.supplies)];
  const surfaces = [v.walls && "walls", v.ceiling && "ceiling", v.trim && "trim"].filter(Boolean).join(", ") || "nothing selected";

  return (
    <CalcFrame
      dock={{ label: "Buy", value: main ? `${packText(main.pack)} ${main.label.toLowerCase()}` : "—" }}
      inputs={
        <>
          <FieldSection title="Room size">
            <Segmented label="Rooms" columns={4} value={rooms} options={[1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))} onChange={(n) => set({ rooms: n })} help="Same wall height and paint in every room." />
            {dims.slice(0, rooms).map(([l, w, lk, wk], i) => (
              <div key={lk} className="grid grid-cols-2 gap-3">
                <LengthField label={rooms > 1 ? `Room ${i + 1} length` : "Length"} value={l} onChange={(x) => set({ [lk]: x } as Partial<RoomValues>)} />
                <LengthField label={rooms > 1 ? `Room ${i + 1} width` : "Width"} value={w} onChange={(x) => set({ [wk]: x } as Partial<RoomValues>)} />
              </div>
            ))}
            <LengthField label="Wall height" value={v.h} onChange={(h) => set({ h })} hint="floor to ceiling" />
          </FieldSection>

          <FieldSection title="Doors & windows">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Doors" value={v.doors} onChange={(doors) => set({ doors: Math.max(0, Math.round(doors)) })} step={1} min={0} max={40} decimals={0} stepper />
              <NumberField label="Windows" value={v.windows} onChange={(windows) => set({ windows: Math.max(0, Math.round(windows)) })} step={1} min={0} max={60} decimals={0} stepper />
            </div>
          </FieldSection>

          <FieldSection title="What are you painting?">
            <ToggleField label="Walls" checked={v.walls} onChange={(walls) => set({ walls })} />
            <ToggleField label="Ceiling" checked={v.ceiling} onChange={(ceiling) => set({ ceiling })} />
            <ToggleField label="Trim (baseboards & casings)" checked={v.trim} onChange={(trim) => set({ trim })} help="Trim area comes off the wall area so it isn't counted twice." />
            {v.trim ? <ToggleField label="Door slabs, both sides" checked={v.doorSlabs} onChange={(doorSlabs) => set({ doorSlabs })} /> : null}
          </FieldSection>

          <FieldSection title="Situation & coats">
            <SelectField
              label="What's on the walls now?"
              value={v.scenario}
              options={SCENARIOS.map((s) => ({ value: s.id, label: s.label }))}
              onChange={(id) => {
                const s = scenario(id);
                set({ scenario: id, coats: s.coats, primer: s.primer });
              }}
              help={sc.why}
            />
            <Segmented label="Topcoats" columns={3} value={v.coats} options={[1, 2, 3].map((n) => ({ value: n, label: `${n} coat${n > 1 ? "s" : ""}` }))} onChange={(coats) => set({ coats })} />
            <SelectField
              label="Primer"
              value={v.primer}
              onChange={(primer) => set({ primer })}
              options={[
                { value: "none", label: "No primer" },
                { value: "porous", label: "Full coat — new drywall / bare surfaces" },
                { value: "sealed", label: "Full coat — over old paint (color change)" },
                { value: "spot", label: "Spot-prime stains only (1 qt)" },
              ]}
            />
            <ToggleField label="Deep or bright color" checked={v.deep} onChange={(deep) => set({ deep })} help="Reds, yellows, navy: adds a coat unless you prime." />
          </FieldSection>

          <FieldSection title="Paint">
            <SelectField
              label="Wall paint"
              value={v.product}
              options={WALL_PAINTS.map((p) => ({ value: p.id, label: `${name(p)} — ${ratedText(p)} sq ft/gal` }))}
              onChange={(id) => set({ product: id, cov: planRate(wallPaint(id)) })}
              help={`${wp.note} Label: ${wp.coats}.`}
            />
            <NumberField label="Plan with coverage" value={v.cov} onChange={(cov) => set({ cov })} suffix="sq ft/gal" step={25} min={100} max={600} decimals={0} help="Per coat. We plan at the low end of the label range so you don't run short." />
          </FieldSection>

          <MoreOptions label="Sizes, texture, other products & extras">
            <div className="grid grid-cols-2 gap-3">
              <LengthField label="Door width" value={v.doorW} onChange={(doorW) => set({ doorW })} />
              <LengthField label="Door height" value={v.doorH} onChange={(doorH) => set({ doorH })} />
              <LengthField label="Window width" value={v.winW} onChange={(winW) => set({ winW })} />
              <LengthField label="Window height" value={v.winH} onChange={(winH) => set({ winH })} />
            </div>
            <NumberField label="Wall hidden by cabinets, tile or built-ins" value={v.blocked} onChange={(blocked) => set({ blocked })} suffix="sq ft" step={5} min={0} max={2000} decimals={0} />
            <ToggleField label="Include a closet" checked={v.closet} onChange={(closet) => set({ closet })} />
            {v.closet ? (
              <div className="grid grid-cols-2 gap-3">
                <LengthField label="Closet width" value={v.closetW} onChange={(closetW) => set({ closetW })} />
                <LengthField label="Closet depth" value={v.closetD} onChange={(closetD) => set({ closetD })} />
              </div>
            ) : null}
            <Segmented label="Wall texture" columns={3} value={v.texture} options={WALL_TEXTURES.map((t) => ({ value: t.id, label: t.label, sub: t.sub }))} onChange={(texture) => set({ texture })} />
            {v.ceiling ? (
              <>
                <ToggleField label="Popcorn / textured ceiling" checked={v.popcorn} onChange={(popcorn) => set({ popcorn })} />
                <SelectField label="Ceiling paint" value={v.ceilProduct} onChange={(ceilProduct) => set({ ceilProduct })} options={[{ value: "same", label: "Same line as walls" }, ...CEILING_PAINTS.map((p) => ({ value: p.id, label: `${name(p)} — ${ratedText(p)} sq ft/gal` }))]} />
              </>
            ) : null}
            {v.trim ? (
              <>
                <SelectField label="Trim paint" value={v.trimProduct} onChange={(trimProduct) => set({ trimProduct })} options={[{ value: "same", label: "Same line as walls (semi-gloss)" }, ...TRIM_PAINTS.map((p) => ({ value: p.id, label: `${name(p)} — ${ratedText(p)} sq ft/gal` }))]} />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Baseboard height" value={v.base} onChange={(base) => set({ base })} suffix="in" step={0.5} min={0} max={12} decimals={1} />
                  <NumberField label="Casing width" value={v.casing} onChange={(casing) => set({ casing })} suffix="in" step={0.5} min={0} max={8} decimals={1} />
                  <NumberField label="Other trim (crown, chair rail)" value={v.extraLf} onChange={(extraLf) => set({ extraLf })} suffix="ft" step={5} min={0} max={2000} decimals={0} />
                  <NumberField label="Its face height" value={v.extraIn} onChange={(extraIn) => set({ extraIn })} suffix="in" step={0.5} min={0} max={12} decimals={1} />
                </div>
              </>
            ) : null}
            {v.primer !== "none" ? <SelectField label="Primer product" value={v.primerProduct} onChange={(primerProduct) => set({ primerProduct })} options={INTERIOR_PRIMERS.map((p) => ({ value: p.id, label: `${name(p)} — ${p.porous}/${p.sealed} sq ft/gal` }))} help="Coverage shown: bare drywall / previously painted." /> : null}
            <Segmented
              label="Application"
              value={v.loss >= SPRAY_LOSS_PCT ? "spray" : "roller"}
              options={[
                { value: "roller", label: "Brush & roller" },
                { value: "spray", label: "Airless sprayer", sub: `+${SPRAY_LOSS_PCT}% est.` },
              ]}
              onChange={(m) => set({ method: m, loss: m === "spray" ? SPRAY_LOSS_PCT : 0 })}
            />
            <ToggleField label="Keep a quart for touch-ups" checked={v.touchUp} onChange={(touchUp) => set({ touchUp })} />
            <ToggleField label="Home built before 1978" checked={v.pre1978} onChange={(pre1978) => set({ pre1978 })} help="Adds lead-safe prep steps and a test kit." />
          </MoreOptions>
        </>
      }
      results={
        <>
          <ResultHero
            label={main ? `Buy for the ${main.label.toLowerCase()}` : "You need"}
            value={main ? packText(main.pack) : "0 gal"}
            unit={main ? undefined : "— pick a surface"}
            sub={
              main ? (
                <>
                  {fmt(main.gallons, 2)} gal for {area(main.areaSqFt)} × {main.coats} coat{main.coats > 1 ? "s" : ""} at {fmtInt(main.rate)} sq ft/gal · {fmtMoney(main.pack.cost)}
                </>
              ) : (
                "Turn on walls, ceiling or trim to see paint."
              )
            }
          />
          <StatGrid
            stats={[
              { label: "Wall area to paint", value: metric ? fmt(r.wallNetSqFt / SQM, 1) : fmtInt(r.wallNetSqFt), unit: metric ? "m²" : "sq ft", hint: `${area(r.wallGrossSqFt)} minus ${area(r.openingsSqFt)} of openings` },
              { label: "Ceiling", value: metric ? fmt(r.ceilingSqFt / SQM, 1) : fmtInt(r.ceilingSqFt), unit: metric ? "m²" : "sq ft", hint: v.ceiling ? "included" : "not included" },
              { label: "All paint & primer", value: fmt(r.totalGallons, 2), unit: "gal", hint: surfaces },
              { label: "Paint + supplies", value: fmtMoney(r.paintCost + r.suppliesCost), hint: `${fmtMoney(r.paintCost)} paint · ${fmtMoney(r.suppliesCost)} supplies` },
            ]}
          />

          <NeedsTable needs={r.needs} metric={metric} />
          {main ? <PackCompare need={main} priced={main.priced} /> : null}

          {r.wallNetSqFt > 0 ? (
            <Callout tone="info" title="Why brand calculators disagree">
              Sherwin-Williams&apos; calculator (400 sq ft/gal, 21 sq ft per door, 15 per window) says {fmt(r.sw.total, 1)} gal for {r.topcoats} coat{r.topcoats > 1 ? "s" : ""}; Benjamin Moore&apos;s (350 sq ft/gal, always 2 coats, 12 sq ft per window) says {r.bm.gallons} gal
              {r.bm.quarts ? ` + ${r.bm.quarts} qt` : ""}. We use your product&apos;s own label rate and your actual door and window sizes.
            </Callout>
          ) : null}
          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {main && main.pack.leftoverGal >= 0.5 ? (
            <Callout tone="tip" title="Leftover paint">
              You&apos;ll have about {fmt(main.pack.leftoverGal, 2)} gal left. Seal the lid tight and store it above freezing for touch-ups, or ask the store whether a quart or 2-quart size of your line is cheaper.
            </Callout>
          ) : null}

          <ResultsHeading>Shopping list</ResultsHeading>
          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Online prices checked October 23, 2026 (Sherwin-Williams, Benjamin Moore, Walmart). Tap any price to enter your store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Interior paint",
            title,
            summary: r.needs.map((n) => `${n.label}: ${packText(n.pack)}`).join(" · ") || "No surfaces selected",
            items,
          })}
        />
      }
    />
  );
}
