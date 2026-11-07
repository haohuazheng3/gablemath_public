"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { FieldSection, LengthField, NumberField, Segmented } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { CUFT_PER_CUM, formatFeetInches } from "@/lib/units";
import { computePostHoles } from "./compute";
import { BAGS_PER_PALLET, GRAVEL_BAG_CUFT, POST_RULES, POST_TYPES, product } from "./data";
import { PostHoleSection } from "./diagrams";
import { MixFields, MoreOptions, ProductTimeline } from "./parts";
import { POST_DEFAULTS, embedFor, holeDiaFor, postInputFrom, postLabel, postType, postWidthIn, type PostValues } from "./post-model";

const CALC_KEY = "concrete/post-hole-calculator";
const CM_PER_IN = 2.54;

const BASES = [
  { value: "gravel", label: "6 in gravel", sub: "drains" },
  { value: "drymix", label: "6 in dry mix", sub: "1101 method" },
  { value: "none", label: "None", sub: "post on soil" },
];

const BASE_HELP: Record<string, string> = {
  gravel: "Quikrete's how-to: 6 in of gravel under the post lets water drain away from the end grain.",
  drymix: "Quikrete Concrete Mix sheet: 6 in of dry mix in the bottom, then the post, then mixed concrete. The plug counts as concrete.",
  none: "Quikrete Fast-Setting sheet: stand the post on the hole bottom and pour the dry mix around it.",
};

export default function PostHoleCalculator({ initial }: { initial?: Partial<PostValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, POST_DEFAULTS, initial);
  const { system } = useUnits();
  const input = useMemo(() => postInputFrom(v), [v]);
  const r = useMemo(() => computePostHoles(input), [input]);
  const p = product(v.product);
  const pt = postType(v);
  const o = r.order;
  const size = o.bagSize;
  const sizeLabel = `${size}-lb`;
  const metric = system === "metric";
  const width = postWidthIn(v);
  const postName = postLabel(v);
  const title = `Concrete for ${v.count > 1 ? `${v.count} × ` : ""}${postName} post${v.count > 1 ? "s" : ""}, ${fmt(input.embedIn, 1)} in deep`;
  const vol = (cuft: number) => (metric ? `${fmt((cuft * 1000) / CUFT_PER_CUM, 0)} L` : `${fmt(cuft, 2)} ft³`);
  const unitPrice = o.bagsBySize.find((b) => b.size === size)?.price;
  const pallet = BAGS_PER_PALLET[size];
  const savings = [input.base === "gravel" && input.baseIn > 0 ? "The gravel base" : "", v.cap > 0 ? `${input.base === "gravel" ? "the" : "The"} soil cap` : ""].filter(Boolean);

  const items: ShoppingItem[] = [
    { id: "bags", name: `${p.short} — ${sizeLabel} bags`, qty: o.bags, unit: "bags", cost: o.bagCost, note: `${fmt(r.bagsPerPost, 1)} bags per post + ${fmt(o.wastePct, 0)}% extra` },
    ...(r.gravelBags ? [{ id: "gravel", name: `All-purpose gravel, ${GRAVEL_BAG_CUFT} cu ft bags (${fmt(v.baseIn, 1)} in per hole)`, qty: r.gravelBags, unit: "bags", note: `${fmt(r.gravelCuft, 2)} cu ft in all` }] : []),
    {
      id: "water",
      name: r.dryPour ? "Water to soak the dry mix" : "Clean water for mixing",
      qty: Math.ceil(r.waterGal[1]),
      unit: "gal",
      note: r.dryPour ? "about 1 gal per 50 lb bag, depending on the soil" : `${fmt(r.waterGal[0], 0)}–${fmt(r.waterGal[1], 0)} gal; start low, never exceed the max`,
    },
  ];

  const costLines: CostLine[] =
    unitPrice != null
      ? [{ priceId: `concrete-${p.id}-${size}`, label: `${sizeLabel} ${p.short}`, qty: o.bags, unit: "bags", defaultPrice: unitPrice, note: pallet && o.bags >= pallet && p.bulkPrice?.[size] ? `Pallet price applied (${pallet}+ bags)` : undefined }]
      : [];

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${fmtInt(o.bags)} × ${sizeLabel} bags` }}
      inputs={
        <>
          <FieldSection title="Your posts">
            <Segmented label="Post size" columns={5} value={pt.id} options={POST_TYPES.map((t) => ({ value: t.id, label: t.label, sub: t.sub }))} onChange={(post) => set({ post })} help="Lumber is smaller than its name: a 4×4 measures 3½ in, a 6×6 measures 5½ in." />
            {pt.id === "round" ? <LengthField base="in" label="Post diameter" value={v.dia} onChange={(dia) => set({ dia })} hint="steel pipe or pole" /> : null}
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Number of posts" value={v.count} onChange={(count) => set({ count: Math.max(1, Math.round(count)) })} step={1} min={1} max={1000} decimals={0} />
              <LengthField label="Height above ground" value={v.above} onChange={(above) => set({ above })} />
            </div>
          </FieldSection>

          <FieldSection title="The hole">
            <div className="grid grid-cols-2 gap-3">
              <LengthField
                base="in"
                label="Post depth in ground"
                value={embedFor(v)}
                onChange={(embed) => set({ embed })}
                hint={v.embed > 0 ? <ResetLink onClick={() => set({ embed: 0 })}>⅓ rule</ResetLink> : "⅓ of length"}
              />
              <LengthField
                base="in"
                label="Hole diameter"
                value={holeDiaFor(v)}
                onChange={(hole) => set({ hole })}
                hint={v.hole > 0 ? <ResetLink onClick={() => set({ hole: 0 })}>3× post</ResetLink> : "3× post"}
              />
            </div>
            <Segmented label="Bottom of the hole" columns={3} value={v.base} options={BASES} onChange={(base) => set({ base })} help={BASE_HELP[v.base]} />
          </FieldSection>

          <FieldSection title="Concrete">
            <MixFields productId={v.product} bag={v.bag} waste={v.waste} onChange={set} wasteHelp="10% covers holes that come out wider than planned and spillage." />
          </FieldSection>

          <MoreOptions label="Base layer & soil cap">
            {v.base !== "none" ? <NumberField label="Base layer depth" value={v.baseIn} onChange={(baseIn) => set({ baseIn })} suffix="in" step={1} min={0} max={24} decimals={1} help="Quikrete uses 6 in; Sakrete's sheets call for 3–6 in of gravel." /> : null}
            <NumberField
              label="Stop concrete below grade"
              value={v.cap}
              onChange={(cap) => set({ cap })}
              suffix="in"
              step={1}
              min={0}
              max={12}
              decimals={1}
              help="Quikrete fills to 3–4 in below ground and tops the hole with soil or sod. Use 0 for concrete flush with the surface, sloped away from the post."
            />
          </MoreOptions>
        </>
      }
      results={
        <>
          <ResultHero
            label="You need"
            value={fmtInt(o.bags)}
            unit={`× ${sizeLabel} bags`}
            sub={
              <>
                {p.short}: {fmt(r.bagsPerPost, 1)} bags per post × {fmtInt(v.count)} {v.count === 1 ? "post" : "posts"}, plus {fmt(o.wastePct, 0)}% extra · {fmtInt(o.weightLb)} lb to carry
              </>
            }
          />
          <div className="flex justify-center rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            <PostHoleSection holeDiaIn={r.holeDiaIn} holeDepthIn={r.holeDepthIn} embedIn={input.embedIn} baseIn={v.baseIn} base={input.base} capIn={v.cap} postWIn={width} aboveFt={v.above} />
          </div>
          <StatGrid
            stats={[
              { label: "Concrete per post", value: vol(r.cuftPerPost), hint: `${fmt(r.bagsPerPost, 2)} × ${sizeLabel} bags, before waste` },
              metric
                ? { label: "Hole", value: `${fmt(r.holeDiaIn * CM_PER_IN, 0)} × ${fmt(r.holeDepthIn * CM_PER_IN, 0)}`, unit: "cm", hint: `wide × deep · ${vol(r.soilCuft)} of soil to dig out` }
                : { label: "Hole", value: `${fmt(r.holeDiaIn, 1)} × ${fmt(r.holeDepthIn, 1)}`, unit: "in", hint: `wide × deep · ${vol(r.soilCuft)} of soil to dig out` },
              { label: "Post length", value: formatFeetInches(r.postLengthIn / 12), hint: "above ground + buried; buy the next length up" },
              {
                label: r.dryPour ? "Water (dry pour)" : "Mixing water",
                value: r.dryPour ? fmt(r.waterGal[0], 0) : `${fmt(r.waterGal[0], 0)}–${fmt(r.waterGal[1], 0)}`,
                unit: "gal",
                hint: r.dryPour ? "≈1 gal per 50 lb bag, soil dependent" : "start low; max weakens the concrete",
              },
            ]}
          />

          <ResultsHeading>Fast-Setting or Concrete Mix?</ResultsHeading>
          <OptionTable
            caption="Bags by product for this job"
            columns={["Mix", "Per post", "Total", "Est. cost"]}
            highlight={r.mixes.findIndex((m) => m.productId === p.id && m.size === size)}
            rows={r.mixes.map((m) => [`${m.productId === "fast" ? "Fast-Setting" : "Concrete Mix"} ${m.size} lb`, fmt(m.perPost, 1), fmtInt(m.total), m.cost != null ? fmtMoney(m.cost) : "—"])}
          />
          {savings.length && r.concreteDepthIn > 0 ? (
            <Callout tone="info" title="Why the bag label says more">
              Filled to the brim with no gravel and no soil cap — the way bag labels and Quikrete&apos;s online calculator count — each hole would take {fmtInt(r.fullDepthBagsPerPost)} × {sizeLabel} bags. {savings.join(" and ")}{" "}
              {savings.length > 1 ? "bring" : "brings"} it down to {fmt(r.bagsPerPost, 1)}.
            </Callout>
          ) : null}

          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          <Callout tone="tip" title="Frost line & structural posts">
            The hole bottom is {fmt(r.holeDepthIn, 1)} in below grade. For a fence, burying a third of the post is the manufacturer rule. Posts that hold up a structure — a deck, pergola or carport — must reach at least{" "}
            {POST_RULES.belowFrostIn} in below your local frost line and follow local code; your building department can give you the frost depth. Call 811 before you dig.
          </Callout>

          <ProductTimeline p={p} title={r.dryPour ? "Fast-Setting: pour dry, add water" : `Timeline for ${p.short.toLowerCase()}`} />

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Typical U.S. big-box prices checked October 2026. Tap any price to enter your store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Post hole concrete",
            title,
            summary: `${fmtInt(o.bags)} × ${sizeLabel} ${p.short} for ${fmtInt(v.count)} ${v.count === 1 ? "post" : "posts"} (${fmt(r.bagsPerPost, 1)} per post)`,
            items,
          })}
        />
      }
    />
  );
}

function ResetLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="font-semibold text-accent active:scale-95">
      use {children}
    </button>
  );
}
