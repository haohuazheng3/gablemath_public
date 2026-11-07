"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { FieldSection, NumberField, Segmented, SelectField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { backerPlan, describePlan } from "./compute";
import { BACKERS, BACKER_RULES, mortar } from "./data";
import { BACKER_DEFAULTS, backerInputFrom, type BackerValues } from "./backer-model";

const CALC_KEY = "tile/backer-board-calculator";

export default function BackerBoardCalculator({ initial }: { initial?: Partial<BackerValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, BACKER_DEFAULTS, initial);
  const i = useMemo(() => backerInputFrom(v), [v]);
  const r = useMemo(() => backerPlan(i), [i]);
  const b = r.backer;
  const all = BACKERS.filter((x) => i.surface === "floor" || !x.floorOnly).map((x) => ({ x, p: backerPlan({ ...i, backerId: x.id }) }));

  const items: ShoppingItem[] = [
    { id: "backer", name: `${b.name}, ${b.wFt}×${b.lFt} ft`, qty: r.sheets, unit: "sheets", cost: r.sheetCost ?? undefined },
    ...r.fastenerPlan.lines.map((l) => ({ id: `screws-${l.pack.amount}`, name: `${b.fastener === "cement" ? "1-1/4 in backer-board screws" : "Board fasteners"} — ${l.pack.label}`, qty: l.count, unit: "boxes", cost: l.pack.price != null ? l.pack.price * l.count : undefined })),
    ...r.tapePlan.lines.map((l) => ({ id: `tape-${l.pack.amount}`, name: `2 in alkali-resistant mesh tape — ${l.pack.label}`, qty: l.count, unit: "rolls", cost: l.pack.price != null ? l.pack.price * l.count : undefined })),
    ...(r.under ? [{ id: "under", name: "Modified thinset to bed the board (1/4 in square notch)", qty: r.under.bags, unit: "bags", cost: r.under.cost ?? undefined }] : []),
    ...(b.kind === "foam" ? [{ id: "seal", name: "Seam and fastener sealant/tape from the board maker", qty: 1, unit: "kit", note: "every seam and screw head is sealed" }] : []),
  ];
  const costLines: CostLine[] = [
    ...(b.price != null ? [{ priceId: `tile-backer-${b.id}`, label: b.short, qty: r.sheets, unit: "sheets", defaultPrice: b.price }] : []),
    ...r.fastenerPlan.lines.filter((l) => l.pack.price != null).map((l) => ({ priceId: `tile-screws-${l.pack.amount}`, label: `Fasteners, ${l.pack.label}`, qty: l.count, unit: "boxes", defaultPrice: l.pack.price! })),
    ...r.tapePlan.lines.filter((l) => l.pack.price != null).map((l) => ({ priceId: `tile-tape-${l.pack.amount}`, label: `Mesh tape, ${l.pack.label}`, qty: l.count, unit: "rolls", defaultPrice: l.pack.price! })),
    ...(r.under ? [{ priceId: "tile-mortar-basic-under", label: "Thinset under board", qty: r.under.bags, unit: "bags", defaultPrice: mortar("basic").price! }] : []),
  ];

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${fmtInt(r.sheets)} sheets of ${b.short}` }}
      inputs={
        <>
          <FieldSection title="Where is it going?">
            <Segmented
              label="Surface"
              value={v.surface}
              options={[
                { value: "floor", label: "Floor", sub: "8 in grid" },
                { value: "wall", label: "Walls / shower", sub: "into studs" },
              ]}
              onChange={(surface) => set({ surface, board: surface === "wall" && v.board.endsWith("-14") ? "hardie-500" : surface === "floor" ? "hardie-14" : v.board })}
            />
            <NumberField label="Area to cover" value={v.sqft} onChange={(sqft) => set({ sqft })} suffix="sq ft" step={5} min={0} max={100000} decimals={1} help="Floors: length × width. Walls: add each wall's width × height up to where tile stops." />
          </FieldSection>
          <FieldSection title="Board">
            <SelectField label="Backer board" value={v.board} onChange={(board) => set({ board })} options={BACKERS.map((x) => ({ value: x.id, label: `${x.short} · ${x.thickness} · ${x.wFt}×${x.lFt} ft`, group: x.kind === "cement" ? "Cement board" : "Foam board (waterproof)" }))} help={b.note} />
          </FieldSection>
        </>
      }
      results={
        <>
          <ResultHero label="You need" value={fmtInt(r.sheets)} unit={`sheets of ${b.short}`} sub={<>{fmt(r.sheetSqFt)} sq ft per sheet, 10% extra for cutouts{r.weightLb != null ? ` · ${fmtInt(r.weightLb)} lb total` : ""}</>} />
          <StatGrid
            stats={[
              { label: "Fasteners", value: fmtInt(r.fasteners), hint: `${r.perSheet} per full sheet · buy ${describePlan(r.fastenerPlan)}` },
              { label: b.kind === "cement" ? "Mesh tape" : "Seams", value: b.kind === "cement" ? fmtInt(r.tapeFt) : "seal", unit: b.kind === "cement" ? "ft" : undefined, hint: b.kind === "cement" ? describePlan(r.tapePlan) : "maker's sealant on every seam" },
              ...(r.under ? [{ label: "Thinset underneath", value: fmtInt(r.under.bags), unit: "bags", hint: "50 lb, 1/4 in square notch" }] : []),
              { label: "Cost", value: fmtMoney(r.cost), hint: r.sheetCost == null ? "board price varies" : undefined },
            ]}
          />
          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {i.surface === "floor" && b.kind === "cement" ? (
            <Callout tone="tip">Set floor board in a bed of modified thinset, then screw it every {BACKER_RULES.cementSpacingIn} in across the whole sheet. Leave a {BACKER_RULES.gapIn === 0.125 ? "1/8" : BACKER_RULES.gapIn} in gap between sheets and stagger the joints.</Callout>
          ) : i.surface === "wall" && b.kind === "cement" ? (
            <Callout tone="info">Cement board is not waterproof. In a shower, coat it with a liquid membrane or cover it with a sheet membrane before tiling.</Callout>
          ) : null}
          <ResultsHeading>Other boards for this area</ResultsHeading>
          <OptionTable
            caption="Sheets, fasteners and cost by board"
            columns={["Board", "Sheets", "Fasteners", "Cost"]}
            highlight={all.findIndex((x) => x.x.id === b.id)}
            rows={all.map(({ x, p }) => [`${x.short} (${x.wFt}×${x.lFt})`, fmtInt(p.sheets), fmtInt(p.fasteners), x.price != null ? fmtMoney(p.cost) : "—"])}
          />
          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Floor & Decor prices checked October 2026; wedi at August 2026 list." />
        </>
      }
      footer={
        <ActionBar shareUrl={shareUrl} onReset={reset} payload={() => ({ calcKey: CALC_KEY, calcName: "Backer board", title: `${b.short} for ${fmt(v.sqft)} sq ft of ${v.surface}`, summary: `${fmtInt(r.sheets)} sheets, ${fmtInt(r.fasteners)} fasteners`, items })} />
      }
    />
  );
}
