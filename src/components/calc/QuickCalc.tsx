"use client";

import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { QUICK_DEFS } from "@/calculators/quick/defs";
import type { QField, QResult, QuickDef, QValues } from "@/calculators/quick/types";
import { ActionBar } from "./ActionBar";
import { CalcFrame } from "./CalcFrame";
import { CostLines } from "./CostLines";
import { FieldSection, LengthField, NumberField, Segmented, SelectField, ToggleField } from "./fields";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "./results";
import { ShoppingList } from "./ShoppingList";
import { useCalcState } from "./useCalcState";
import { useUnits } from "./units-context";

/** Renders any declarative quick tool (see calculators/quick) by its "category/slug" key. */
export default function QuickCalc({ toolKey, initial }: { toolKey: string; initial?: Partial<QValues> }) {
  const def = QUICK_DEFS[toolKey] as QuickDef<QValues>;
  const { values: v, set, reset, shareUrl } = useCalcState(def.key, def.defaults, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const [more, setMore] = useState(false);
  const r: QResult = useMemo(() => def.compute(v, { metric }), [def, v, metric]);

  const field = (f: QField<QValues>) => {
    if (f.showIf && !f.showIf(v)) return null;
    const k = `${f.key}:${f.label}`;
    const common = { label: f.label, help: f.help };
    switch (f.kind) {
      case "length":
        return <LengthField key={k} {...common} base={f.base} allowZero={f.allowZero} value={Number(v[f.key])} onChange={(x) => set({ [f.key]: x })} />;
      case "number":
        return (
          <NumberField
            key={k} {...common}
            value={Number(v[f.key])}
            onChange={(x) => set({ [f.key]: x })}
            prefix={f.prefix}
            suffix={f.suffix}
            step={f.step}
            min={f.min}
            max={f.max}
            decimals={f.decimals}
          />
        );
      case "select":
        return <SelectField key={k} {...common} value={String(v[f.key])} options={f.options} onChange={(x) => set({ [f.key]: x })} />;
      case "segmented":
        return <Segmented key={k} {...common} value={v[f.key] as string | number} options={f.options} columns={f.columns} onChange={(x) => set({ [f.key]: x })} />;
      case "toggle":
        return <ToggleField key={k} {...common} checked={Boolean(v[f.key])} onChange={(x) => set({ [f.key]: x })} />;
    }
  };

  const main = def.sections.filter((s) => !s.more);
  const extra = def.sections.filter((s) => s.more);

  return (
    <CalcFrame
      showUnitToggle={!!def.unitToggle}
      dock={{ label: r.hero.label, value: r.dock ?? `${r.hero.value}${r.hero.unit ? ` ${r.hero.unit}` : ""}` }}
      inputs={
        <>
          {main.map((s, i) =>
            s.title ? (
              <FieldSection key={i} title={s.title}>
                {s.fields.map(field)}
              </FieldSection>
            ) : (
              <div key={i} className="space-y-4">
                {s.fields.map(field)}
              </div>
            ),
          )}
          {extra.length ? (
            <div>
              <button
                type="button"
                onClick={() => setMore((m) => !m)}
                aria-expanded={more}
                className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-[0.99]"
              >
                {extra.map((s) => s.title).join(", ")}
                <span aria-hidden className={clsx("transition-transform duration-200", more && "rotate-180")}>
                  ⌄
                </span>
              </button>
              {more ? <div className="animate-rise mt-4 space-y-4">{extra.flatMap((s) => s.fields.map(field))}</div> : null}
            </div>
          ) : null}
        </>
      }
      results={
        <>
          <ResultHero label={r.hero.label} value={r.hero.value} unit={r.hero.unit} sub={r.hero.sub} />
          {r.stats?.length ? <StatGrid stats={r.stats} cols={r.stats.length % 3 === 0 ? 3 : 2} /> : null}
          {(r.tables ?? []).map((t) => (
            <div key={t.caption}>
              {t.title ? <ResultsHeading>{t.title}</ResultsHeading> : null}
              <OptionTable caption={t.caption} columns={t.columns} rows={t.rows} highlight={t.highlight} />
              {t.note ? <p className="mt-2 text-[0.78rem] leading-snug text-ink-3">{t.note}</p> : null}
            </div>
          ))}
          {r.shopping?.length ? <ShoppingList items={r.shopping} calcKey={def.key} /> : null}
          {r.costs?.length ? <CostLines lines={r.costs} footnote={r.costFootnote} /> : null}
          {(r.notes ?? []).map((n) => (
            <Callout key={n.text} tone={n.tone} title={n.title}>
              {n.text}
            </Callout>
          ))}
        </>
      }
      footer={
        <ActionBar
          onReset={reset}
          shareUrl={shareUrl}
          payload={() => ({ calcKey: def.key, calcName: def.name, title: def.name, summary: r.summary, items: r.shopping ?? [] })}
        />
      }
    />
  );
}
