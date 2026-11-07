"use client";

import { useEffect, useState } from "react";
import { fmt, fmtMoney } from "@/lib/format";

export interface CostLine {
  /** Stable price id shared across calculators, e.g. "concrete-bag-80". User edits persist under it. */
  priceId: string;
  label: string;
  qty: number;
  unit: string; // "bags", "cu yd", "gal"
  defaultPrice: number; // USD per unit
  note?: string;
}

const PRICE_KEY = "gm-prices-v1";

function loadPrices(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(PRICE_KEY) ?? "{}") as Record<string, number>;
  } catch (err) {
    console.warn("[prices] could not read saved prices", err);
    return {};
  }
}

/** Remembers prices the visitor typed (their local store's price beats our national typical). */
export function usePrices(lines: CostLine[]) {
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved prices after hydration
    setOverrides(loadPrices());
  }, []);
  const priceOf = (l: CostLine) => overrides[l.priceId] ?? l.defaultPrice;
  const setPrice = (priceId: string, v: number) => {
    const next = { ...overrides, [priceId]: v };
    setOverrides(next);
    try {
      localStorage.setItem(PRICE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn("[prices] could not persist price", err);
    }
  };
  const resetPrice = (priceId: string) => {
    const next = { ...overrides };
    delete next[priceId];
    setOverrides(next);
    try {
      localStorage.setItem(PRICE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn("[prices] could not persist price", err);
    }
  };
  const total = lines.reduce((s, l) => s + l.qty * priceOf(l), 0);
  return { priceOf, setPrice, resetPrice, total, overrides };
}

export function CostLines({
  lines,
  title = "Cost estimate",
  footnote,
}: {
  lines: CostLine[];
  title?: string;
  footnote?: string;
}) {
  const { priceOf, setPrice, resetPrice, total, overrides } = usePrices(lines);
  if (!lines.length) return null;
  return (
    <div className="rounded-[18px] border border-line">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="text-[0.92rem] font-semibold text-ink">{title}</h3>
        <span className="text-[0.74rem] text-ink-3">Tap a price to use your store&apos;s</span>
      </div>
      <ul className="divide-y divide-line">
        {lines.map((l) => {
          const price = priceOf(l);
          const edited = overrides[l.priceId] != null;
          return (
            <li key={l.priceId} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[0.88rem] font-medium leading-snug text-ink">{l.label}</div>
                <div className="num text-[0.76rem] text-ink-3">
                  {fmt(l.qty, 2)} {l.unit} ×{" "}
                  <PriceInput value={price} onChange={(v) => setPrice(l.priceId, v)} label={`Price per ${l.unit} for ${l.label}`} />
                  {edited ? (
                    <button type="button" onClick={() => resetPrice(l.priceId)} className="ml-1.5 text-accent underline-offset-2 hover:underline">
                      reset
                    </button>
                  ) : null}
                  {l.note ? <span className="block">{l.note}</span> : null}
                </div>
              </div>
              <div className="num shrink-0 text-[0.92rem] font-semibold text-ink">{fmtMoney(l.qty * price)}</div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between border-t border-line-strong px-4 py-3">
        <span className="text-[0.92rem] font-semibold text-ink">Materials total</span>
        <span className="num text-[1.1rem] font-semibold text-ink">{fmtMoney(total)}</span>
      </div>
      {footnote ? <p className="border-t border-line px-4 py-2.5 text-[0.74rem] leading-snug text-ink-3">{footnote}</p> : null}
    </div>
  );
}

function PriceInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [text, setText] = useState(value.toFixed(2));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror external price when not editing
    if (!focus) setText(value.toFixed(2));
  }, [value, focus]);
  return (
    <span className="inline-flex items-center rounded-md bg-surface-3 px-1.5 py-0.5 text-ink-2">
      $
      <input
        aria-label={label}
        inputMode="decimal"
        className="num w-[4.2rem] bg-transparent text-[0.8rem] font-semibold text-ink outline-none"
        value={text}
        onFocus={(e) => {
          setFocus(true);
          e.currentTarget.select();
        }}
        onBlur={() => setFocus(false)}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= 0 && n < 1e6) onChange(n);
        }}
      />
    </span>
  );
}
