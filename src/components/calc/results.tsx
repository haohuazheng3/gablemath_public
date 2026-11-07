"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";

/** The single most important answer, large. Re-animates whenever the value changes. */
export function ResultHero({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-ink p-5 text-bg sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage: "radial-gradient(circle at center, currentColor 1px, transparent 1.4px)",
          backgroundSize: "16px 16px",
          maskImage: "linear-gradient(120deg, transparent 30%, #000 100%)",
          WebkitMaskImage: "linear-gradient(120deg, transparent 30%, #000 100%)",
        }}
      />
      <div className="relative">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] opacity-60">{label}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span key={value} className="animate-pop num text-[2.6rem] font-semibold leading-none tracking-[-0.03em] sm:text-[3.1rem]">
            {value}
          </span>
          {unit ? <span className="text-[1.05rem] font-medium opacity-70">{unit}</span> : null}
        </div>
        {sub ? <div className="mt-3 text-[0.92rem] leading-snug opacity-75">{sub}</div> : null}
      </div>
    </div>
  );
}

export interface Stat {
  label: string;
  value: string;
  unit?: string;
  hint?: ReactNode;
  emphasis?: boolean;
}

export function StatGrid({ stats, cols = 2 }: { stats: Stat[]; cols?: 2 | 3 }) {
  return (
    <dl className={clsx("grid gap-2.5", cols === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
      {stats.map((s) => (
        <div
          key={s.label}
          className={clsx(
            "rounded-[16px] border border-line px-4 py-3",
            s.emphasis ? "bg-accent-soft" : "bg-surface-2",
          )}
        >
          <dt className="text-[0.74rem] font-medium leading-tight text-ink-3">{s.label}</dt>
          <dd className="mt-1">
            <span className="flex items-baseline gap-1">
              <span key={s.value} className="animate-pop num text-[1.32rem] font-semibold tracking-[-0.02em] text-ink">
                {s.value}
              </span>
              {s.unit ? <span className="text-[0.8rem] font-medium text-ink-3">{s.unit}</span> : null}
            </span>
            {s.hint ? <span className="mt-0.5 block text-[0.72rem] leading-snug text-ink-3">{s.hint}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const toneMap = {
  info: { box: "bg-accent-soft", dot: "bg-accent" },
  tip: { box: "bg-pencil-soft", dot: "bg-pencil" },
  warn: { box: "bg-warn-soft", dot: "bg-warn" },
  ok: { box: "bg-ok-soft", dot: "bg-ok" },
} as const;

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof toneMap;
  title?: string;
  children: ReactNode;
}) {
  const t = toneMap[tone];
  return (
    <div className={clsx("rounded-[16px] px-4 py-3 text-[0.88rem] leading-relaxed text-ink-2", t.box)}>
      <div className="flex gap-2.5">
        <span aria-hidden className={clsx("mt-[0.45rem] size-1.5 shrink-0 rounded-full", t.dot)} />
        <div>
          {title ? <div className="mb-0.5 font-semibold text-ink">{title}</div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Compact two-column table for options (e.g. bag sizes) with an optional highlighted row. */
export function OptionTable({
  caption,
  columns,
  rows,
  highlight,
}: {
  caption?: string;
  columns: string[];
  rows: ReactNode[][];
  highlight?: number;
}) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-line">
      <table className="w-full text-[0.88rem]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="bg-surface-2 text-left">
            {columns.map((c) => (
              <th key={c} scope="col" className="px-3.5 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-ink-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={clsx("border-t border-line", i === highlight && "bg-accent-softer")}>
              {r.map((cell, j) => (
                <td key={j} className={clsx("num px-3.5 py-2.5", j === 0 ? "font-medium text-ink" : "text-ink-2")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultsHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="eyebrow">{children}</h2>
      {aside}
    </div>
  );
}
