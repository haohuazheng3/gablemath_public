"use client";

import { clsx } from "clsx";
import { useId, useMemo, useState } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { FieldSection, LengthField, NumberField, Segmented, SelectField, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { SQFT_PER_SQM, formatFeetInches } from "@/lib/units";
import { compareProducts, computeFlooring, inchFraction } from "./compute";
import {
  ACCESSORIES,
  COMPLEXITY,
  CUSTOM_ID,
  DEFAULT_PRODUCT,
  FLOOR_TYPES,
  LABOR,
  LAYOUTS,
  LIFEPROOF_TREADS,
  PRODUCTS,
  REMOVAL_PSF,
  TRANSITIONS,
  type FloorType,
} from "./data";
import { FLOORING_DEFAULTS, MAX_AREAS, flooringAreas, flooringInputFrom, flooringType, type FlooringValues } from "./flooring-model";
import { AreaTile, FloorPlan } from "./plans";
import { ProCost } from "./ProCost";

const CALC_KEY = "flooring/flooring-calculator";
const L_KEYS = ["l1", "l2", "l3", "l4", "l5", "l6"] as const;
const W_KEYS = ["w1", "w2", "w3", "w4", "w5", "w6"] as const;

const TYPE_NOUN: Record<FloorType, string> = { lvp: "vinyl plank", laminate: "laminate", engineered: "engineered hardwood", solid: "solid hardwood" };

export default function FlooringCalculator({ initial }: { initial?: Partial<FlooringValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, FLOORING_DEFAULTS, initial);
  const { system } = useUnits();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [more, setMore] = useState(false);
  const [rev, setRev] = useState(0);
  const input = useMemo(() => flooringInputFrom(v), [v]);
  const r = useMemo(() => computeFlooring(input), [input]);
  const type = flooringType(v);
  const p = input.product;
  const hardwood = type === "solid" || type === "engineered";
  const metric = system === "metric";
  const roomsMode = v.mode !== "area";
  const areas = flooringAreas(v);
  const area = (sqft: number, d = 1) => (metric ? `${fmt(sqft / SQFT_PER_SQM, d)} m²` : `${fmt(sqft, d)} sq ft`);

  const compare = useMemo(() => compareProducts(type, r.orderSqft, !!p.pattern), [type, r.orderSqft, p.pattern]);

  const setDim = (key: (typeof L_KEYS)[number] | (typeof W_KEYS)[number], value: number) => set({ [key]: value } as Partial<FlooringValues>);

  function removeArea(index: number) {
    const dims = areas.filter((_, i) => i !== index);
    const patch: Record<string, number> = { areas: dims.length };
    dims.forEach((d, i) => {
      patch[L_KEYS[i]] = d.l;
      patch[W_KEYS[i]] = d.w;
    });
    set(patch as Partial<FlooringValues>);
  }

  const dims = roomsMode ? areas.map((a) => `${formatFeetInches(a.l)} × ${formatFeetInches(a.w)}`).join(" + ") : `${fmtInt(v.sqft)} sq ft`;
  const title = `${TYPE_NOUN[type][0].toUpperCase()}${TYPE_NOUN[type].slice(1)} for ${dims}`;
  const trLabel = v.trans === "reducer" ? "Reducer" : "T-molding";
  const priceNote = p.priced ? p.priceNote : `no verified price for this SKU — typical ${TYPE_NOUN[type]} price used`;

  const items: ShoppingItem[] = [
    {
      id: "boxes",
      name: `${p.name}`,
      qty: r.boxes,
      unit: "boxes",
      cost: r.boxCost,
      note: `${fmt(p.sqftPerBox, 2)} sq ft per box${v.spare > 0 ? ` · includes ${v.spare} spare` : ""} · check that every carton has the same dye lot`,
    },
    ...(r.underlayment.rolls > 0
      ? [
          r.underlayment.kind === "felt"
            ? { id: "felt", name: ACCESSORIES.felt.name, qty: r.underlayment.rolls, unit: "rolls", cost: r.underlayment.cost }
            : { id: "underlayment", name: ACCESSORIES.foam.name, qty: r.underlayment.rolls, unit: "rolls", cost: r.underlayment.cost },
        ]
      : []),
    ...(r.vapor ? [{ id: "poly", name: ACCESSORIES.poly.name, qty: r.vapor.rolls, unit: "rolls", cost: r.vapor.cost, note: "overlap seams 8 in and tape them" }] : []),
    ...(r.transitions.pieces > 0
      ? [{ id: "transitions", name: `${trLabel}, ${r.transitions.stickIn} in`, qty: r.transitions.pieces, unit: "pieces", cost: r.transitions.cost, note: `${fmtInt(v.doors)} doorway${v.doors === 1 ? "" : "s"} at ${fmt(v.doorW, 0)} in` }]
      : []),
    ...(r.trim
      ? [{ id: "quarter-round", name: `Quarter round, ${r.trim.stickIn} in${v.trim === "paint" ? " paint-grade" : " matching"}`, qty: r.trim.pieces, unit: "pieces", cost: r.trim.cost, note: `${fmt(r.trim.linearFt, 0)} linear ft + 10% for miters` }]
      : []),
    ...(r.stairs && r.stairs.noseSticks > 0 ? [{ id: "stair-nose", name: `Stair nose, ${TRANSITIONS.stairNose.lengthIn} in`, qty: r.stairs.noseSticks, unit: "pieces", cost: r.stairs.noseCost }] : []),
    ...(r.stairs && r.stairs.treadBoxes > 0
      ? [{ id: "treads", name: `LifeProof-matched stair treads, ${LIFEPROOF_TREADS.lengthIn} in (${LIFEPROOF_TREADS.perBox} per box)`, qty: r.stairs.treadBoxes, unit: "boxes", cost: r.stairs.treadCost }]
      : []),
  ];

  const costLines: CostLine[] = [
    { priceId: `floor-box-${p.id}`, label: p.short, qty: r.boxes, unit: "boxes", defaultPrice: p.boxPrice, note: priceNote },
    ...(r.underlayment.kind === "foam" && r.underlayment.rolls > 0 ? [{ priceId: "underlay-foam-100", label: "Foam underlayment (100 sq ft)", qty: r.underlayment.rolls, unit: "rolls", defaultPrice: ACCESSORIES.foam.price }] : []),
    ...(r.underlayment.kind === "felt" && r.underlayment.rolls > 0 ? [{ priceId: "felt-15lb-432", label: "15 lb felt (432 sq ft)", qty: r.underlayment.rolls, unit: "rolls", defaultPrice: ACCESSORIES.felt.price }] : []),
    ...(r.vapor ? [{ priceId: "poly-6mil-200", label: "6 mil moisture barrier (200 sq ft)", qty: r.vapor.rolls, unit: "rolls", defaultPrice: ACCESSORIES.poly.price }] : []),
    ...(r.transitions.pieces > 0 ? [{ priceId: `trans-${v.trans}-${r.transitions.stickIn}`, label: `${trLabel} ${r.transitions.stickIn} in`, qty: r.transitions.pieces, unit: "pieces", defaultPrice: r.transitions.price }] : []),
    ...(r.trim ? [{ priceId: `qr-${v.trim}-${r.trim.stickIn}`, label: `Quarter round ${r.trim.stickIn} in`, qty: r.trim.pieces, unit: "pieces", defaultPrice: r.trim.price }] : []),
    ...(r.stairs && r.stairs.noseSticks > 0 ? [{ priceId: "stairnose-94", label: "Stair nose 94 in", qty: r.stairs.noseSticks, unit: "pieces", defaultPrice: TRANSITIONS.stairNose.price }] : []),
    ...(r.stairs && r.stairs.treadBoxes > 0 ? [{ priceId: "lifeproof-treads-2pk", label: "Matching stair treads (2-pack)", qty: r.stairs.treadBoxes, unit: "boxes", defaultPrice: LIFEPROOF_TREADS.price }] : []),
  ];

  const productOptions = [
    ...PRODUCTS.filter((x) => x.type === type).map((x) => ({ value: x.id, label: `${x.short} — ${fmt(x.sqftPerBox, 2)} sq ft/box`, group: x.brand })),
    { value: CUSTOM_ID, label: "Another product — enter the box size", group: "Other" },
  ];

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${fmtInt(r.boxes)} boxes` }}
      inputs={
        <>
          <FieldSection title="What are you installing?">
            <Segmented
              label="Flooring"
              columns={4}
              value={type}
              options={FLOOR_TYPES}
              onChange={(t) => set({ type: t, product: DEFAULT_PRODUCT[t], labor: LABOR[t].rate })}
            />
            <SelectField
              label="Product"
              value={p.id}
              options={productOptions}
              onChange={(id) => {
                const next = PRODUCTS.find((x) => x.id === id);
                set({ product: id, ...(next?.pattern ? { layout: "herringbone" } : {}) });
              }}
              help={p.id === CUSTOM_ID ? "Enter the coverage printed on the carton — boxes of the same plank size often differ." : (p.note ?? `${fmt(p.sqftPerBox, 2)} sq ft per box${p.piecesPerBox ? ` (${p.piecesPerBox} planks)` : ""} · ${p.attachedPad ? "pad attached" : "no pad attached"} · ${priceNote}`)}
            />
            {p.id === CUSTOM_ID ? (
              <div className="animate-rise grid grid-cols-2 gap-3">
                <NumberField label="Sq ft per box" value={v.boxSqft} onChange={(boxSqft) => set({ boxSqft })} step={0.5} min={1} max={200} decimals={2} stepper={false} />
                <NumberField label="Price per sq ft" value={v.psf} onChange={(psf) => set({ psf })} prefix="$" step={0.1} decimals={2} stepper={false} />
                {type !== "solid" ? (
                  <div className="col-span-2">
                    <ToggleField label="Planks have an attached pad" checked={v.pad} onChange={(pad) => set({ pad })} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </FieldSection>

          <FieldSection title="Size">
            <Segmented
              label="Measure by"
              value={roomsMode ? "rooms" : "area"}
              options={[
                { value: "rooms", label: "Room dimensions" },
                { value: "area", label: "Total sq ft" },
              ]}
              onChange={(mode) => set({ mode })}
            />
            {roomsMode ? (
              <>
                {areas.map((a, i) =>
                  i === 0 ? (
                    <div key={i} className="grid grid-cols-2 gap-3">
                      <LengthField label="Length" value={a.l} onChange={(l) => setDim("l1", l)} />
                      <LengthField label="Width" value={a.w} onChange={(w) => setDim("w1", w)} />
                    </div>
                  ) : (
                    <div key={i} className="animate-rise rounded-[16px] border border-line bg-surface-2 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[0.8rem] font-semibold text-ink-2">Area {i + 1}</span>
                        <button type="button" onClick={() => removeArea(i)} className="rounded-full px-2 py-0.5 text-[0.76rem] font-semibold text-ink-3 hover:text-bad">
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <LengthField label="Length" value={a.l} onChange={(l) => setDim(L_KEYS[i], l)} />
                        <LengthField label="Width" value={a.w} onChange={(w) => setDim(W_KEYS[i], w)} />
                      </div>
                    </div>
                  ),
                )}
                {areas.length < MAX_AREAS ? (
                  <button
                    type="button"
                    onClick={() => set({ areas: areas.length + 1 })}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong text-[0.86rem] font-semibold text-ink-2 transition hover:border-accent hover:text-accent active:scale-[0.99]"
                  >
                    + Add a room, closet or hall <span className="font-normal text-ink-3">(L-shapes too)</span>
                  </button>
                ) : null}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Floor area" value={v.sqft} onChange={(sqft) => set({ sqft })} suffix="sq ft" step={50} min={0} max={100000} decimals={0} stepper={false} />
                <NumberField label="Wall length" value={v.wallFt} onChange={(wallFt) => set({ wallFt })} suffix="ft" step={10} min={0} max={10000} decimals={0} stepper={false} help="For quarter round; optional." />
              </div>
            )}
          </FieldSection>

          <FieldSection title="Layout">
            <Segmented label="Pattern" columns={3} value={input.layout} options={LAYOUTS} onChange={(layout) => set({ layout })} />
            {roomsMode && input.layout === "straight" ? (
              <Segmented
                label="Planks run"
                value={input.runAlong}
                options={[
                  { value: "length", label: "Along the length" },
                  { value: "width", label: "Along the width" },
                ]}
                onChange={(dir) => set({ dir })}
                help="Most installers run planks parallel to the longest wall or toward the main window."
              />
            ) : null}
            <Segmented label="Room shape" columns={3} value={input.complexity} options={COMPLEXITY} onChange={(complexity) => set({ complexity })} />
          </FieldSection>

          <div>
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-[0.99]"
            >
              Waste, subfloor, doorways, trim & stairs
              <span aria-hidden className={clsx("transition-transform duration-200", more && "rotate-180")}>
                ⌄
              </span>
            </button>
            {more ? (
              <div className="animate-rise mt-4 space-y-4">
                <ToggleField
                  label="Automatic waste allowance"
                  checked={v.wasteAuto}
                  onChange={(wasteAuto) => set({ wasteAuto, waste: r.waste.total })}
                  help={`${r.waste.total}% from the layout, room shape and job size. Turn off to set your own.`}
                />
                {!v.wasteAuto ? <NumberField label="Extra for waste" value={v.waste} onChange={(waste) => set({ waste })} suffix="%" step={1} min={0} max={40} decimals={0} /> : null}
                <Segmented
                  label="Spare boxes for future repairs"
                  value={v.spare}
                  options={[
                    { value: 0, label: "None" },
                    { value: 1, label: "+1 box" },
                    { value: 2, label: "+2 boxes" },
                  ]}
                  onChange={(spare) => set({ spare })}
                  help="Colors vary by dye lot, so a matching box is hard to find later."
                />
                <Segmented
                  label="Subfloor"
                  value={input.subfloor}
                  options={[
                    { value: "wood", label: "Plywood / OSB" },
                    { value: "slab", label: "Concrete slab" },
                    { value: "basement", label: "Basement slab" },
                  ]}
                  onChange={(subfloor) => set({ subfloor })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Doorways" value={v.doors} onChange={(doors) => set({ doors: Math.max(0, Math.round(doors)) })} step={1} min={0} max={40} decimals={0} />
                  <NumberField label="Doorway width" value={v.doorW} onChange={(doorW) => set({ doorW })} suffix="in" step={2} min={12} max={240} decimals={0} stepper={false} />
                </div>
                <Segmented
                  label="Transition at doorways"
                  value={input.transition}
                  options={[
                    { value: "tmold", label: "T-molding", sub: "same height" },
                    { value: "reducer", label: "Reducer", sub: "to a lower floor" },
                  ]}
                  onChange={(trans) => set({ trans })}
                  help="One piece per doorway where the new floor meets another floor; a 94 in stick covers two openings."
                />
                <Segmented
                  label="Trim over the expansion gap"
                  columns={3}
                  value={input.trim}
                  options={[
                    { value: "matched", label: "Matching", sub: hardwood ? "78 in" : "94 in" },
                    { value: "paint", label: "Paint-grade", sub: "8 ft" },
                    { value: "none", label: "None", sub: "new baseboard" },
                  ]}
                  onChange={(trim) => set({ trim })}
                />
                <NumberField
                  label="Stairs"
                  value={v.steps}
                  onChange={(steps) => set({ steps: Math.max(0, Math.round(steps)) })}
                  suffix="steps"
                  step={1}
                  min={0}
                  max={40}
                  decimals={0}
                  help={hardwood ? "Hardwood stairs use solid treads — not counted here." : undefined}
                />
                {v.steps > 0 && !hardwood ? (
                  <div className="animate-rise grid grid-cols-3 gap-3">
                    <NumberField label="Width" value={v.stairW} onChange={(stairW) => set({ stairW })} suffix="in" step={1} min={12} max={96} decimals={1} stepper={false} />
                    <NumberField label="Tread" value={v.tread} onChange={(tread) => set({ tread })} suffix="in" step={0.5} min={6} max={14} decimals={2} stepper={false} />
                    <NumberField label="Riser" value={v.riser} onChange={(riser) => set({ riser })} suffix="in" step={0.25} min={4} max={9} decimals={2} stepper={false} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      }
      results={
        <>
          <ResultHero
            label="You need"
            value={fmtInt(r.boxes)}
            unit={`boxes · ${p.short}`}
            sub={
              <>
                {area(r.orderSqft)} including {fmt(r.wastePct, 0)}% waste{r.stairs?.plankSqft ? ` + ${area(r.stairs.plankSqft)} for stairs` : ""} · the boxes
                cover {area(r.coverSqft)}, leaving {area(r.leftoverSqft)} spare · {fmtMoney(r.boxCost)} at {fmtMoney(p.boxPrice, { cents: true })} a box
              </>
            }
          />
          <div className="flex flex-col items-center gap-2 rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            {roomsMode ? (
              <FloorPlan uid={uid} areas={areas} layout={input.layout} along={input.runAlong === "length" ? "x" : "y"} plankWidthIn={p.plankWidthIn} plankLengthIn={p.plankLengthIn} />
            ) : (
              <AreaTile sqft={r.netSqft} />
            )}
            {r.rows ? (
              <p className="text-center text-[0.78rem] text-ink-3">
                About {fmtInt(r.rows.count)} rows across the largest area, last row ≈ {fmt(r.rows.lastRowIn, 1)} in wide
                {p.plankWidthIn && r.rows.lastRowIn < p.plankWidthIn / 2 ? " — trim the first row too so both edge rows match" : ""}.
              </p>
            ) : null}
          </div>
          <StatGrid
            stats={[
              { label: "Floor area", value: metric ? fmt(r.netSqft / SQFT_PER_SQM, 1) : fmt(r.netSqft, 1), unit: metric ? "m²" : "sq ft", hint: roomsMode && areas.length > 1 ? `${areas.length} areas` : "before waste" },
              { label: "Order incl. waste", value: metric ? fmt(r.orderSqft / SQFT_PER_SQM, 1) : fmt(r.orderSqft, 1), unit: metric ? "m²" : "sq ft", hint: `${fmt(r.wastePct, 0)}% extra` },
              { label: "Per box", value: fmt(p.sqftPerBox, 2), unit: "sq ft", hint: `${fmtMoney(p.boxPrice, { cents: true })} a box` },
              { label: "Real cost per sq ft", value: r.netSqft > 0 ? fmtMoney(r.effectivePsf, { cents: true }) : "—", hint: "whole boxes ÷ floor area" },
            ]}
          />

          <div className="rounded-[18px] border border-line p-4">
            <h3 className="text-[0.95rem] font-semibold text-ink">Why {fmt(r.wastePct, 0)}% extra</h3>
            {v.wasteAuto ? (
              <ul className="mt-2 space-y-1.5 text-[0.86rem] leading-snug text-ink-2">
                <li>
                  <span className="num font-semibold text-ink">{r.waste.layout}%</span> for a {input.layout} layout —{" "}
                  {input.layout === "herringbone"
                    ? "LifeProof asks for 15–20% on herringbone and chevron; we use 20% under 200 sq ft."
                    : hardwood
                      ? `Bruce's ${input.layout === "diagonal" ? "diagonal" : "cutting and grading"} allowance.`
                      : input.layout === "diagonal"
                        ? "Pergo's figure for diagonal installs."
                        : "what LifeProof and Floor & Decor recommend."}
                </li>
                {r.waste.complexity ? (
                  <li>
                    <span className="num font-semibold text-ink">+{r.waste.complexity}%</span> for closets, jogs and cut-outs.
                  </li>
                ) : null}
                {r.waste.smallJob ? (
                  <li>
                    <span className="num font-semibold text-ink">+{r.waste.smallJob}%</span> because under 100 sq ft the 8 in minimum end pieces waste more per row.
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-2 text-[0.86rem] leading-snug text-ink-2">Set by hand. The automatic figure for this job would be {r.waste.total}%.</p>
            )}
          </div>

          {compare.length > 1 ? (
            <>
              <ResultsHeading>Same floor, other {TYPE_NOUN[type]} lines</ResultsHeading>
              <OptionTable
                caption={`Boxes for ${fmt(r.orderSqft, 0)} sq ft by product`}
                columns={["Product", "Sq ft/box", "Boxes", "Cost"]}
                highlight={compare.findIndex((c) => c.product.id === p.id)}
                rows={compare.map((c) => [c.product.short, fmt(c.product.sqftPerBox, 2), fmtInt(c.boxes), `${fmtMoney(c.cost)}${c.product.priced ? "" : "*"}`])}
              />
              {compare.some((c) => !c.product.priced) ? <p className="-mt-2 text-[0.74rem] text-ink-3">* no verified price for that SKU; typical {TYPE_NOUN[type]} price used.</p> : null}
            </>
          ) : null}

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          <Callout tone={r.underlayment.kind === "attached" ? "ok" : "info"} title={r.underlayment.kind === "attached" ? "No separate underlayment" : r.underlayment.rolls > 0 ? `${fmtInt(r.underlayment.rolls)} rolls of underlayment` : "Underlayment"}>
            {r.underlayment.why}
          </Callout>
          {r.vapor ? (
            <Callout tone={r.vapor.required ? "warn" : "tip"} title={r.vapor.required ? "Moisture barrier required on concrete" : "Moisture barrier recommended"}>
              {r.vapor.required
                ? `Pergo requires 6 mil polyethylene over concrete with seams overlapped 8 in — ${fmtInt(r.vapor.rolls)} roll${r.vapor.rolls === 1 ? "" : "s"} here. We apply the same rule to all laminate; check your carton.`
                : type === "lvp"
                  ? `Lay 6 mil poly first (${fmtInt(r.vapor.rolls)} roll${r.vapor.rolls === 1 ? "" : "s"}) — LifeProof recommends it on basement slabs prone to moisture.`
                  : `Floating wood over concrete is normally laid on a moisture barrier (${fmtInt(r.vapor.rolls)} roll${r.vapor.rolls === 1 ? "" : "s"} of 6 mil poly here) — confirm what your product's instructions require.`}
            </Callout>
          ) : input.subfloor === "slab" && type === "lvp" ? (
            <Callout tone="tip" title="Moisture barrier optional on grade">
              LifeProof and COREtec don&apos;t require poly on a dry slab at grade. Never lay sheet plastic over a wood subfloor under COREtec.
            </Callout>
          ) : null}

          <div className="rounded-[18px] border border-line p-4">
            <h3 className="text-[0.95rem] font-semibold text-ink">Before you install</h3>
            <dl className="mt-2 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
              <div>
                <dt className="text-[0.74rem] text-ink-3">Expansion gap at walls</dt>
                <dd className="text-[0.88rem] font-semibold text-ink">
                  {inchFraction(r.gapIn)}
                  <span className="font-normal text-ink-3"> · {r.gapCovered ? "quarter round covers it" : "wider than quarter round"}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[0.74rem] text-ink-3">Acclimation</dt>
                <dd className="text-[0.86rem] leading-snug text-ink">{r.acclimation.text}</dd>
              </div>
              {r.concreteLimit ? (
                <div>
                  <dt className="text-[0.74rem] text-ink-3">Slab moisture limit</dt>
                  <dd className="text-[0.86rem] leading-snug text-ink">{r.concreteLimit}</dd>
                </div>
              ) : null}
              {r.flatness ? (
                <div>
                  <dt className="text-[0.74rem] text-ink-3">Subfloor flatness</dt>
                  <dd className="text-[0.86rem] leading-snug text-ink">{r.flatness}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-3 text-[0.74rem] text-ink-3">Source: {r.acclimation.source}.</p>
          </div>

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <div onChange={() => setRev((n) => n + 1)} onClick={() => setRev((n) => n + 1)}>
            <CostLines lines={costLines} footnote="Box prices: Floor & Decor live and Home Depot/dealer listings (some cached), October 2026. Tap any price to enter your store's." />
          </div>
          <ProCost
            rev={rev}
            lines={costLines}
            labor={[
              { label: "Installation labor", detail: `${fmt(r.netSqft, 0)} sq ft × ${fmtMoney(v.labor, { cents: true })}`, amount: r.laborCost },
              ...(v.removal ? [{ label: "Remove old flooring", detail: `${fmt(r.netSqft, 0)} sq ft × ${fmtMoney(REMOVAL_PSF, { cents: true })}`, amount: r.removalCost }] : []),
            ]}
            inputs={
              <>
                <NumberField label="Labor per sq ft" value={v.labor} onChange={(labor) => set({ labor })} prefix="$" step={0.25} decimals={2} stepper={false} />
                <div className="pt-6">
                  <ToggleField label="Tear out old floor" checked={v.removal} onChange={(removal) => set({ removal })} />
                </div>
              </>
            }
            footnote={`Labor: ${LABOR[type].range}. Removal: about $1–$2 per sq ft (This Old House, 2026). Stairs, furniture moving and leveling are quoted separately.`}
          />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Flooring",
            title,
            summary: `${fmtInt(r.boxes)} boxes of ${p.short} (${fmt(r.orderSqft, 1)} sq ft incl. ${fmt(r.wastePct, 0)}% waste)`,
            items,
          })}
        />
      }
    />
  );
}
