"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines } from "@/components/calc/CostLines";
import { FieldSection, NumberField, Segmented, ToggleField } from "@/components/calc/fields";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { FT_PER_M, LB_PER_KG, formatFeetInches } from "@/lib/units";
import { CHAIN_LINK_DEFAULTS, chainLinkInputFrom, type ChainLinkValues } from "./chain-link-model";
import { computeChainLink, type ChainLinkPosts, type PostKind } from "./compute";
import { CHAIN_LINK, CHAIN_LINK_HEIGHTS, POOL, POST_MIXES, installed } from "./data";
import { FenceLayout } from "./FenceLayout";
import { LayoutFields } from "./LayoutFields";
import { costLines, shoppingItems } from "./material-lines";

const CALC_KEY = "fence/chain-link-fence-calculator";
const POST_NAMES: Record<PostKind, string> = { line: "line", corner: "corner", end: "end", gate: "gate" };
const PRO = installed("chain-link");

export default function ChainLinkCalculator({ initial }: { initial?: Partial<ChainLinkValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, CHAIN_LINK_DEFAULTS, initial);
  const { system } = useUnits();
  const [more, setMore] = useState(false);
  const r = useMemo(() => computeChainLink(chainLinkInputFrom(v)), [v]);
  const metric = system === "metric";
  const mix = POST_MIXES[v.mix === "cm80" ? "cm80" : "fs50"];
  const lengthLabel = (ft: number) => (metric ? `${fmt(ft / FT_PER_M, 1)} m` : formatFeetInches(ft));
  const inch = (n: number) => (metric ? `${fmt(n * 2.54, 0)} cm` : `${fmt(n, 1)} in`);
  const hole = (dia: number, depth: number) => (metric ? `${fmt(dia * 2.54, 0)} × ${fmt(depth * 2.54, 0)} cm` : `${fmt(dia, 1)} × ${fmt(depth, 1)} in`);
  const heightLabel = v.h === 3.5 ? "42-in" : `${fmt(v.h)}-ft`;
  const f = r.fittings;
  const items = shoppingItems(r.materials);
  const lines = costLines(r.materials);
  const terminals = r.terminal.count + r.gatePosts.count;
  const L = r.layout.totalFt;

  const postRow = (name: string, p: ChainLinkPosts, od: string) => [`${name} × ${p.count}`, `${od} OD, ${lengthLabel(p.minLengthIn / 12)}+`, hole(p.holeIn, p.holeDepthIn), `${p.bagsEach}`];

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${fmtInt(r.rolls)} rolls · ${fmtInt(r.layout.posts)} posts` }}
      inputs={
        <>
          <FieldSection title="Fabric">
            <Segmented
              label="Fence height"
              columns={5}
              value={v.h}
              options={CHAIN_LINK_HEIGHTS.map((h) => ({ value: h, label: h === 3.5 ? "42 in" : `${h} ft` }))}
              onChange={(h) => set({ h })}
              help="Fabric is sold by height in 50-ft rolls. 4 ft is the most common residential height."
            />
            <NumberField
              label="Line post spacing (max)"
              value={v.sp}
              onChange={(sp) => set({ sp })}
              suffix="ft"
              step={0.5}
              min={4}
              max={12}
              decimals={1}
              help="10 ft on center is the maximum (Lowe's, Merchants Metals). Each side is divided evenly — 31 ft becomes four 7 ft 9 in spans."
            />
          </FieldSection>

          <LayoutFields v={v} set={set} metric={metric} walkHelp="Chain-link gates are sold by opening — the space between the inside faces of the two gate posts." />

          <div>
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-[0.99]"
            >
              Bottom wire, frost depth & concrete
              <span aria-hidden className={clsx("transition-transform duration-200", more && "rotate-180")}>
                ⌄
              </span>
            </button>
            {more ? (
              <div className="animate-rise mt-4 space-y-4">
                <ToggleField label="Bottom tension wire" checked={v.tw} onChange={(tw) => set({ tw })} help="Stretched along the bottom and hog-ringed to the fabric every 24 in so pets can't push under." />
                <NumberField
                  label="Local frost depth"
                  value={v.frost}
                  onChange={(frost) => set({ frost })}
                  suffix="in"
                  step={6}
                  min={0}
                  max={100}
                  decimals={0}
                  help="Optional. Posts go at least this deep; gate posts 6 in deeper. Default holes: 30 in for terminals, 24 in for line posts."
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
            value={fmtInt(r.rolls)}
            unit={`× ${heightLabel} × 50-ft rolls`}
            sub={
              <>
                {lengthLabel(r.fabricFt)} of fabric (gate openings left out, {lengthLabel(r.leftoverFt)} spare) · {fmtInt(r.topRailPieces)} top rails · {fmtInt(terminals)} terminal and{" "}
                {fmtInt(r.line.count)} line posts · {fmtInt(r.concrete.bags)} bags of concrete
              </>
            }
          />
          <div className="rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            <FenceLayout layout={r.layout} metric={metric} names={POST_NAMES} />
            <p className="mt-2 text-center text-[0.74rem] text-ink-3">End, corner and gate posts are all 2-3/8 in terminal posts.</p>
          </div>
          <StatGrid
            stats={[
              { label: "Terminal posts", value: fmtInt(terminals), hint: `${r.layout.counts.end} end · ${r.layout.counts.corner} corner · ${r.layout.counts.gate} gate` },
              { label: "Line posts", value: fmtInt(r.line.count), hint: `${lengthLabel(Math.max(0, ...r.layout.runs.map((x) => x.spacing)))} on center` },
              { label: "Top rail", value: fmtInt(r.topRailPieces), unit: "pcs", hint: "10 ft 6 in swedged" },
              { label: "Concrete", value: fmtInt(r.concrete.bags), unit: `× ${mix.lb} lb`, hint: `${r.terminal.bagsEach} per terminal · ${r.line.bagsEach} per line post` },
            ]}
          />

          <ResultsHeading>Posts</ResultsHeading>
          <OptionTable
            caption="Chain-link posts"
            columns={["Post", "Size", "Hole", "Bags"]}
            rows={[
              ...(r.terminal.count ? [postRow("End & corner", r.terminal, "2-3/8 in")] : []),
              ...(r.gatePosts.count ? [postRow("Gate", r.gatePosts, "2-3/8 in")] : []),
              ...(r.line.count ? [postRow("Line", r.line, "1-5/8 in")] : []),
            ]}
          />
          <p className="-mt-1 text-[0.78rem] leading-snug text-ink-3">
            Terminal posts stand {CHAIN_LINK.terminalAboveIn} in above the fabric and line posts {CHAIN_LINK.lineBelowIn} in below it (Merchants Metals), each on {inch(CHAIN_LINK.gravelIn)} of
            gravel with concrete stopping {inch(CHAIN_LINK.capIn)} below grade. Set terminals first, then string a line between them for the line posts.
          </p>

          <ResultsHeading>Fittings for {heightLabel} fabric</ResultsHeading>
          <OptionTable
            caption="Chain-link fittings"
            columns={["Fitting", "Qty", "Where it goes"]}
            rows={[
              ["Tension bars", fmtInt(f.tensionBars), "1 per end & gate post, 2 per corner"],
              ["Tension bands", fmtInt(f.tensionBands), `${f.bandsPerBar} on each tension bar`],
              ["Brace bands", fmtInt(f.braceBands), "hold the rail end cups"],
              ["Rail end cups", fmtInt(f.railEndCups), "1 per tension bar"],
              ["Carriage bolts 5/16 × 1-1/4", fmtInt(f.carriageBolts), "1 per band"],
              ["Dome caps", fmtInt(f.terminalCaps), "terminal posts"],
              ["Loop caps", fmtInt(f.loopCaps), "line posts (top rail runs through)"],
              ["Fabric ties", fmtInt(f.lineTies + f.railTies), "every 12 in on line posts, 24 in on rail"],
              ...(f.tensionWireFt ? [["Tension wire / hog rings", `${fmtInt(f.tensionWireFt)} ft / ${fmtInt(f.hogRings)}`, "along the bottom"]] : []),
              ...(f.postHinges ? [["Hinges (post + frame)", `${fmtInt(f.postHinges)} + ${fmtInt(f.frameHinges)}`, "2 per walk gate, 4 per drive gate"]] : []),
              ...(f.latches ? [["Latches / drop rods", `${fmtInt(f.latches)} / ${fmtInt(f.dropRods)}`, "fork latch on walk gates"]] : []),
            ]}
          />

          <div className="rounded-[18px] border border-line p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[0.95rem] font-semibold text-ink">
                Concrete: {fmtInt(r.concrete.bags)} × {mix.lb}-lb {mix.short}
              </h3>
              <span className="num text-[0.78rem] text-ink-3">{metric ? `${fmt(r.concrete.cuft / 35.3147, 2)} m³` : `${fmt(r.concrete.cuft, 1)} ft³`}</span>
            </div>
            <p className="mt-2 text-[0.86rem] leading-relaxed text-ink-2">
              {r.terminal.bagsEach} bag{r.terminal.bagsEach === 1 ? "" : "s"} per terminal post in an {inch(r.terminal.holeIn)} hole and {r.line.bagsEach} per line post in a{" "}
              {inch(r.line.holeIn)} hole, counted hole by hole. Water: {mix.dryPour ? `about ${fmtInt(r.concrete.waterGal[0])} gal` : `${fmtInt(r.concrete.waterGal[0])}–${fmtInt(r.concrete.waterGal[1])} gal`}; weight{" "}
              {metric ? `${fmtInt(r.concrete.weightLb / LB_PER_KG)} kg` : `${fmtInt(r.concrete.weightLb)} lb`}. Quikrete says to keep strain off the posts for {mix.loadAfter}, so let the
              concrete cure before you stretch the fabric.
            </p>
          </div>

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          <Callout tone="info" title="Before you dig">
            Call 811 (free) to have buried utilities marked, confirm the property line and set posts about {CHAIN_LINK.propertyInsetIn} in inside it (Master Halco). Check permit and HOA rules,
            and {v.frost > 0 ? `posts are set to your ${v.frost}-in frost depth.` : "in cold climates enter your local frost depth so the posts reach below it."}
          </Callout>
          <Callout tone="tip" title="Sloped yard or a pool?">
            Where the ground rises or falls more than {CHAIN_LINK.slopeInPer100Ft} in per 100 ft, add a corner-post assembly at the grade change. For a pool barrier, CPSC limits chain-link mesh to{" "}
            {POOL.chainLinkMeshIn} in square (or slats that close openings to 1-3/4 in) and the fence to at least {POOL.minHeightIn} in tall — standard residential mesh is larger.
          </Callout>

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines
            lines={lines}
            footnote={`Framework prices seen at independent hardware stores on Oct 23, 2026 (big-box is often lower). Fabric is an estimate — enter your store's roll price. Not in the total: fittings, ties, tension wire and gates.`}
          />

          <div className="rounded-[18px] border border-line p-4">
            <h3 className="text-[0.95rem] font-semibold text-ink">Hiring it out instead?</h3>
            <p className="mt-1.5 text-[0.86rem] leading-relaxed text-ink-2">
              Installed chain link runs about ${PRO.perLf[0]}–${PRO.perLf[1]} per foot ({PRO.source}) — roughly{" "}
              <strong className="text-ink">
                {fmtMoney(PRO.perLf[0] * L)}–{fmtMoney(PRO.perLf[1] * L)}
              </strong>{" "}
              for {lengthLabel(L)}, plus ${PRO.walkGate![0]}–${PRO.walkGate![1]} per walk gate.{" "}
              <Link href="/fence/fence-cost-calculator" className="font-semibold text-accent">
                Compare with wood and vinyl →
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
            calcName: "Chain link fence",
            title: `Chain link fence, ${lengthLabel(L)} × ${heightLabel}`,
            summary: `${fmtInt(r.rolls)} rolls, ${fmtInt(r.topRailPieces)} top rails, ${fmtInt(terminals)} terminal + ${fmtInt(r.line.count)} line posts, ${fmtInt(r.concrete.bags)} bags of concrete`,
            items,
          })}
        />
      }
    />
  );
}
