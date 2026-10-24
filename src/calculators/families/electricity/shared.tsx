// Server-safe helpers for the electricity entries: state grouping, rate facts used in preset
// answers, and the "more for this state" block rendered under state preset pages.

import Link from "next/link";
import type { Preset } from "@/calculators/types";
import { fmt } from "@/lib/format";
import { centsFor, fmtCents, pctChange, rateRank, ratesRanked, stateInfo, stateRate } from "./compute";
import { RATES } from "./data";
import type { StateInfo } from "./state-data";

const REGIONS: Record<string, string[]> = {
  Northeast: ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"],
  Midwest: ["IL", "IN", "MI", "OH", "WI", "IA", "KS", "MN", "MO", "NE", "ND", "SD"],
  South: ["DE", "DC", "FL", "GA", "MD", "NC", "SC", "VA", "WV", "AL", "KY", "MS", "TN", "AR", "LA", "OK", "TX"],
  West: ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY", "AK", "CA", "HI", "OR", "WA"],
};

/** Census region label used to group state preset links. */
export function regionGroup(code: string): string {
  const r = Object.entries(REGIONS).find(([, codes]) => codes.includes(code));
  return r ? `${r[0]} states` : "States";
}

/** The year-to-date price, rank and change used in state preset answers. */
export function rateFacts(code: string) {
  const row = stateRate(code);
  const ytd = row.ytdCents;
  const us = RATES.us.ytdCents;
  const vsUs = pctChange(ytd, us);
  return {
    row,
    ytd,
    us,
    rank: rateRank(code, "ytd"),
    vsUs,
    yoy: pctChange(row.ytdCents, row.ytdPrevYearCents),
    /** "16.03¢/kWh (Jan–Aug 2026 average), 12% below the U.S. average and #33 of 51" */
    sentence: `${fmtCents(ytd)}/kWh on average for ${RATES.period} — ${fmt(Math.abs(vsUs), 0)}% ${vsUs >= 0 ? "above" : "below"} the U.S. average of ${fmtCents(us)}, the ${ordinal(rateRank(code, "ytd"))} most expensive of the 50 states and DC`,
  };
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function signedPct(n: number, decimals = 1): string {
  return `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n), decimals)}%`;
}

/** States next to this one in the price ranking (for "similar prices" links). */
export function rankNeighbors(code: string, n = 2): StateInfo[] {
  const ranked = ratesRanked("ytd");
  const i = ranked.findIndex((s) => s.code === code);
  return ranked
    .slice(Math.max(0, i - n), i + n + 1)
    .filter((s) => s.code !== code)
    .map((s) => stateInfo(s.code));
}

export function usYtdCents(): number {
  return centsFor(RATES.us, "ytd");
}

const STATE_CALCS = [
  { slug: "electricity-rates-by-state", label: "Electricity rate" },
  { slug: "space-heater-cost-calculator", label: "Space heater cost" },
  { slug: "air-conditioner-cost-calculator", label: "Air conditioner cost" },
  { slug: "ev-charging-cost-calculator", label: "EV charging cost" },
];

const PREFILL_CALCS = [
  { slug: "electricity-cost-calculator", label: "Any appliance" },
  { slug: "hot-tub-cost-calculator", label: "Hot tub" },
  { slug: "refrigerator-cost-calculator", label: "Refrigerator" },
  { slug: "dehumidifier-cost-calculator", label: "Dehumidifier" },
  { slug: "pool-pump-cost-calculator", label: "Pool pump" },
  { slug: "clothes-dryer-cost-calculator", label: "Clothes dryer" },
];

/** PresetExtra for state pages: the same state in every other calculator, plus similarly priced states. */
export function stateExtra(currentSlug: string) {
  return function StateExtra({ preset }: { preset: Preset<{ state: string }> }) {
    const info = stateInfo(preset.values.state);
    if (info.code === "US") return null;
    const linkCls = "block rounded-[12px] px-2.5 py-1.5 text-[0.9rem] text-ink-2 transition hover:bg-surface-2 hover:text-ink";
    return (
      <section className="grid gap-4 lg:grid-cols-2" aria-label={`More for ${info.name}`}>
        <div className="module p-5">
          <h2 className="mb-3 text-[0.95rem] font-semibold text-ink">More {info.name} electricity costs</h2>
          <ul className="grid gap-1 sm:grid-cols-2">
            {STATE_CALCS.filter((c) => c.slug !== currentSlug).map((c) => (
              <li key={c.slug}>
                <Link href={`/electricity/${c.slug}/${info.slug}`} className={linkCls}>
                  {c.label} in {info.name}
                </Link>
              </li>
            ))}
            {PREFILL_CALCS.map((c) => (
              <li key={c.slug}>
                <Link href={`/electricity/${c.slug}?state=${info.code}`} className={linkCls}>
                  {c.label} at {info.code} rates
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="module p-5">
          <h2 className="mb-3 text-[0.95rem] font-semibold text-ink">States with similar prices</h2>
          <ul className="grid gap-1">
            {rankNeighbors(info.code).map((s) => (
              <li key={s.code}>
                <Link href={`/electricity/${currentSlug}/${s.slug}`} className={linkCls}>
                  {s.name} — {fmtCents(stateRate(s.code).ytdCents)}/kWh
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  };
}

/** First candidate that fits the 60-character title budget (the brand is appended by the layout). */
export function fitTitle(...candidates: string[]): string {
  return candidates.find((t) => t.length <= 60) ?? candidates[candidates.length - 1];
}

/** "November, December, January and February" — ordered from `startAt` so a winter season reads in order. */
export function listMonths(idx: number[], names: string[], startAt = 0): string {
  if (idx.length === 12) return "every month";
  const m = [...idx].sort((a, b) => ((a - startAt + 12) % 12) - ((b - startAt + 12) % 12)).map((i) => names[i]);
  return m.length <= 1 ? (m[0] ?? "") : `${m.slice(0, -1).join(", ")} and ${m[m.length - 1]}`;
}
