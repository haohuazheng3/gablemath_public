"use client";

import { clsx } from "clsx";
import { useId, useMemo, useState } from "react";
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
import { SQFT_PER_SQM, formatFeetInches } from "@/lib/units";
import { carpetLayout, computeCarpet, inchFraction } from "./compute";
import { CARPET_DEFAULTS, carpetInputFrom, type CarpetValues } from "./carpet-model";
import { CARPET, PAD_THICKNESS, ROLL_WIDTHS } from "./data";
import { CarpetPlan, StairStrip } from "./plans";
import { ProCost } from "./ProCost";

const CALC_KEY = "flooring/carpet-calculator";

export default function CarpetCalculator({ initial }: { initial?: Partial<CarpetValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, CARPET_DEFAULTS, initial);
  const { system } = useUnits();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [more, setMore] = useState(false);
  const [rev, setRev] = useState(0);
  const input = useMemo(() => carpetInputFrom(v), [v]);
  const r = useMemo(() => computeCarpet(input), [input]);
  const metric = system === "metric";
  const hasRoom = v.mode !== "stairs";
  const hasStairs = v.mode !== "room";
  const rollLabel = formatFeetInches(input.rollFt);
  const layout = r.layout;

  const options = useMemo(() => {
    if (!input.room) return [];
    const { l, w } = input.room;
    const orientations = l === w ? (["length"] as const) : (["length", "width"] as const);
    return ROLL_WIDTHS.flatMap((roll) => orientations.map((along) => carpetLayout(l, w, roll.value, along, input.trimIn)));
  }, [input.room, input.trimIn]);

  const title = [hasRoom ? `${formatFeetInches(v.l)} × ${formatFeetInches(v.w)} room` : "", hasStairs ? `${fmtInt(v.steps)} stairs` : ""].filter(Boolean).join(" + ");
  const padLabel = PAD_THICKNESS.find((t) => t.value === v.padIn)?.label ?? inchFraction(v.padIn);

  const items: ShoppingItem[] = [
    {
      id: "carpet",
      name: `Carpet, ${rollLabel} roll`,
      qty: Math.round(r.orderSqyd * 10) / 10,
      unit: "sq yd",
      cost: r.carpetCost,
      note: `${fmt(r.linearFt, 1)} linear ft off the roll${layout && layout.seams ? ` · ${layout.seams} seam${layout.seams === 1 ? "" : "s"}` : ""}`,
    },
    ...(r.padSqft > 0 ? [{ id: "pad", name: `Carpet pad, ${padLabel}`, qty: Math.round((r.padSqft / 9) * 10) / 10, unit: "sq yd", cost: r.padCost }] : []),
    ...(r.tackStripLf > 0 ? [{ id: "tack", name: "Tack strip", qty: Math.ceil(r.tackStripLf), unit: "linear ft", note: r.doubledTackLf ? `includes ${fmt(r.doubledTackLf, 0)} ft of second row on walls over 30 ft` : "not across door openings" }] : []),
    ...(layout && layout.seamLf > 0 ? [{ id: "seam-tape", name: "Hot-melt seam tape", qty: Math.ceil(layout.seamLf), unit: "linear ft" }] : []),
    ...(hasRoom && input.doors > 0 ? [{ id: "transitions", name: "Carpet transition strips (to hard floor)", qty: Math.round(input.doors), unit: "doorways", note: `${fmt(input.doorWidthIn, 0)} in openings` }] : []),
  ];

  const costLines: CostLine[] = [
    { priceId: "carpet-sqyd", label: `Carpet (${rollLabel} roll)`, qty: Math.round(r.orderSqyd * 100) / 100, unit: "sq yd", defaultPrice: Math.round(CARPET.pricePerSqft * 9 * 100) / 100, note: "typical $2.79–$5.89 per sq ft at Home Depot" },
    ...(r.padSqft > 0 ? [{ priceId: "carpet-pad-sqyd", label: `Pad ${padLabel}`, qty: Math.round((r.padSqft / 9) * 100) / 100, unit: "sq yd", defaultPrice: Math.round(CARPET.padPerSqft * 9 * 100) / 100 }] : []),
  ];

  const sqydUnit = metric ? "m²" : "sq yd";
  const shownOrder = metric ? r.orderSqft / SQFT_PER_SQM : r.orderSqyd;

  return (
    <CalcFrame
      dock={{ label: "Order", value: `${fmt(shownOrder, 1)} ${sqydUnit}` }}
      inputs={
        <>
          <FieldSection title="What are you carpeting?">
            <Segmented
              label="Job"
              columns={3}
              value={v.mode}
              options={[
                { value: "room", label: "Room" },
                { value: "stairs", label: "Stairs" },
                { value: "both", label: "Room + stairs" },
              ]}
              onChange={(mode) => set({ mode })}
            />
            {hasRoom ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <LengthField label="Room length" value={v.l} onChange={(l) => set({ l })} />
                  <LengthField label="Room width" value={v.w} onChange={(w) => set({ w })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Doorways" value={v.doors} onChange={(doors) => set({ doors: Math.max(0, Math.round(doors)) })} step={1} min={0} max={10} decimals={0} />
                  <NumberField label="Doorway width" value={v.doorW} onChange={(doorW) => set({ doorW })} suffix="in" step={2} min={12} max={144} decimals={0} stepper={false} />
                </div>
              </>
            ) : null}
            {hasStairs ? (
              <div className="animate-rise space-y-3">
                <NumberField label="Steps" value={v.steps} onChange={(steps) => set({ steps: Math.max(0, Math.round(steps)) })} step={1} min={0} max={40} decimals={0} hint="count the treads" />
                <div className="grid grid-cols-3 gap-3">
                  <NumberField label="Width" value={v.stairW} onChange={(stairW) => set({ stairW })} suffix="in" step={1} min={12} max={96} decimals={1} stepper={false} />
                  <NumberField label="Tread" value={v.tread} onChange={(tread) => set({ tread })} suffix="in" step={0.5} min={6} max={14} decimals={2} stepper={false} />
                  <NumberField label="Riser" value={v.riser} onChange={(riser) => set({ riser })} suffix="in" step={0.25} min={4} max={9} decimals={2} stepper={false} />
                </div>
              </div>
            ) : null}
          </FieldSection>

          <FieldSection title="Roll">
            <Segmented
              label="Roll width"
              columns={3}
              value={input.rollFt}
              options={ROLL_WIDTHS}
              onChange={(roll) => set({ roll })}
              help="Shaw: most carpet is made 12 ft wide, some styles 15 ft. 13 ft 6 in is less common — check the style's label."
            />
          </FieldSection>

          <div>
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-[0.99]"
            >
              Seam direction, trim & pad
              <span aria-hidden className={clsx("transition-transform duration-200", more && "rotate-180")}>
                ⌄
              </span>
            </button>
            {more ? (
              <div className="animate-rise mt-4 space-y-4">
                {hasRoom ? (
                  <Segmented
                    label="Roll runs along"
                    columns={3}
                    value={input.orient}
                    options={[
                      { value: "auto", label: "Best fit" },
                      { value: "length", label: "Length" },
                      { value: "width", label: "Width" },
                    ]}
                    onChange={(orient) => set({ orient })}
                    help="Seams run the same way as the roll. Keep them parallel to foot traffic and out of doorways."
                  />
                ) : null}
                <NumberField label="Trim allowance per cut end" value={v.trim} onChange={(trim) => set({ trim })} suffix="in" step={1} min={0} max={12} decimals={1} />
                <ToggleField label="Include pad" checked={v.pad} onChange={(pad) => set({ pad })} />
                {v.pad ? (
                  <Segmented
                    label="Pad thickness"
                    columns={3}
                    value={v.padIn}
                    options={PAD_THICKNESS}
                    onChange={(padIn) => set({ padIn })}
                    help="CRI 105 caps residential pad at 7/16 in; Shaw's warranty allows up to 1/2 in."
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
            label="Order"
            value={fmt(shownOrder, 1)}
            unit={`${sqydUnit} of carpet`}
            sub={
              <>
                {fmt(r.linearFt, 1)} linear ft off a {rollLabel} roll · {fmt(r.orderSqft, 0)} sq ft
                {layout ? ` · ${layout.seams === 0 ? "no seams" : `${layout.seams} seam${layout.seams === 1 ? "" : "s"}`}` : ""} · {fmt(r.wastePct, 0)}% ends up as offcuts
              </>
            }
          />
          <div className="flex flex-col items-center gap-3 rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            {input.room && layout ? <CarpetPlan uid={uid} room={input.room} layout={layout} /> : null}
            {r.stairs ? <StairStrip stairs={r.stairs} rollFt={input.rollFt} stairWidthIn={v.stairW} /> : null}
          </div>
          <StatGrid
            stats={[
              { label: hasRoom ? "Area to cover" : "Stairs, net", value: metric ? fmt(r.netSqft / SQFT_PER_SQM, 1) : fmt(r.netSqft / 9, 1), unit: metric ? "m²" : "sq yd", hint: `${fmt(r.netSqft, 0)} sq ft to cover` },
              { label: "Roll length", value: fmt(r.linearFt, 1), unit: "linear ft", hint: `${rollLabel} wide` },
              { label: "Pad", value: fmt(r.padSqft / 9, 1), unit: "sq yd", hint: v.pad ? padLabel : "not included" },
              { label: "Tack strip", value: fmtInt(Math.ceil(r.tackStripLf)), unit: "ft", hint: hasRoom ? "walls minus doorways" : "room not included" },
            ]}
          />

          {options.length ? (
            <>
              <ResultsHeading>Every roll width and direction</ResultsHeading>
              <OptionTable
                caption="Carpet to order by roll width and orientation"
                columns={["Roll · runs", "Drops", "Seams", "Sq yd", "Offcuts"]}
                highlight={options.findIndex((o) => layout && o.rollFt === layout.rollFt && o.runAlong === layout.runAlong)}
                rows={options.map((o) => [
                  `${formatFeetInches(o.rollFt)} · ${formatFeetInches(o.runAlong === "length" ? v.l : v.w)}`,
                  fmtInt(o.drops),
                  fmtInt(o.seams),
                  fmt(o.sqyd, 1),
                  `${fmt(((o.sqft - v.l * v.w) / o.sqft) * 100, 0)}%`,
                ])}
              />
              <p className="-mt-2 text-[0.74rem] text-ink-3">Only some styles come in 13 ft 6 in or 15 ft widths — ask before you pick one.</p>
            </>
          ) : null}

          {r.stairs ? (
            <div className="rounded-[18px] border border-line p-4">
              <h3 className="text-[0.95rem] font-semibold text-ink">Stairs: {fmtInt(r.stairs.steps)} steps</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <dt className="text-[0.74rem] text-ink-3">Piece per step</dt>
                  <dd className="text-[0.88rem] font-semibold text-ink">
                    {fmt(v.stairW, 1)} × {fmt(r.stairs.pieceIn, 1)} in
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.74rem] text-ink-3">Across the roll</dt>
                  <dd className="text-[0.88rem] font-semibold text-ink">
                    {fmtInt(r.stairs.across)} per row · {fmtInt(r.stairs.rows)} rows
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.74rem] text-ink-3">Carpet bought per step</dt>
                  <dd className="text-[0.88rem] font-semibold text-ink">{fmt(r.stairs.sqft / Math.max(1, r.stairs.steps), 1)} sq ft</dd>
                </div>
                <div>
                  <dt className="text-[0.74rem] text-ink-3">Covered per step</dt>
                  <dd className="text-[0.88rem] font-semibold text-ink">{fmt(r.stairs.netSqft / Math.max(1, r.stairs.steps), 1)} sq ft</dd>
                </div>
              </dl>
              <p className="mt-3 text-[0.84rem] leading-relaxed text-ink-2">
                Each piece wraps the tread, the nose and the riser with the pile running down the stairs, as most manufacturers recommend. CRI 105 asks for a nose rounded 3/4–1 in so the carpet bends without cracking.
              </p>
            </div>
          ) : null}

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          {v.pad && v.padIn > CARPET.padMaxCriIn ? (
            <Callout tone="warn" title="Pad thicker than CRI 105 allows">
              CRI 105 caps residential cushion at 7/16 in. Shaw allows up to 1/2 in, but some carpet warranties don&apos;t — check yours before buying a 1/2 in pad.
            </Callout>
          ) : null}
          <Callout tone="tip" title="Let it acclimate">
            CRI 105 recommends unrolling carpet and pad in the room for at least 24 hours at 65–95°F before installing.
          </Callout>

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <div onChange={() => setRev((n) => n + 1)} onClick={() => setRev((n) => n + 1)}>
            <CostLines lines={costLines} footnote="Carpet: Home Depot LifeProof typical (cached 2026). Pad: Caldwell full-roll memory-foam rebond. Tap any price to enter your store's." />
          </div>
          <ProCost
            rev={rev}
            lines={costLines}
            labor={[
              ...(hasRoom ? [{ label: "Installation labor", detail: `${fmt(v.l * v.w, 0)} sq ft × ${fmtMoney(v.labor, { cents: true })}`, amount: r.roomLaborCost }] : []),
              ...(r.stairs ? [{ label: "Stair labor", detail: `${fmtInt(r.stairs.steps)} steps × ${fmtMoney(v.stairLabor, { cents: true })}`, amount: r.stairLaborCost }] : []),
              ...(v.removal && hasRoom ? [{ label: "Remove old carpet", detail: `${fmt(v.l * v.w, 0)} sq ft × ${fmtMoney(CARPET.removalPerSqft, { cents: true })}`, amount: r.removalCost }] : []),
            ]}
            inputs={
              <>
                <NumberField label="Labor per sq ft" value={v.labor} onChange={(labor) => set({ labor })} prefix="$" step={0.1} decimals={2} stepper={false} />
                <NumberField label="Extra per stair" value={v.stairLabor} onChange={(stairLabor) => set({ stairLabor })} prefix="$" step={1} decimals={2} stepper={false} />
                {hasRoom ? (
                  <div className="col-span-2">
                    <ToggleField label="Tear out old carpet" checked={v.removal} onChange={(removal) => set({ removal })} />
                  </div>
                ) : null}
              </>
            }
            footnote="This Old House (June 2026): labor $0.50–$1 per sq ft, stairs $11–$26 extra per step, removal $2–$3 per sq ft. “Free install” promos often exclude stairs, removal and furniture moving."
          />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Carpet",
            title: `Carpet for ${title}`,
            summary: `${fmt(r.orderSqyd, 1)} sq yd (${fmt(r.linearFt, 1)} linear ft of ${rollLabel} roll)`,
            items,
          })}
        />
      }
    />
  );
}
