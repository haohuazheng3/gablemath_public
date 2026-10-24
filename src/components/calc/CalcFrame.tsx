"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUnits } from "./units-context";

/**
 * The floating calculator module: inputs on the left, live results on the right (stacked on
 * mobile), plus a docked result pill on phones whenever the results panel is off-screen.
 */
export function CalcFrame({
  inputs,
  results,
  footer,
  dock,
  showUnitToggle = true,
}: {
  inputs: ReactNode;
  results: ReactNode;
  footer?: ReactNode;
  /** Short live summary for the mobile dock, e.g. { label: "You need", value: "56 bags" } */
  dock?: { label: string; value: string };
  showUnitToggle?: boolean;
}) {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [resultsVisible, setResultsVisible] = useState(true);

  useEffect(() => {
    const el = resultsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setResultsVisible(e.isIntersecting), { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <section className="module relative p-4 sm:p-6 lg:p-8" aria-label="Calculator">
        {showUnitToggle ? (
          <div className="no-print absolute right-4 top-4 sm:right-6 sm:top-6 lg:right-8 lg:top-8">
            <UnitToggle />
          </div>
        ) : null}
        <div className="grid gap-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
          <div className="space-y-6 pt-10 sm:pt-11 lg:sticky lg:top-24 lg:self-start lg:pt-1">{inputs}</div>
          <div ref={resultsRef} id="results" aria-live="polite" className="scroll-mt-28 space-y-4 lg:pt-12">
            {results}
          </div>
        </div>
        {footer}
      </section>
      {dock ? (
        <button
          type="button"
          onClick={() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className={clsx(
            "no-print fixed inset-x-4 z-40 flex items-center justify-between gap-3 rounded-full bg-ink px-5 py-3 text-bg shadow-pop transition-[transform,opacity] duration-300 ease-[var(--ease-spring)] lg:hidden",
            "bottom-[max(1rem,env(safe-area-inset-bottom))]",
            resultsVisible ? "pointer-events-none translate-y-24 opacity-0" : "translate-y-0 opacity-100",
          )}
          aria-hidden={resultsVisible}
          tabIndex={resultsVisible ? -1 : 0}
        >
          <span className="text-[0.78rem] font-medium opacity-70">{dock.label}</span>
          <span className="num text-[1.05rem] font-semibold">{dock.value}</span>
          <span aria-hidden className="text-[0.8rem] opacity-70">
            See all ↓
          </span>
        </button>
      ) : null}
    </>
  );
}

export function UnitToggle() {
  const { system, setSystem } = useUnits();
  return (
    <div role="radiogroup" aria-label="Units" className="flex rounded-full bg-surface-2 p-0.5 ring-1 ring-line">
      {(["imperial", "metric"] as const).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={system === s}
          onClick={() => setSystem(s)}
          className={clsx(
            "rounded-full px-3 py-1 text-[0.74rem] font-semibold transition active:scale-95",
            system === s ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.1)] ring-1 ring-line" : "text-ink-3",
          )}
        >
          {s === "imperial" ? "ft · in" : "m · cm"}
        </button>
      ))}
    </div>
  );
}
