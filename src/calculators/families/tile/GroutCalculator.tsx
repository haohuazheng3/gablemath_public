"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { FieldSection, NumberField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { autoGrout, describePlan, groutNeed } from "./compute";
import { GROUTS, JOINT_OPTIONS, grout, tileFormat } from "./data";
import { ChipPicker, GroutSelect, JointPicker, MoreOptions, TileSizePicker, jointLabel } from "./parts";
import { GROUT_DEFAULTS, groutInputFrom, type GroutValues } from "./grout-model";

const CALC_KEY = "tile/grout-calculator";

export default function GroutCalculator({ initial }: { initial?: Partial<GroutValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, GROUT_DEFAULTS, initial);
  const i = useMemo(() => groutInputFrom(v), [v]);
  const r = useMemo(() => groutNeed(i), [i]);
  const g = r.grout;
  const f = tileFormat(v.size);
  const amount = r.lb != null ? `${fmt(r.lb, 1)} lb` : `${fmt(r.volWithExtraIn3, 0)} in³`;
  const byJoint = JOINT_OPTIONS.map((j) => ({ j, x: groutNeed({ ...i, jointIn: j.value, groutId: v.grout === "auto" ? autoGrout(j.value) : i.groutId }) }));
  const byGrout = GROUTS.map((gg) => ({ gg, x: groutNeed({ ...i, groutId: gg.id }) }));

  const items: ShoppingItem[] = r.plan.lines.map((l) => ({ id: `grout-${l.pack.amount}`, name: `${g.name} — ${l.pack.label}`, qty: l.count, unit: "units", cost: l.pack.price != null ? l.pack.price * l.count : undefined }));
  if (g.kind !== "epoxy" && g.kind !== "premixed") items.push({ id: "sealer", name: "Grout sealer", qty: 1, unit: "bottle", note: "cement grouts only, after curing" });
  const costLines: CostLine[] = r.plan.lines.filter((l) => l.pack.price != null).map((l) => ({ priceId: `tile-grout-${g.id}-${l.pack.amount}`, label: `${g.short} ${l.pack.label}`, qty: l.count, unit: "units", defaultPrice: l.pack.price! }));

  return (
    <CalcFrame
      dock={{ label: "Grout", value: `${describePlan(r.plan)}` }}
      inputs={
        <>
          <FieldSection title="Area and tile">
            <NumberField label="Area to grout" value={v.sqft} onChange={(sqft) => set({ sqft })} suffix="sq ft" step={5} min={0} max={100000} decimals={1} />
            <TileSizePicker
              value={v.size}
              onChange={(size) => {
                const nf = tileFormat(size);
                set({ size, t: nf.thickIn, joint: nf.jointIn });
              }}
            />
            {f.sheet ? <ChipPicker value={v.chip} onChange={(chip) => set({ chip })} /> : null}
            {f.id === "custom" ? (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Tile length" value={v.cl} onChange={(cl) => set({ cl })} suffix="in" step={0.25} min={0.5} max={96} decimals={2} />
                <NumberField label="Tile width" value={v.cw} onChange={(cw) => set({ cw })} suffix="in" step={0.25} min={0.5} max={96} decimals={2} />
              </div>
            ) : null}
            <NumberField label="Tile thickness" value={v.t} onChange={(t) => set({ t })} suffix="in" step={0.0625} min={0.1} max={1.5} decimals={3} help="The joint is as deep as the tile. 10 mm = 0.394 in; 8 mm = 0.315 in." />
          </FieldSection>
          <FieldSection title="Joint and grout">
            <JointPicker value={v.joint} onChange={(joint) => set({ joint })} />
            <MoreOptions label="Choose a grout product" defaultOpen={v.grout !== "auto"}>
              <GroutSelect value={v.grout} onChange={(gr) => set({ grout: gr })} autoLabel={grout(autoGrout(v.joint)).short} />
            </MoreOptions>
          </FieldSection>
        </>
      }
      results={
        <>
          <ResultHero label="You need" value={amount} unit={`of ${g.short}`} sub={<>Buy {describePlan(r.plan)} · joint volume {fmt(r.volIn3, 0)} in³ + 10%</>} />
          <StatGrid
            stats={[
              ...r.coverage.map((c) => ({ label: `One ${c.pack.label} covers`, value: fmtInt(c.sqft), unit: "sq ft", hint: `${f.label}, ${jointLabel(v.joint)} joint` })),
              { label: "Cost", value: r.plan.cost != null ? fmtMoney(r.plan.cost) : "—", hint: g.water ?? g.note },
            ]}
          />
          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          <ResultsHeading>Joint width changes everything</ResultsHeading>
          <OptionTable
            caption={`${fmt(v.sqft)} sq ft of ${f.label} by joint width`}
            columns={["Joint", "Grout", "Amount", "Buy"]}
            highlight={byJoint.findIndex((x) => x.j.value === v.joint)}
            rows={byJoint.map(({ j, x }) => [`${j.label} in`, x.grout.short, x.lb != null ? `${fmt(x.lb, 1)} lb` : `${fmt(x.volWithExtraIn3, 0)} in³`, describePlan(x.plan)])}
          />
          <ResultsHeading>Every grout for this job</ResultsHeading>
          <OptionTable
            caption="Cement, pre-mixed and epoxy grouts compared"
            columns={["Grout", "Joints", "Buy", "Cost"]}
            highlight={byGrout.findIndex((x) => x.gg.id === g.id)}
            rows={byGrout.map(({ gg, x }) => [gg.short, `${jointLabel(gg.jointMin)}–${jointLabel(gg.jointMax)}`, describePlan(x.plan), x.plan.cost != null ? fmtMoney(x.plan.cost) : "—"])}
          />
          <ShoppingList items={items} calcKey={CALC_KEY} />
          {costLines.length ? <CostLines lines={costLines} footnote="Floor & Decor prices checked October 2026." /> : null}
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({ calcKey: CALC_KEY, calcName: "Grout", title: `Grout for ${fmt(v.sqft)} sq ft of ${f.label}, ${jointLabel(v.joint)} joint`, summary: `${amount} of ${g.short}: ${describePlan(r.plan)}`, items })}
        />
      }
    />
  );
}
