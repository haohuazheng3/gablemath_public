"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines } from "@/components/calc/CostLines";
import { FieldSection, NumberField, Segmented, SelectField, ToggleField } from "@/components/calc/fields";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { FT_PER_M, LB_PER_KG, formatFeetInches } from "@/lib/units";
import { bagsSummary, computeFence, type PostKind } from "./compute";
import {
  GROUND_CLEARANCE_IN,
  HOLE,
  PICKET_WIDTHS_IN,
  POST_MIXES,
  POST_SPECS,
  STYLES,
  VINYL_CENTERS_6FT_IN,
  VINYL_CENTERS_8FT_IN,
  installed,
  type FenceStyle,
} from "./data";
import { FENCE_DEFAULTS, FENCE_STYLE_IDS, fenceInputFrom, fenceStyle, styleDefaults, type FenceValues } from "./fence-model";
import { FenceLayout } from "./FenceLayout";
import { LayoutFields } from "./LayoutFields";
import { costLines, shoppingItems } from "./material-lines";

const CALC_KEY = "fence/fence-calculator";

const HEIGHTS: Record<FenceStyle, number[]> = {
  privacy: [4, 5, 6, 7, 8],
  bob: [4, 5, 6, 7, 8],
  picket: [3, 4, 5],
  panel: [4, 6, 8],
  vinyl: [4, 5, 6, 8],
};

const POST_NAMES: Record<PostKind, string> = { line: "line", corner: "corner", end: "end", gate: "gate" };

export default function FenceCalculator({ initial }: { initial?: Partial<FenceValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, FENCE_DEFAULTS, initial);
  const { system } = useUnits();
  const [more, setMore] = useState(false);
  const r = useMemo(() => computeFence(fenceInputFrom(v)), [v]);
  const altMix = POST_MIXES[v.mix === "cm80" ? "fs50" : "cm80"];
  const alt = useMemo(() => computeFence(fenceInputFrom({ ...v, mix: altMix.id })), [v, altMix.id]);
  const style = fenceStyle(v);
  const spec = STYLES[style];
  const stick = style === "privacy" || style === "bob" || style === "picket";
  const isVinyl = style === "vinyl";
  const metric = system === "metric";
  const mix = POST_MIXES[v.mix === "cm80" ? "cm80" : "fs50"];
  const lengthLabel = (ft: number) => (metric ? `${fmt(ft / FT_PER_M, 1)} m` : formatFeetInches(ft));
  const inch = (n: number) => (metric ? `${fmt(n * 2.54, 0)} cm` : `${fmt(n, 1)} in`);
  const hole = (dia: number, depth: number) => (metric ? `${fmt(dia * 2.54, 0)} × ${fmt(depth * 2.54, 0)} cm` : `${fmt(dia, 1)} × ${fmt(depth, 1)} in`);
  const L = r.layout.totalFt;

  const heroValue = stick ? fmtInt(r.pickets?.withWaste ?? 0) : fmtInt(r.panels);
  const heroUnit = stick ? `pickets (${fmt(v.pw, 1)} in × ${r.pickets?.lengthFt ?? v.h} ft)` : `${isVinyl ? "vinyl" : "wood"} panels`;
  const items = shoppingItems(r.materials);
  const lines = costLines(r.materials);
  const pro = installed(style === "picket" ? "wood-picket" : isVinyl ? "vinyl" : "wood-privacy");
  const title = `${spec.label} fence, ${lengthLabel(L)} × ${fmt(v.h)} ft`;
  const concreteNote = bagsSummary(r.posts);

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${heroValue} ${stick ? "pickets" : "panels"} · ${r.layout.posts} posts` }}
      inputs={
        <>
          <FieldSection title="Fence type">
            <Segmented
              label="Style"
              columns={3}
              value={style}
              options={FENCE_STYLE_IDS.map((id) => ({ value: id, label: STYLES[id].short }))}
              onChange={(id) => set(styleDefaults(id))}
              help={spec.blurb}
            />
            <Segmented label="Height" columns={HEIGHTS[style].length} value={v.h} options={HEIGHTS[style].map((h) => ({ value: h, label: `${h} ft` }))} onChange={(h) => set({ h })} />
            {stick ? (
              <Segmented
                label="Post spacing"
                value={v.sp}
                options={[
                  { value: 6, label: "6 ft", sub: "stiffer, windy sites" },
                  { value: 8, label: "8 ft", sub: "standard max" },
                ]}
                onChange={(sp) => set({ sp })}
                help="On center. Home Depot's install sheet caps wood fence posts at 8 ft apart; each side is divided evenly."
              />
            ) : isVinyl ? (
              <Segmented
                label="Panel width"
                value={v.vc < 84 ? 6 : 8}
                options={[
                  { value: 6, label: "6 ft panels", sub: `~${VINYL_CENTERS_6FT_IN} in centers` },
                  { value: 8, label: "8 ft panels", sub: `${VINYL_CENTERS_8FT_IN} in centers` },
                ]}
                onChange={(w) => set({ vc: w === 6 ? VINYL_CENTERS_6FT_IN : VINYL_CENTERS_8FT_IN })}
                help="Post centers = panel width + post width. Check your panel's instructions and set the exact figure below."
              />
            ) : null}
          </FieldSection>

          <LayoutFields v={v} set={set} metric={metric} walkHelp="The opening between gate posts. 48 in fits a mower or wheelbarrow comfortably." />

          <div>
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-[0.99]"
            >
              {stick ? "Pickets, rails, posts & concrete" : "Posts, depth & concrete"}
              <span aria-hidden className={clsx("transition-transform duration-200", more && "rotate-180")}>
                ⌄
              </span>
            </button>
            {more ? (
              <div className="animate-rise mt-4 space-y-4">
                {stick ? (
                  <>
                    <Segmented
                      label="Picket width (actual)"
                      value={v.pw}
                      options={PICKET_WIDTHS_IN.map((w) => ({ value: w, label: `${w} in`, sub: `“1×${Math.round(w + 0.5)}”` }))}
                      onChange={(pw) => set({ pw })}
                      help="Lumber is sold by nominal size: a “1×6” picket is really 5/8 × 5-1/2 in."
                    />
                    {style === "bob" ? (
                      <NumberField
                        label="Overlap per edge"
                        value={v.ov}
                        onChange={(ov) => set({ ov })}
                        suffix="in"
                        step={0.25}
                        min={0}
                        max={3}
                        help={`1–1.5 in keeps it opaque after the boards shrink. Front-layer gap: ${inch(r.pickets?.frontGapIn ?? 0)}.`}
                      />
                    ) : (
                      <NumberField
                        label="Gap between pickets"
                        value={v.gap}
                        onChange={(gap) => set({ gap })}
                        suffix="in"
                        step={0.25}
                        min={0}
                        max={6}
                        help={style === "picket" ? "2-1/2 in is typical for picket fences." : "0 for a tight privacy fence; boards shrink, so small gaps appear anyway."}
                      />
                    )}
                    <Segmented
                      label="Wood"
                      value={v.wood}
                      options={[
                        { value: "pt", label: "Pressure-treated", sub: "pine" },
                        { value: "cedar", label: "Cedar", sub: "naturally rot-resistant" },
                      ]}
                      onChange={(wood) => set({ wood })}
                    />
                    <Segmented
                      label="Rails per section"
                      columns={4}
                      value={v.rails}
                      options={[
                        { value: 0, label: "Auto", sub: `${r.railsPerSection} rails` },
                        { value: 2, label: "2" },
                        { value: 3, label: "3" },
                        { value: 4, label: "4" },
                      ]}
                      onChange={(rails) => set({ rails })}
                      help="Auto keeps rails no more than 24 in apart: 2 up to 4 ft, 3 for 5–6 ft, 4 for 7–8 ft."
                    />
                    <NumberField label="Extra pickets for waste" value={v.waste} onChange={(waste) => set({ waste })} suffix="%" step={5} min={0} max={30} decimals={0} help="10% covers split, warped and badly knotted boards." />
                  </>
                ) : null}
                {isVinyl ? (
                  <NumberField label="Exact post centers" value={v.vc} onChange={(vc) => set({ vc })} suffix="in" step={0.5} min={36} max={120} decimals={1} help="Catalyst/Veranda 8-ft Premium panels on 5×5 posts: 97 in." />
                ) : (
                  <ToggleField label="6×6 gate posts" checked={v.gp6} onChange={(gp6) => set({ gp6 })} help="A swinging gate levers on its post; 6×6 posts in 12 in holes resist the twist better than 4×4s." />
                )}
                <Segmented
                  label="Hole diameter"
                  columns={5}
                  value={v.hole}
                  options={[0, 8, 10, 12, 14].map((d) => ({ value: d, label: d ? `${d} in` : "Auto", sub: d ? undefined : isVinyl ? "10 in" : "10 · 12 in" }))}
                  onChange={(hole) => set({ hole })}
                  help={`Auto follows the install sheets: 10 in for ${isVinyl ? "5×5 vinyl posts (Catalyst)" : "4×4s (Home Depot) and 12 in for 6×6 gate posts"}. Quikrete's rule of thumb is 3× the post width.`}
                />
                <Segmented
                  label="Post depth in the ground"
                  columns={3}
                  value={v.emb}
                  options={[0, 24, 30, 36, 42, 48].map((d) => ({ value: d, label: d ? `${d} in` : "Auto", sub: d ? undefined : `${r.autoEmbedIn} in` }))}
                  onChange={(emb) => set({ emb })}
                  help={`Auto buries a third of the post — half its height above ground. Holes are ${isVinyl ? HOLE.vinylGravelIn : HOLE.woodGravelIn} in deeper for gravel.`}
                />
                <NumberField label="Local frost depth" value={v.frost} onChange={(frost) => set({ frost })} suffix="in" step={6} min={0} max={100} decimals={0} help="Optional. Posts go at least this deep; gate posts 6 in deeper. Your building department publishes it." />
                <SelectField
                  label="Setting the posts"
                  value={v.set}
                  onChange={(method) => set({ set: method })}
                  options={[
                    { value: "concrete", label: "Concrete in every hole" },
                    { value: "mixed", label: "Concrete at ends, corners & gates; gravel at line posts" },
                    { value: "gravel", label: "Tamped gravel in every hole" },
                  ]}
                  help="Concrete is standard. Some builders set line posts in tamped gravel for drainage; ends, corners and gates carry the most load, so they stay in concrete."
                />
                <Segmented
                  label="Concrete"
                  value={v.mix}
                  options={[
                    { value: "fs50", label: "Fast-Setting 50 lb", sub: "dry-pour · 0.375 ft³" },
                    { value: "cm80", label: "Concrete Mix 80 lb", sub: "mix first · 0.60 ft³" },
                  ]}
                  onChange={(m) => set({ mix: m })}
                />
              </div>
            ) : null}
          </div>
        </>
      }
      results={
        <>
          <ResultHero
            label="You need"
            value={heroValue}
            unit={heroUnit}
            sub={
              <>
                {fmtInt(r.layout.posts)} posts · {stick ? `${fmtInt(r.railBoards + r.gateFrameBoards)} rails · ` : ""}
                {fmtInt(r.concrete.bags)} × {mix.lb}-lb bags of concrete for {lengthLabel(L)} of fence
                {stick && r.pickets ? ` (${fmt(r.pickets.perFt, 2)} pickets per foot, ${fmt(v.waste, 0)}% extra included)` : ""}
              </>
            }
          />
          <div className="rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            <FenceLayout layout={r.layout} metric={metric} names={POST_NAMES} />
          </div>
          <StatGrid
            stats={[
              { label: "Posts", value: fmtInt(r.layout.posts), hint: postBreakdown(r.layout.counts) },
              stick
                ? { label: "Rails (2×4×8)", value: fmtInt(r.railBoards + r.gateFrameBoards), hint: `${r.railsPerSection} per section${r.gateFrameBoards ? ` + ${r.gateFrameBoards} for gates` : ""}` }
                : { label: "Sections", value: fmtInt(r.layout.sections), hint: "one panel each" },
              { label: "Concrete", value: fmtInt(r.concrete.bags), unit: `× ${mix.lb} lb`, hint: concreteNote || "posts set in gravel" },
              stick
                ? {
                    label: "Post spacing",
                    value: lengthLabel(Math.max(0, ...r.layout.runs.map((x) => x.spacing))),
                    hint: r.layout.runs.length > 1 ? "widest side; each side divided evenly" : "on center, divided evenly",
                  }
                : { label: "Post centers", value: lengthLabel(r.spacingFt), hint: "full panels; cut the last one on each side" },
            ]}
          />

          <ResultsHeading>Posts to buy</ResultsHeading>
          <OptionTable
            caption="Posts by type"
            columns={["Post", "Buy", "Hole", "Fill"]}
            rows={r.posts.map((p) => [
              `${cap(p.kind)} × ${p.count}`,
              p.size === "vinyl" ? `5×5, ≥ ${lengthLabel(p.minLengthFt)}` : `${POST_SPECS[p.size].label} × ${p.stockFt} ft${p.special ? " (special order)" : ""}`,
              hole(p.holeIn, p.holeDepthIn),
              p.setIn === "concrete" ? `${p.bagsEach} bag${p.bagsEach === 1 ? "" : "s"}` : "gravel",
            ])}
          />
          <p className="-mt-1 text-[0.78rem] leading-snug text-ink-3">
            Each post goes {inch(r.embedIn)} into the ground on {inch(isVinyl ? HOLE.vinylGravelIn : HOLE.woodGravelIn)} of gravel
            {isVinyl ? "" : `, so a ${fmt(v.h)}-ft fence needs posts at least ${lengthLabel(v.h + r.embedIn / 12)} long`}. Concrete stops {inch(HOLE.capIn)} below grade so
            soil or sod can cover it.
          </p>

          <div className="rounded-[18px] border border-line p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[0.95rem] font-semibold text-ink">
                Concrete: {fmtInt(r.concrete.bags)} × {mix.lb}-lb {mix.short}
              </h3>
              <span className="num text-[0.78rem] text-ink-3">
                {metric ? `${fmt(r.concrete.cuft / 35.3147, 2)} m³` : `${fmt(r.concrete.cuft, 1)} ft³ · ${fmt(r.concrete.cuyd, 2)} yd³`}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5 text-[0.86rem] leading-relaxed text-ink-2">
              <li>
                Counted hole by hole: {concreteNote || "no concrete-set posts"}. {mix.dryPour ? "Dry-poured bags can't be split between holes, so each post rounds up." : `Mixing in a wheelbarrow and carrying leftovers to the next hole, ${fmtInt(r.concrete.pooledBags)} bags cover the same volume.`}
              </li>
              <li>
                Water: {mix.dryPour ? `about ${fmtInt(r.concrete.waterGal[0])} gal (1 gal poured over each 50-lb bag)` : `${fmtInt(r.concrete.waterGal[0])}–${fmtInt(r.concrete.waterGal[1])} gal (6–9 pints per 80-lb bag)`}. Weight to haul:{" "}
                {metric ? `${fmtInt(r.concrete.weightLb / LB_PER_KG)} kg` : `${fmtInt(r.concrete.weightLb)} lb`}.
              </li>
              <li>
                Filling the hole to the top with no gravel or soil cap would take {fmtInt(r.fullHoleBagsLine)} bags per line post — that is why bag counts online disagree.
              </li>
              <li>Wait {mix.loadAfter} before hanging rails, panels or gates on the posts.</li>
              {alt.concrete.bags > 0 ? (
                <li>
                  With {altMix.lb}-lb {altMix.short} instead: {fmtInt(alt.concrete.bags)} bags, about {fmtMoney(alt.concrete.bags * altMix.price)} versus{" "}
                  {fmtMoney(r.concrete.bags * mix.price)}
                  {v.mix === "cm80" ? " — dearer, but no mixing and posts take strain after 4 hours." : " — cheaper per yard, but it must be mixed first and cures for 24 hours."}
                </li>
              ) : null}
            </ul>
            <p className="mt-2 text-[0.8rem] text-ink-3">
              Different hole size or a single post? Use the{" "}
              <Link href="/concrete/post-hole-calculator" className="font-semibold text-accent">
                post hole concrete calculator
              </Link>
              .
            </p>
          </div>

          {stick && r.pickets ? (
            <div className="rounded-[18px] border border-line p-4">
              <h3 className="text-[0.95rem] font-semibold text-ink">Pickets: {fmtInt(r.pickets.withWaste)}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                <Fact label="Fence sections" value={fmtInt(r.pickets.net)} />
                <Fact label="Gate leaves" value={fmtInt(r.pickets.gate)} />
                <Fact label={`Spare (${fmt(v.waste, 0)}%)`} value={fmtInt(r.pickets.withWaste - r.pickets.total)} />
                <Fact label="On center" value={inch(r.pickets.pitchIn)} />
              </dl>
              <p className="mt-2 text-[0.84rem] leading-relaxed text-ink-2">
                {style === "bob"
                  ? `Two layers: back boards on ${inch(r.pickets.pitchIn * 2)} centers, front boards over the ${inch(r.pickets.frontGapIn ?? 0)} gaps.`
                  : style === "picket"
                    ? `${fmt(v.pw, 1)}-in boards with ${fmt(v.gap, 2)}-in gaps.`
                    : `Boards butted edge to edge — ${fmt(r.pickets.perFt, 2)} per foot, ${fmtInt(Math.ceil((8 * 12) / r.pickets.pitchIn - 1e-9))} per 8-ft section.`}{" "}
                Keep the bottoms {GROUND_CLEARANCE_IN} in off the ground so they don&apos;t wick up water.
              </p>
            </div>
          ) : null}

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          <Callout tone="info" title="Before you dig">
            Call 811 (free) a few days ahead to have buried utilities marked. Confirm the property line and set posts a few inches inside it, and check permit, zoning and HOA height rules —
            front-yard limits are often lower than backyard ones.{" "}
            {v.frost > 0 ? `Posts are set to your ${v.frost}-in frost depth.` : "In cold climates, ask your building department for the local frost depth and enter it above — posts that stop short of it can heave."}
          </Callout>
          {style === "picket" ? (
            <Callout tone="tip" title="Fencing a pool?">
              CPSC pool-barrier guidance asks for at least 48 in of height and gaps no wider than 1-3/4 in when the rails are less than 45 in apart (climbable) — a typical picket fence with 2-1/2 in gaps
              doesn&apos;t qualify. Local pool codes govern.
            </Callout>
          ) : null}
          {!stick && !isVinyl ? (
            <Callout tone="tip" title="Not all 6×8 panels are equal">
              Panels sold as 6×8 carry anywhere from 18 to 28 pickets of different widths and thicknesses. Compare picket count and thickness, not just price — and remember posts are sold separately.
            </Callout>
          ) : null}
          {isVinyl ? (
            <Callout tone="tip" title="Vinyl gate posts">
              Gate posts need an aluminum stiffener insert, sold separately (Catalyst). In high-wind code areas such as Florida, solid vinyl may need extra wind-rated parts — check your local product approval.
            </Callout>
          ) : null}

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={lines} footnote={`Typical U.S. big-box prices, checked October 2026; posts and pickets are 2026 snapshots. ${r.unpriced.length ? `Not in the total: ${r.unpriced.join(", ").toLowerCase()}.` : ""}`} />

          <div className="rounded-[18px] border border-line p-4">
            <h3 className="text-[0.95rem] font-semibold text-ink">Hiring it out instead?</h3>
            <p className="mt-1.5 text-[0.86rem] leading-relaxed text-ink-2">
              Installed {pro.name.toLowerCase()} fences run about ${pro.perLf[0]}–${pro.perLf[1]} per foot ({pro.source}) — roughly{" "}
              <strong className="text-ink">
                {fmtMoney(pro.perLf[0] * L)}–{fmtMoney(pro.perLf[1] * L)}
              </strong>{" "}
              for {lengthLabel(L)}, against about {fmtMoney(r.materialCost)} in materials above.{" "}
              <Link href="/fence/fence-cost-calculator" className="font-semibold text-accent">
                Compare materials, gates and removal →
              </Link>
            </p>
          </div>
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Fence materials",
            title,
            summary: `${stick ? `${fmtInt(r.pickets?.withWaste ?? 0)} pickets` : `${fmtInt(r.panels)} panels`}, ${fmtInt(r.layout.posts)} posts, ${fmtInt(r.concrete.bags)} bags of concrete`,
            items,
          })}
        />
      }
    />
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function postBreakdown(c: Record<PostKind, number>) {
  return (["line", "corner", "end", "gate"] as PostKind[])
    .filter((k) => c[k] > 0)
    .map((k) => `${c[k]} ${k}`)
    .join(" · ");
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.74rem] text-ink-3">{label}</dt>
      <dd className="num text-[0.88rem] font-semibold text-ink">{value}</dd>
    </div>
  );
}
