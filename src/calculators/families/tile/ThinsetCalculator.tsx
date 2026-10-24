"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { FieldSection, NumberField, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { autoMortar, autoTrowel, needsBackButter, thinsetBags, tileDims } from "./compute";
import { CONTACT, MORTARS, TROWELS, TROWEL_PRICE, mortar, tileFormat, trowel } from "./data";
import { MoreOptions, MortarSelect, TileSizePicker, TrowelSelect } from "./parts";
import { THINSET_DEFAULTS, thinsetInputFrom, type ThinsetValues } from "./thinset-model";

const CALC_KEY = "tile/thinset-calculator";

export default function ThinsetCalculator({ initial }: { initial?: Partial<ThinsetValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, THINSET_DEFAULTS, initial);
  const i = useMemo(() => thinsetInputFrom(v), [v]);
  const r = useMemo(() => thinsetBags(i), [i]);
  const d = tileDims(v.size);
  const m = r.mortar;
  const unit = m.unit === "gal" ? "pails" : "bags";
  const byTrowel = TROWELS.map((t) => ({ t, x: thinsetBags({ ...i, trowelId: t.id }) }));
  const byMortar = MORTARS.map((mm) => ({ mm, x: thinsetBags({ ...i, mortarId: mm.id }) }));

  const items: ShoppingItem[] = [
    { id: "thinset", name: `${m.name}`, qty: r.bags, unit, cost: r.cost ?? undefined, note: `${trowel(i.trowelId).label}${v.bb ? ", back-buttered" : ""}` },
    { id: "trowel", name: `Notched trowel, ${trowel(i.trowelId).label}`, qty: 1, unit: "each", cost: TROWEL_PRICE },
  ];
  const costLines: CostLine[] = [
    ...(m.price != null ? [{ priceId: `tile-mortar-${m.id}`, label: m.short, qty: r.bags, unit, defaultPrice: m.price }] : []),
    { priceId: "tile-trowel", label: "Notched trowel", qty: 1, unit: "each", defaultPrice: TROWEL_PRICE },
  ];

  return (
    <CalcFrame
      dock={{ label: "Thinset", value: `${fmtInt(r.bags)} ${unit} of ${m.short}` }}
      inputs={
        <>
          <FieldSection title="Area and tile">
            <NumberField label="Area to tile" value={v.sqft} onChange={(sqft) => set({ sqft })} suffix="sq ft" step={10} min={0} max={100000} decimals={1} help="Length × width in feet. Walls: width × tiled height." />
            <TileSizePicker value={v.size} custom={false} onChange={(size) => set({ size, bb: needsBackButter(tileFormat(size).longIn) })} />
          </FieldSection>
          <FieldSection title="Trowel and mortar">
            <TrowelSelect value={v.trowel} onChange={(t) => set({ trowel: t })} autoLabel={trowel(autoTrowel(d)).label} />
            <MortarSelect value={v.mortar} onChange={(mm) => set({ mortar: mm })} autoLabel={mortar(autoMortar(d)).short} />
            <ToggleField label="Back-butter each tile" checked={v.bb} onChange={(bb) => set({ bb })} help="Required for tile over 15 in; adds a 1/32 in skim coat that coverage charts leave out." />
          </FieldSection>
          <MoreOptions label="Extra for mixing waste">
            <NumberField label="Extra" value={v.waste} onChange={(waste) => set({ waste })} suffix="%" step={5} min={0} max={30} decimals={0} help="10% covers mortar left in the bucket and skinned-over batches." />
          </MoreOptions>
        </>
      }
      results={
        <>
          <ResultHero
            label="You need"
            value={fmtInt(r.bags)}
            unit={`${unit} of ${m.short}`}
            sub={
              <>
                {fmt(r.cov, 0)} sq ft per {m.unit === "gal" ? "pail" : "bag"} with a {trowel(i.trowelId).label}
                {r.bbBags ? ` + ${fmt(r.bbBags, 2)} bag for back-buttering` : ""} · {fmtInt(r.weightLb)} lb to carry
              </>
            }
          />
          <StatGrid
            stats={[
              { label: "Exact amount", value: fmt(r.exact, 2), unit, hint: `${fmt(v.waste, 0)}% extra included` },
              { label: "Cost", value: r.cost != null ? fmtMoney(r.cost) : "—", hint: m.price != null ? `${fmtMoney(m.price, { cents: true })} per ${m.unit === "gal" ? "pail" : "bag"}` : "price varies" },
              { label: "Contact target", value: `${CONTACT.dry}% / ${CONTACT.wet}%`, hint: "dry interior / showers & outdoors" },
              { label: "Water per bag", value: m.waterQt ? `${fmt(m.waterQt[0], 1)}–${fmt(m.waterQt[1], 1)}` : "see bag", unit: m.waterQt ? "qt" : undefined },
            ]}
          />
          {r.basis !== "chart" ? <Callout tone="info">{m.short} publishes no rate for this trowel, so this uses {r.basis === "ratio" ? "its 1/4 in square-notch rate scaled by bed depth" : "the store-brand rate"} — treat it as an estimate.</Callout> : null}
          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
          <ResultsHeading>Same job, other trowels</ResultsHeading>
          <OptionTable
            caption={`${m.short}: ${unit} by trowel notch`}
            columns={["Trowel", "Sq ft / bag", unit[0].toUpperCase() + unit.slice(1)]}
            highlight={byTrowel.findIndex((x) => x.t.id === i.trowelId)}
            rows={byTrowel.map(({ t, x }) => [t.label, `${fmt(x.cov, 0)}${x.basis !== "chart" ? "*" : ""}`, fmtInt(x.bags)])}
          />
          <ResultsHeading>Same trowel, other brands</ResultsHeading>
          <OptionTable
            caption={`${trowel(i.trowelId).label}: minimum published coverage`}
            columns={["Mortar", "Sq ft each", "Qty", "Cost"]}
            highlight={byMortar.findIndex((x) => x.mm.id === m.id)}
            rows={byMortar.map(({ mm, x }) => [`${mm.short} (${mm.size} ${mm.unit})`, `${fmt(x.cov, 0)}${x.basis !== "chart" ? "*" : ""}`, fmtInt(x.bags), x.cost != null ? fmtMoney(x.cost) : "—"])}
          />
          <p className="text-[0.78rem] text-ink-3">* not published for this trowel — estimated. Lightweight 25–35 lb bags cover what a 50-lb bag does.</p>
          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Floor & Decor and Do it Best prices checked October 2026." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({ calcKey: CALC_KEY, calcName: "Thinset", title: `Thinset for ${fmt(v.sqft)} sq ft of ${tileFormat(v.size).label} tile`, summary: `${fmtInt(r.bags)} ${unit} of ${m.short}`, items })}
        />
      }
    />
  );
}
