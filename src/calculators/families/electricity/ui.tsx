// Client-only building blocks shared by the electricity calculators (rate picker, cost table,
// monthly bar chart, disclosure). Imported only by the "use client" calculator components, so it
// runs on the client with them; server modules never import this file. (No "use client" here: a
// client-boundary file may only default-export its component.)

import { clsx } from "clsx";
import { useState, type ReactNode } from "react";
import { FieldSection, NumberField, Segmented, SelectField } from "@/components/calc/fields";
import { OptionTable } from "@/components/calc/results";
import { fmt, fmtMoney, fmtMoneyPrecise } from "@/lib/format";
import { centsFor, fmtCents, pctChange, resolveRate, stateRate, usCents, type Cost, type RateMode } from "./compute";
import { MONTH_ABBR, RATES } from "./data";

export interface RatePatch {
  state?: string;
  rateMode?: string;
  cents?: number;
}

/** State + rate basis + "my bill" rate. `onChange` receives only the keys that changed. */
export function RateFields({
  state,
  rateMode,
  cents,
  onChange,
  title = "Electricity rate",
  stateLabel = "Where you live",
}: {
  state: string;
  rateMode: string;
  cents: number;
  onChange: (patch: RatePatch) => void;
  title?: string;
  stateLabel?: string;
}) {
  const mode: RateMode = rateMode === "month" ? "month" : rateMode === "custom" ? "custom" : "ytd";
  const shown: RateMode = mode === "custom" ? "ytd" : mode;
  const current = resolveRate({ state, rateMode, cents });
  const options = [
    { value: "US", label: `U.S. average — ${fmtCents(centsFor(RATES.us, shown))}` },
    ...RATES.states.map((s) => ({ value: s.code, label: `${s.state} — ${fmtCents(centsFor(s, shown))}`, group: "States" })),
  ];
  return (
    <FieldSection title={title}>
      <SelectField label={stateLabel} value={state} onChange={(code) => onChange({ state: code })} options={options} />
      <Segmented
        label="Price per kWh"
        columns={3}
        value={mode}
        options={[
          { value: "ytd", label: "2026 average", sub: RATES.period },
          { value: "month", label: "Latest month", sub: RATES.monthLabel },
          { value: "custom", label: "From my bill", sub: "¢ per kWh" },
        ]}
        onChange={(m) => onChange(m === "custom" && mode !== "custom" ? { rateMode: m, cents: Math.round(current.cents * 100) / 100 } : { rateMode: m })}
        help={
          mode === "custom"
            ? undefined
            : "EIA's state average: total residential revenue ÷ kWh sold, so delivery and fixed monthly charges are spread over every kWh."
        }
      />
      {mode === "custom" ? (
        <NumberField
          label="Your price"
          value={cents}
          onChange={(c) => onChange({ cents: c })}
          suffix="¢/kWh"
          step={0.5}
          min={0}
          max={150}
          decimals={2}
          help="Add up only the per-kWh lines on your bill (supply + delivery). Fixed monthly charges don't change when you add an appliance."
        />
      ) : null}
    </FieldSection>
  );
}

/** One-line rate note under a result, with the U.S. comparison. */
export function RateNote({ state, rateMode, cents }: { state: string; rateMode: string; cents: number }) {
  const r = resolveRate({ state, rateMode, cents });
  const us = usCents(r.mode === "month" ? "month" : "ytd");
  const diff = pctChange(r.cents, us);
  const row = stateRate(state);
  return (
    <p className="text-[0.78rem] leading-snug text-ink-3">
      At {fmtCents(r.cents)}/kWh — {r.label}.
      {r.mode !== "custom" && row.code !== "US"
        ? ` That is ${fmt(Math.abs(diff), 0)}% ${diff >= 0 ? "above" : "below"} the U.S. average of ${fmtCents(us)}.`
        : ""}
    </p>
  );
}

/** Hour / day / month / year table for a Cost. */
export function CostTable({
  cost,
  hourLabel = "Per hour",
  monthLabel = "Per month",
  yearLabel = "Per year",
  extra = [],
}: {
  cost: Cost;
  hourLabel?: string;
  monthLabel?: string;
  yearLabel?: string;
  extra?: ReactNode[][];
}) {
  return (
    <OptionTable
      caption="Cost by period"
      columns={["Period", "kWh", "Cost"]}
      rows={[
        [hourLabel, fmt(cost.kwhHour, 3), fmtMoneyPrecise(cost.perHour)],
        ["Per day", fmt(cost.kwhDay, 2), fmtMoneyPrecise(cost.perDay)],
        [monthLabel, fmt(cost.kwhMonth, 1), fmtMoney(cost.perMonth, { cents: true })],
        [yearLabel, fmt(cost.kwhYear, 0), fmtMoney(cost.perYear)],
        ...extra,
      ]}
    />
  );
}

/** Twelve-month bar chart (cost or kWh). Uses theme tokens so it works in light and dark mode. */
export function MonthBars({
  values,
  format,
  highlight,
  caption,
}: {
  values: number[];
  format: (n: number) => string;
  highlight?: number;
  caption: string;
}) {
  const max = Math.max(...values, 0);
  const w = 360;
  const h = 132;
  const top = 18;
  const base = h - 18;
  const bw = w / 12;
  return (
    <figure className="rounded-[18px] border border-line bg-surface-2 px-3 pb-2 pt-3">
      <figcaption className="px-1 text-[0.8rem] font-semibold text-ink-2">{caption}</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-auto w-full" role="img" aria-label={`${caption}: ${values.map((v, i) => `${MONTH_ABBR[i]} ${format(v)}`).join(", ")}`}>
        <line x1="0" x2={w} y1={base} y2={base} stroke="var(--line-strong)" strokeWidth="1" />
        {values.map((v, i) => {
          const bh = max > 0 ? ((base - top) * v) / max : 0;
          const x = i * bw + bw * 0.18;
          const on = i === highlight;
          return (
            <g key={MONTH_ABBR[i]}>
              <rect x={x} y={base - bh} width={bw * 0.64} height={Math.max(bh, v > 0 ? 1.5 : 0)} rx="3" fill={on ? "var(--accent)" : "var(--ink-3)"} opacity={on ? 1 : 0.35} />
              {on && v > 0 ? (
                <text x={x + bw * 0.32} y={base - bh - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--ink)">
                  {format(v)}
                </text>
              ) : null}
              <text x={i * bw + bw / 2} y={h - 4} textAnchor="middle" fontSize="9.5" fill="var(--ink-3)">
                {MONTH_ABBR[i].slice(0, 1)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** Collapsible group of secondary inputs (same pattern as the slab calculator's "more" section). */
export function Disclosure({ label, children, defaultOpen = false }: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-[0.99]"
      >
        {label}
        <span aria-hidden className={clsx("transition-transform duration-200", open && "rotate-180")}>
          ⌄
        </span>
      </button>
      {open ? <div className="animate-rise mt-4 space-y-4">{children}</div> : null}
    </div>
  );
}

/** Bulleted "how to cut it" card. */
export function TipList({ title = "How to cut it", tips }: { title?: string; tips: ReactNode[] }) {
  if (!tips.length) return null;
  return (
    <div className="rounded-[18px] border border-line p-4">
      <h3 className="text-[0.95rem] font-semibold text-ink">{title}</h3>
      <ul className="mt-2 space-y-2">
        {tips.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-[0.86rem] leading-relaxed text-ink-2">
            <span aria-hidden className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-accent" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Two side-by-side comparison tiles; the cheaper one is marked (text, not just color). */
export function CompareTiles({ a, b }: { a: { title: string; value: number; note: string }; b: { title: string; value: number; note: string } }) {
  const aWins = a.value <= b.value;
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {[a, b].map((t, i) => {
        const win = i === 0 ? aWins : !aWins;
        return (
          <div key={t.title} className={clsx("rounded-[14px] px-3.5 py-3 ring-1", win ? "bg-ok-soft ring-ok/30" : "bg-surface-2 ring-line")}>
            <div className="text-[0.76rem] font-medium text-ink-3">{t.title}</div>
            <div className="num mt-0.5 text-[1.25rem] font-semibold text-ink">{fmtMoney(t.value, { cents: true })}</div>
            <div className="text-[0.7rem] text-ink-3">
              {win ? "Cheaper ✓ · " : ""}
              {t.note}
            </div>
          </div>
        );
      })}
    </div>
  );
}
