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
import { FT_PER_M, LB_PER_KG, SQFT_PER_SQM, formatFeetInches } from "@/lib/units";
import { computeMetal, pitchFactor } from "./compute";
import { CAP_NAILS, METAL, METAL_PROFILES, metalProfile, underlayment } from "./data";
import { METAL_DEFAULTS, metalInputFrom, type MetalValues } from "./metal-model";
import { MetalPlan } from "./RoofDiagrams";

const CALC_KEY = "roofing/metal-roofing-calculator";
const METAL_PITCHES = [2, 3, 4, 5, 6, 8, 10, 12];

export default function MetalRoofCalculator({ initial }: { initial?: Partial<MetalValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, METAL_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const r = useMemo(() => computeMetal(metalInputFrom(v)), [v]);
  const p = metalProfile(v.profile);
  const shed = v.style === "shed";
  const synthetic = underlayment("synthetic");
  const len = (ft: number) => (metric ? `${fmt(ft / FT_PER_M, 1)} m` : `${fmtInt(ft)} ft`);
  const cutLen = metric ? `${fmt(r.panelLengthFt / FT_PER_M, 2)} m` : formatFeetInches(r.panelLengthFt);
  // What goes on the order: stock panels (possibly cut in two) or cut-to-length panels.
  const orderQty = r.stock ? r.stock.count : r.panels;
  const orderLen = r.stock ? `${r.stock.ft} ft` : cutLen;
  const cutNote = r.stock ? (r.stock.pieces === 2 ? `cut each into two ${cutLen} pieces` : `trim each to ${cutLen}`) : "cut to length";
  const capBuckets = Math.ceil(r.capNails / CAP_NAILS.perBucket - 1e-9);
  const title = `Metal roof for ${formatFeetInches(v.l)} × ${formatFeetInches(v.w)}, ${fmt(v.pitch, 2)}/12`;

  const items: ShoppingItem[] = [
    { id: "panels", name: `${p.short} panels, ${orderLen}${r.stock ? " stock" : " cut to length"}`, qty: orderQty, unit: "panels", cost: r.panelCost, note: `${r.stock ? `${cutNote} · ` : ""}${r.panelsPerSide} per side at ${p.coverageIn}-in coverage · ${fmtInt(r.panelLf)} lin ft` },
    { id: "screws", name: "#14 × 1 in Woodtite roofing screws (OSB/plywood deck)", qty: r.screws, unit: "screws", note: "80 per square; use #10 × 1½ in into purlins" },
    ...(shed
      ? [{ id: "high-trim", name: "High-side (peak) trim, 10½ ft", qty: r.ridgePieces, unit: "pieces", note: `${fmtInt(r.ridgeLf)} ft` }]
      : [{ id: "ridge", name: "Ridge cap, 10½ ft × 14 in", qty: r.ridgePieces, unit: "pieces", cost: r.ridgePieces * METAL.ridgeCap.price, note: `${fmtInt(r.ridgeLf)} ft, lapped 6 in` }]),
    { id: "eave-trim", name: "Eave trim / drip edge, 10½ ft", qty: r.eavePieces, unit: "pieces", note: `${fmtInt(r.eaveLf)} ft` },
    { id: "rake-trim", name: "Rake (gable) trim, 10½ ft", qty: r.rakePieces, unit: "pieces", note: `${fmtInt(r.rakeLf)} ft` },
    { id: "inside-closure", name: `Inside foam closure, ${p.closure.lengthIn} in (eaves)`, qty: r.eaveClosures, unit: "strips", cost: r.eaveClosures * p.closure.price },
    { id: "outside-closure", name: `Outside foam closure, ${p.closure.lengthIn} in (${shed ? "high side" : "ridge"})`, qty: r.ridgeClosures, unit: "strips", cost: r.ridgeClosures * p.closure.price },
    ...(v.under
      ? [
          { id: "underlayment", name: synthetic.name, qty: r.underlaymentRolls, unit: "rolls", cost: r.underlaymentRolls * synthetic.price },
          { id: "cap-nails", name: "1-in plastic cap nails, bucket of 3,000", qty: capBuckets, unit: "buckets", cost: capBuckets * CAP_NAILS.price },
        ]
      : []),
  ].filter((it) => it.qty > 0);

  const costLines: CostLine[] = [
    r.stock
      ? { priceId: `metal-${p.id}-${r.stock.ft}ft`, label: `${p.short} panel, ${r.stock.ft} ft (29 ga)`, qty: r.stock.count, unit: "panels", defaultPrice: r.stock.price }
      : { priceId: `metal-${p.id}-lf`, label: `${p.short} panel, cut to length (29 ga)`, qty: Math.round(r.panelLf * 10) / 10, unit: "lin ft", defaultPrice: p.perLf },
    ...(shed ? [] : [{ priceId: "metal-ridge-cap-10-5", label: "Ridge cap, 10½ ft", qty: r.ridgePieces, unit: "pieces", defaultPrice: METAL.ridgeCap.price }]),
    { priceId: `metal-closure-${p.id}`, label: `Foam closure strips, ${p.closure.lengthIn} in`, qty: r.eaveClosures + r.ridgeClosures, unit: "strips", defaultPrice: p.closure.price },
    ...(v.under
      ? [
          { priceId: `roof-underlayment-${synthetic.id}`, label: synthetic.name, qty: r.underlaymentRolls, unit: "rolls", defaultPrice: synthetic.price },
          { priceId: "roof-cap-nails-3000", label: "Plastic cap nails (3,000)", qty: capBuckets, unit: "buckets", defaultPrice: CAP_NAILS.price },
        ]
      : []),
  ].filter((l) => l.qty > 0);

  return (
    <CalcFrame
      dock={{ label: "Panels", value: `${fmtInt(orderQty)} × ${orderLen}` }}
      inputs={
        <>
          <FieldSection title="Building">
            <Segmented
              label="Roof shape"
              value={v.style}
              options={[
                { value: "gable", label: "Gable", sub: "2 slopes" },
                { value: "shed", label: "Single slope", sub: "shed / lean-to" },
              ]}
              onChange={(style) => set({ style })}
            />
            <div className="grid grid-cols-2 gap-3">
              <LengthField label="Length" value={v.l} onChange={(l) => set({ l })} hint="along the eave" />
              <LengthField label="Width" value={v.w} onChange={(w) => set({ w })} hint={shed ? "low to high" : "eave to eave"} />
            </div>
            <Segmented label="Pitch" columns={4} value={METAL_PITCHES.includes(v.pitch) ? v.pitch : -1} options={METAL_PITCHES.map((x) => ({ value: x, label: `${x}/12` }))} onChange={(pitch) => pitch >= 0 && set({ pitch })} />
            <NumberField label="Exact pitch" value={v.pitch} onChange={(pitch) => set({ pitch })} suffix="/12" step={0.5} max={24} decimals={2} help={`Multiplier ${fmt(pitchFactor(v.pitch), 3)}`} />
            <div className="grid grid-cols-2 gap-3">
              <LengthField label="Eave overhang" base="in" value={v.eave} onChange={(eave) => set({ eave })} allowZero />
              <LengthField label="Gable overhang" base="in" value={v.rake} onChange={(rake) => set({ rake })} allowZero />
            </div>
          </FieldSection>

          <FieldSection title="Panels">
            <Segmented label="Profile" value={v.profile} options={METAL_PROFILES.map((x) => ({ value: x.id, label: `${x.coverageIn}-in coverage`, sub: x.short }))} onChange={(profile) => set({ profile })} />
            <Segmented
              label="Panel lengths"
              value={v.stock ? "stock" : "cut"}
              options={[
                { value: "cut", label: "Cut to length", sub: "metal supplier" },
                { value: "stock", label: "Stock lengths", sub: `store, ${p.stock[0].ft}–${p.stock[p.stock.length - 1].ft} ft` },
              ]}
              onChange={(x) => set({ stock: x === "stock" })}
            />
            <ToggleField label="Solid deck with underlayment" checked={v.under} onChange={(under) => set({ under })} help="Turn off for panels screwed straight to purlins (pole barns, open sheds)." />
          </FieldSection>
        </>
      }
      results={
        <>
          <ResultHero
            label="Panels to order"
            value={fmtInt(orderQty)}
            unit={`× ${orderLen}`}
            sub={
              <>
                {r.stock ? `${r.stock.ft}-ft stock panels — ${cutNote} for ${r.panels} roof panels · ` : ""}
                {r.panelsPerSide} per side{r.sides > 1 ? " × 2 sides" : ""} · {p.coverageIn}-in coverage · {fmtInt(r.panelLf)} lin ft of panel
              </>
            }
          />
          {r.eaveLengthFt > 0 ? (
            <div className="flex justify-center rounded-[18px] border border-line bg-surface-2 px-3 py-4">
              <MetalPlan
                lengthFt={r.eaveLengthFt}
                widthFt={v.w + (2 * v.eave) / 12}
                shed={shed}
                panelsPerSide={r.panelsPerSide}
                coverageIn={p.coverageIn}
                panelLabel={`${r.panelsPerSide} panels per side, each ${cutLen} long`}
              />
            </div>
          ) : null}
          <StatGrid
            stats={[
              { label: "Roof area", value: metric ? fmtInt(r.roofAreaSqFt / SQFT_PER_SQM) : fmtInt(r.roofAreaSqFt), unit: metric ? "m²" : "sq ft", hint: `${fmt(r.squares, 1)} squares`, emphasis: true },
              { label: "Screws", value: fmtInt(r.screws), hint: "80 per square, panels only" },
              { label: "Panel run (cut)", value: cutLen, hint: shed ? "low eave edge to high edge, along the slope" : "eave edge to ridge, along the slope" },
              { label: "Panel weight", value: metric ? fmtInt(r.weightLb / LB_PER_KG) : fmtInt(r.weightLb), unit: metric ? "kg" : "lb", hint: "29 ga at 0.70 lb/sq ft" },
            ]}
          />

          <ResultsHeading>Trim & closures</ResultsHeading>
          <OptionTable
            caption="Trim pieces and closure strips"
            columns={["Item", "Length", "Buy"]}
            rows={[
              [shed ? "High-side trim" : "Ridge cap", len(r.ridgeLf), `${r.ridgePieces} × 10½ ft`],
              ["Eave trim", len(r.eaveLf), `${r.eavePieces} × 10½ ft`],
              ["Rake trim", len(r.rakeLf), `${r.rakePieces} × 10½ ft`],
              ["Inside closures (eave)", len(r.eaveLf), `${r.eaveClosures} × ${p.closure.lengthIn} in`],
              [`Outside closures (${shed ? "high side" : "ridge"})`, len(r.ridgeLf * r.sides), `${r.ridgeClosures} × ${p.closure.lengthIn} in`],
            ]}
          />

          <ResultsHeading>Compare panel profiles</ResultsHeading>
          <OptionTable
            caption="Panels by profile"
            columns={["Profile", "Panels", "Lin ft", "Panel cost"]}
            highlight={METAL_PROFILES.findIndex((x) => x.id === p.id)}
            rows={METAL_PROFILES.map((x) => {
              const o = computeMetal(metalInputFrom({ ...v, profile: x.id }));
              return [
                <>
                  {x.short}
                  <span className="block text-[0.74rem] font-normal text-ink-3">{x.coverageIn}-in coverage</span>
                </>,
                fmtInt(o.panels),
                fmtInt(o.panelLf),
                fmtMoney(o.panelCost),
              ];
            })}
          />

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          <Callout tone="tip" title="Screw pattern">
            Fabral calls for 80 screws per square on exposed-fastener rib panels: screws at the eaves, ridge and end laps, and at every intermediate support. Drive them snug — an over-tightened washer leaks as surely as a loose one. Trim and side-lap stitch screws come on top of this count.
          </Callout>

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="29 ga Galvalume prices from McCoy's (San Marcos, TX), Oct 23, 2026; cut-to-length uses the same per-foot rate. Eave and rake trim vary by supplier — get a quote with the panels." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Metal roof",
            title,
            summary: `${fmtInt(orderQty)} × ${orderLen} ${p.short} panels${r.stock?.pieces === 2 ? ` (${cutNote})` : ""}, ${fmtInt(r.screws)} screws, ${r.ridgePieces} ${shed ? "high-side" : "ridge"} trim`,
            items,
          })}
        />
      }
    />
  );
}
