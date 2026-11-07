"use client";

import { useMemo, useState } from "react";
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
import { FT_PER_M, formatFeetInches } from "@/lib/units";
import { BASEBOARD_DEFAULTS, MAX_ROOMS, baseboardInputFrom, baseboardRooms, type BaseboardValues } from "./baseboard-model";
import { computeBaseboard } from "./compute";
import { BASEBOARD, BASE_HEIGHTS, QUARTER_ROUND } from "./data";
import { CutList } from "./plans";
import { ProCost } from "./ProCost";

const CALC_KEY = "flooring/baseboard-calculator";
const L_KEYS = ["l1", "l2", "l3", "l4", "l5", "l6"] as const;
const W_KEYS = ["w1", "w2", "w3", "w4", "w5", "w6"] as const;

export default function BaseboardCalculator({ initial }: { initial?: Partial<BaseboardValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, BASEBOARD_DEFAULTS, initial);
  const { system } = useUnits();
  const [rev, setRev] = useState(0);
  const input = useMemo(() => baseboardInputFrom(v), [v]);
  const r = useMemo(() => computeBaseboard(input), [input]);
  const rooms = baseboardRooms(v);
  const metric = system === "metric";
  const stock = input.stockFt;
  const lf = (ft: number, d = 0) => (metric ? `${fmt(ft / FT_PER_M, 1)} m` : `${fmt(ft, d)} ft`);

  const setDim = (key: (typeof L_KEYS)[number] | (typeof W_KEYS)[number], value: number) => set({ [key]: value } as Partial<BaseboardValues>);

  function removeRoom(index: number) {
    const dims = rooms.filter((_, i) => i !== index);
    const patch: Record<string, number> = { rooms: dims.length };
    dims.forEach((d, i) => {
      patch[L_KEYS[i]] = d.l;
      patch[W_KEYS[i]] = d.w;
    });
    set(patch as Partial<BaseboardValues>);
  }

  const paintText = [r.gallons ? `${r.gallons} gal` : "", r.quarts ? `${r.quarts} qt` : ""].filter(Boolean).join(" + ") || "—";
  const title = `Baseboard for ${rooms.map((a) => `${formatFeetInches(a.l)} × ${formatFeetInches(a.w)}`).join(" + ")}`;

  const items: ShoppingItem[] = [
    { id: "baseboard", name: `Baseboard, ${stock} ft lengths`, qty: r.pieces, unit: "pieces", cost: r.baseCost, note: `${fmt(r.netLf, 0)} linear ft + ${fmt(input.wastePct, 0)}% for copes and miters` },
    ...(r.qrPieces ? [{ id: "quarter-round", name: "Quarter round / shoe, 8 ft", qty: r.qrPieces, unit: "pieces", cost: r.qrPieces * QUARTER_ROUND.paint.price }] : []),
    { id: "nails", name: "Finish nails (2 per stud)", qty: r.nails, unit: "nails", note: "15- or 16-gauge, long enough to reach the studs" },
    ...(r.caulkTubes ? [{ id: "caulk", name: "Paintable caulk, 10.1 oz", qty: r.caulkTubes, unit: "tubes", cost: r.caulkTubes * BASEBOARD.caulkPrice, note: "top edge, 3/16 in bead" }] : []),
    ...(r.gallons ? [{ id: "paint-gal", name: "Semi-gloss trim paint, gallon", qty: r.gallons, unit: "gal", cost: r.gallons * BASEBOARD.gallonPrice }] : []),
    ...(r.quarts ? [{ id: "paint-qt", name: "Semi-gloss trim paint, quart", qty: r.quarts, unit: "qt", cost: r.quarts * BASEBOARD.quartPrice }] : []),
  ];

  const costLines: CostLine[] = [
    { priceId: `baseboard-mdf-${stock}ft`, label: `MDF baseboard, ${stock} ft`, qty: r.pieces, unit: "pieces", defaultPrice: Math.round(BASEBOARD.pricePerLf * stock * 100) / 100, note: "MDF typically $1.00–$1.40 per linear ft" },
    ...(r.qrPieces ? [{ priceId: "qr-paint-96", label: "Quarter round, 8 ft", qty: r.qrPieces, unit: "pieces", defaultPrice: QUARTER_ROUND.paint.price }] : []),
    ...(r.caulkTubes ? [{ priceId: "caulk-10oz", label: "Paintable caulk", qty: r.caulkTubes, unit: "tubes", defaultPrice: BASEBOARD.caulkPrice }] : []),
    ...(r.gallons ? [{ priceId: "paint-semigloss-gal", label: "Trim paint, gallon", qty: r.gallons, unit: "gal", defaultPrice: BASEBOARD.gallonPrice }] : []),
    ...(r.quarts ? [{ priceId: "paint-semigloss-qt", label: "Trim paint, quart", qty: r.quarts, unit: "qt", defaultPrice: BASEBOARD.quartPrice }] : []),
  ];

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${fmtInt(r.pieces)} × ${stock} ft` }}
      inputs={
        <>
          <FieldSection title="Rooms">
            {rooms.map((a, i) =>
              i === 0 ? (
                <div key={i} className="grid grid-cols-2 gap-3">
                  <LengthField label="Length" value={a.l} onChange={(l) => setDim("l1", l)} />
                  <LengthField label="Width" value={a.w} onChange={(w) => setDim("w1", w)} />
                </div>
              ) : (
                <div key={i} className="animate-rise rounded-[16px] border border-line bg-surface-2 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[0.8rem] font-semibold text-ink-2">Room {i + 1}</span>
                    <button type="button" onClick={() => removeRoom(i)} className="rounded-full px-2 py-0.5 text-[0.76rem] font-semibold text-ink-3 hover:text-bad">
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
            {rooms.length < MAX_ROOMS ? (
              <button
                type="button"
                onClick={() => set({ rooms: rooms.length + 1 })}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong text-[0.86rem] font-semibold text-ink-2 transition hover:border-accent hover:text-accent active:scale-[0.99]"
              >
                + Add a room or closet
              </button>
            ) : null}
          </FieldSection>

          <FieldSection title="Openings & extras">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Door openings" value={v.doors} onChange={(doors) => set({ doors: Math.max(0, Math.round(doors)) })} step={1} min={0} max={40} decimals={0} />
              <NumberField label="Opening width" value={v.doorW} onChange={(doorW) => set({ doorW })} suffix="in" step={1} min={12} max={240} decimals={0} stepper={false} />
            </div>
            <p className="-mt-2 text-[0.78rem] leading-snug text-ink-3">Measure openings casing to casing. A door between two rooms you&apos;re trimming counts twice — once for each side.</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="No baseboard" value={v.skip} onChange={(skip) => set({ skip })} suffix="ft" step={1} min={0} max={500} decimals={1} stepper={false} />
              <NumberField label="Extra wall" value={v.extra} onChange={(extra) => set({ extra })} suffix="ft" step={1} min={0} max={500} decimals={1} stepper={false} />
            </div>
            <p className="-mt-2 text-[0.78rem] leading-snug text-ink-3">No baseboard: cabinets, tubs, built-ins. Extra wall: closet returns, jogs and bump-outs the rectangles miss.</p>
            <NumberField label="Outside corners" value={v.outside} onChange={(outside) => set({ outside: Math.max(0, Math.round(outside)) })} step={1} min={0} max={40} decimals={0} help="Corners that stick out into the room, like a hallway jog or a chimney bump-out." />
          </FieldSection>

          <FieldSection title="Stock & finish">
            <Segmented
              label="Piece length"
              columns={3}
              value={stock}
              options={BASEBOARD.stockFt.map((ft) => ({ value: ft, label: `${ft} ft` }))}
              onChange={(s) => set({ stock: s })}
              help="Longer pieces mean fewer splices; 8 ft fits in most cars."
            />
            <NumberField label="Extra for copes & miters" value={v.waste} onChange={(waste) => set({ waste })} suffix="%" step={5} min={0} max={40} decimals={0} />
            <ToggleField label="Caulk and paint" checked={v.paint} onChange={(paint) => set({ paint })} />
            {v.paint ? (
              <div className="animate-rise space-y-4">
                <Segmented label="Baseboard height" value={v.height} options={BASE_HEIGHTS} onChange={(height) => set({ height })} />
                <Segmented
                  label="Coats"
                  value={v.coats}
                  options={[
                    { value: 1, label: "1 coat" },
                    { value: 2, label: "2 coats" },
                  ]}
                  onChange={(coats) => set({ coats })}
                />
              </div>
            ) : null}
            <ToggleField label="Add quarter round" checked={v.qr} onChange={(qr) => set({ qr })} help="Covers the expansion gap when baseboards stay in place over a new floor." />
          </FieldSection>
        </>
      }
      results={
        <>
          <ResultHero
            label="You need"
            value={fmtInt(r.pieces)}
            unit={`× ${stock} ft pieces`}
            sub={
              <>
                {lf(r.netLf)} of wall + {fmt(input.wastePct, 0)}% for copes and miters = {lf(r.buyLf)} ·{" "}
                {r.plan.splices ? `${r.plan.splices} scarf joint${r.plan.splices === 1 ? "" : "s"}` : "no splices on any wall"}
              </>
            }
          />
          <div className="rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            <div className="mb-2 text-[0.78rem] font-semibold text-ink-2">Cut list — each bar is one {stock} ft stick</div>
            <CutList plan={r.plan} stockFt={stock} />
            {r.pieces > r.plan.sticks.length ? (
              <p className="mt-2 text-[0.76rem] text-ink-3">
                Plus {r.pieces - r.plan.sticks.length} spare stick{r.pieces - r.plan.sticks.length === 1 ? "" : "s"} from the {fmt(input.wastePct, 0)}% allowance for re-cuts.
              </p>
            ) : null}
          </div>
          <StatGrid
            cols={3}
            stats={[
              { label: "Linear feet", value: metric ? fmt(r.netLf / FT_PER_M, 1) : fmt(r.netLf, 1), unit: metric ? "m" : "ft", hint: "walls minus openings" },
              { label: "Inside corners", value: fmtInt(r.insideCorners), hint: "cope or miter" },
              { label: "Outside corners", value: fmtInt(r.outsideCorners), hint: "miter both pieces" },
              { label: "Finish nails", value: fmtInt(r.nails), hint: "2 per stud, 16 in apart" },
              { label: "Caulk", value: v.paint ? fmtInt(r.caulkTubes) : "—", unit: v.paint ? "tubes" : undefined, hint: "55 ft per tube" },
              { label: "Paint", value: v.paint ? paintText : "—", hint: v.paint ? `${fmt(r.paintSqft, 0)} sq ft × ${v.coats}` : "not included" },
            ]}
          />

          <ResultsHeading>Which length to buy</ResultsHeading>
          <OptionTable
            caption="Baseboard pieces by stock length"
            columns={["Length", "Pieces", "Splices", "Offcuts", "Cost"]}
            highlight={r.options.findIndex((o) => o.stockFt === stock)}
            rows={r.options.map((o) => [`${o.stockFt} ft`, fmtInt(o.pieces), fmtInt(o.splices), lf(o.offcutFt), fmtMoney(o.cost)])}
          />

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {r.insideCorners > 0 ? (
            <Callout tone="tip" title="Cope the inside corners">
              Run one piece square into the corner and cope the other to its profile; a coped joint hides small gaps better than a miter when the corner isn&apos;t square. Miter outside corners at 45° and join long walls with a scarf joint.
            </Callout>
          ) : null}
          {v.qr ? (
            <Callout tone="info" title="Quarter round on a floating floor">
              Nail quarter round to the baseboard, not down into the floor, so a floating floor can still expand under it.
            </Callout>
          ) : null}

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <div onChange={() => setRev((n) => n + 1)} onClick={() => setRev((n) => n + 1)}>
            <CostLines lines={costLines} footnote="MDF: Angi 2026 range. Caulk and Sherwin-Williams Emerald semi-gloss: online prices, October 2026. Tap any price to enter your store's." />
          </div>
          <ProCost
            rev={rev}
            lines={costLines}
            labor={[{ label: "Installation labor", detail: `${fmt(r.netLf, 0)} linear ft × ${fmtMoney(v.labor, { cents: true })}`, amount: r.laborCost }]}
            inputs={<NumberField label="Labor per linear ft" value={v.labor} onChange={(labor) => set({ labor })} prefix="$" step={0.25} decimals={2} stepper={false} />}
            footnote="Labor: Angi 2026 ($5–$7.75 per linear ft). Painting and removing old trim are usually quoted separately."
          />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Baseboard",
            title,
            summary: `${fmtInt(r.pieces)} × ${stock} ft baseboard (${fmt(r.netLf, 0)} linear ft + ${fmt(input.wastePct, 0)}%)`,
            items,
          })}
        />
      }
    />
  );
}
