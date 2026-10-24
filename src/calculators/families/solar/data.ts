// Solar family constants. Every number traces to research/solar.verified.json (verified 2026-10-23).
// Monthly state electricity prices come from src/data/eia-residential-rates.json (EIA EPM 5.6.A/B, read-only).

import type { SourceRef } from "@/calculators/types";
import ratesJson from "@/data/eia-residential-rates.json";
import { STATE_SOLAR_RAW } from "./state-data";

export const SOLAR_CHECKED = "2026-10-23";

/* ───────── model constants ───────── */

/** PVWatts v8 default system losses (14.08% rounded). Already baked into the state yields. */
export const SYSTEM_LOSSES_PCT = 14;
/** PVWatts v8 default inverter efficiency (%). Used only to explain the sun-hours shortcut. */
export const INVERTER_EFF = 0.96;
/** Panel wattages sold for homes in 2026 (EnergySage top-10 ranking: 430–460 W; 400 W for older/budget lines). */
export const PANEL_WATTS = [400, 420, 440, 460] as const;
export const DEFAULT_PANEL_W = 440;
/** Module efficiency used for panel footprint: 440 W ÷ (22% × 1,000 W/m²) = 2.0 m² = 21.5 ft² (research panel_area_440w). */
export const PANEL_EFF = 0.22;
/** Array area ÷ 0.80 for fire setbacks and gaps between rows (research formula "Roof area needed"). */
export const ROOF_PACKING = 0.8;
export const SQFT_PER_M2 = 10.7639;
/** Default degradation, %/yr (between warranty-implied and NLR fleet data; hot-climate fleet median is 0.88%). */
export const DEGRADATION_PCT = 0.5;
export const DEGRADATION_HOT_PCT = 0.88;
/** Nominal residential price escalation, %/yr: EIA MER T9.08 20-yr CAGR 3.05% (2005–2025). 2020–2025 ran 5.55%. */
export const ESCALATION_PCT = 3;
export const ESCALATION_RECENT_PCT = 5.55;
export const ANALYSIS_YEARS = 25;
/** Share of production used in the home as it is made, with no battery. Modeling assumption (research: unverifiable). */
export const SELF_USE_PCT = 40;
/** Battery AC round-trip efficiency (Enphase IQ Battery 5P datasheet). */
export const BATTERY_RTE = 0.9;
/** LBNL 2025 median battery size (kWh) — also one Powerwall 3 (13.5 kWh usable). */
export const BATTERY_KWH = 13.5;
/** EnergySage H1 2026 national median battery price, $/kWh before incentives. */
export const BATTERY_PER_KWH_US = 1130;
/** National marketplace price, $/W DC (EnergySage H1 2026 median). Fallback for states without a state figure. */
export const COST_PER_W_US = 2.57;
/** LBNL 2025 median installed price, host-owned (2025$/W DC) — what surveyed installs actually cost. */
export const COST_PER_W_LBNL_US = 3.6;
/** Offset target defaults: 100% where exports earn retail, 70% where exports earn less (research defaults). */
export const OFFSET_RETAIL = 100;
export const OFFSET_NET_BILLING = 70;
/** Typical attached-roof share covered by panels (LBNL 2025: median 22% one-story, 31% multi-story). */
export const ROOF_SHARE_MEDIAN = { oneStory: 22, multiStory: 31 };
/** Median residential system size, kW DC: LBNL 2025 installs 7.7; EnergySage H1 2026 quotes 12. */
export const MEDIAN_KW = { lbnl: 7.7, energysage: 12 };

/* ───────── federal rules (P.L. 119-21, 2025) ───────── */

export const FEDERAL = {
  /** 25D residential credit for systems whose installation is completed after 2025-12-31. */
  credit25dPct2026: 0,
  credit25dPct2025: 30,
  /** 48E (lease/PPA owners): construction must have begun by this date, or be placed in service by the deadline. */
  tpoBeginConstruction: "2026-07-04",
  tpoPlacedInService: "2027-12-31",
  /** 48E base rate when prevailing-wage/apprenticeship is met or the facility is under 1 MW AC. */
  tpoRatePct: 30,
  /** EnergySage H1 2026: lease quotes ~39% and prepaid PPA ~57% cheaper than cash, on its comparison basis. */
  leaseGapPct: 39,
  ppaGapPct: 57,
};

/* ───────── state data ───────── */

export type ExportMode = "retail" | "pct" | "cents";

export interface StateSolarRaw {
  code: string;
  name: string;
  city: string;
  region: string;
  /** AC kWh per kW DC per year (20° south roof, 14% losses). */
  yield: number;
  yieldSrc: "pvwatts" | "pvgis";
  /** Peak sun hours (plane-of-array kWh/m²/day). */
  psh: number;
  costW: number | null;
  lbnlW: number | null;
  battKwh: number | null;
  avgKwh: number;
  cagr: number;
  esPayback: number | null;
  export: { mode: ExportMode; value: number; estimate: boolean };
  excessCents?: number;
  upfront?: { kind: "credit" | "perW"; pct?: number; rate?: number; cap?: number; perYear?: number; label: string };
  perf?: { perMwh: number; years: number; label: string };
  srec?: number[];
  fees?: { prodCents?: number; perKwMonth?: number; monthly?: number; label: string };
  policy: string | null;
  incentives: string;
}

type RateRow = { code: string; state: string; cents: number; centsPrevYear: number; ytdCents: number; ytdPrevYearCents: number };
const RATES = ratesJson as unknown as { monthLabel: string; period: string; updated: string; us: RateRow; states: RateRow[] };

export const RATE_PERIOD = RATES.period; // "Jan–Aug 2026"
export const RATE_MONTH_LABEL = RATES.monthLabel;
export const US_RATE_CENTS = RATES.us.ytdCents;
export const US_RATE_PREV_CENTS = RATES.us.ytdPrevYearCents;

export interface StateSolar extends StateSolarRaw {
  slug: string;
  /** EIA year-to-date residential price, ¢/kWh. */
  rate: number;
  ratePrev: number;
  /** 1 = most expensive of 51. */
  rateRank: number;
  /** 1 = sunniest of 51 (by yield). */
  sunRank: number;
  /** Cost per watt used by default (state EnergySage, else national). */
  costPerW: number;
  costIsNational: boolean;
  batteryPerKwh: number;
}

const slugOf = (name: string, code: string) => (code === "DC" ? "washington-dc" : name.toLowerCase().replace(/[^a-z]+/g, "-"));

function build(): StateSolar[] {
  const rows = STATE_SOLAR_RAW.map((s) => {
    const r = RATES.states.find((x) => x.code === s.code);
    return { s, rate: r?.ytdCents ?? US_RATE_CENTS, ratePrev: r?.ytdPrevYearCents ?? US_RATE_PREV_CENTS };
  });
  const byRate = [...rows].sort((a, b) => b.rate - a.rate).map((x) => x.s.code);
  const byYield = [...rows].sort((a, b) => b.s.yield - a.s.yield).map((x) => x.s.code);
  return rows.map(({ s, rate, ratePrev }) => ({
    ...s,
    slug: slugOf(s.name, s.code),
    rate,
    ratePrev,
    rateRank: byRate.indexOf(s.code) + 1,
    sunRank: byYield.indexOf(s.code) + 1,
    costPerW: s.costW ?? COST_PER_W_US,
    costIsNational: s.costW == null,
    batteryPerKwh: s.battKwh ?? BATTERY_PER_KWH_US,
  }));
}

export const STATES: StateSolar[] = build();

function median(xs: number[]) {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** "Typical U.S." pseudo-state: median state yield and sun hours, national price and cost. */
export const US_TYPICAL: StateSolar = {
  code: "US",
  name: "United States (typical)",
  city: "median state",
  region: "US",
  yield: median(STATES.map((s) => s.yield)),
  yieldSrc: "pvgis",
  psh: median(STATES.map((s) => s.psh)),
  costW: COST_PER_W_US,
  lbnlW: COST_PER_W_LBNL_US,
  battKwh: BATTERY_PER_KWH_US,
  avgKwh: 874,
  cagr: 3.14,
  esPayback: null,
  export: { mode: "retail", value: 1, estimate: true },
  policy: "Varies by state and utility. The national default assumes 1:1 net metering, the best case — pick your state for its actual export rules.",
  incentives: "Varies by state; pick your state.",
  slug: "us",
  rate: US_RATE_CENTS,
  ratePrev: US_RATE_PREV_CENTS,
  rateRank: 0,
  sunRank: 0,
  costPerW: COST_PER_W_US,
  costIsNational: true,
  batteryPerKwh: BATTERY_PER_KWH_US,
};

export function stateSolar(code: string): StateSolar {
  return STATES.find((s) => s.code === code) ?? US_TYPICAL;
}

export const STATE_OPTIONS = [
  { value: "US", label: "U.S. typical (median state)", group: "National" },
  ...[...STATES].sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ value: s.code, label: s.name, group: "States" })),
];

/** Default offset target for a state's export rules. */
export function defaultOffset(s: StateSolar): number {
  return s.export.mode === "retail" ? OFFSET_RETAIL : OFFSET_NET_BILLING;
}

export function exportLabel(s: Pick<StateSolar, "export">): string {
  const e = s.export;
  if (e.mode === "retail") return "1:1 net metering";
  if (e.mode === "cents") return `net billing, exports earn ${e.value}¢/kWh`;
  return `exports earn ~${Math.round(e.value * 100)}% of retail`;
}

/* ───────── sources ───────── */

const S: Record<string, SourceRef> = {
  irs25d: { label: "IRS — FAQs on the modification of sections 25C, 25D (FS-2025-05)", url: "https://www.irs.gov/newsroom/faqs-for-modification-of-sections-25c-25d-25e-30c-30d-45l-45w", note: "25D credit is 0% for solar whose installation is completed after Dec 31, 2025", checked: SOLAR_CHECKED },
  obbba: { label: "Public Law 119-21 (2025), secs. 70506 and 70513", url: "https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm", note: "25D termination; 48E placed-in-service deadline Dec 31, 2027 for solar", checked: SOLAR_CHECKED },
  n2542: { label: "IRS Notice 2025-42 (beginning of construction)", url: "https://www.irs.gov/pub/irs-drop/n-25-42.pdf", note: "48E begin-construction cutoff July 4, 2026", checked: SOLAR_CHECKED },
  pvwatts: { label: "NLR (formerly NREL) PVWatts v8", url: "https://developer.nlr.gov/docs/solar/pvwatts/v8/", note: "14% losses, 20° tilt, south; kWh per kW DC by state city", checked: SOLAR_CHECKED },
  pvgis: { label: "EU JRC PVGIS v5.3 (ERA5)", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc", note: "Fallback yields for states PVWatts was not fetched for (low confidence)", checked: SOLAR_CHECKED },
  eiaEpm: { label: "EIA Electric Power Monthly, Table 5.6.B", url: "https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_b", note: `Residential price by state, ${RATE_PERIOD}`, checked: SOLAR_CHECKED },
  eia861: { label: "EIA-861 2025 (average monthly bill and use)", url: "https://www.eia.gov/electricity/data/eia861/zip/f8612025.zip", note: "U.S. average 874 kWh/month; state averages", checked: SOLAR_CHECKED },
  eiaMer: { label: "EIA Monthly Energy Review, Table 9.8", url: "https://www.eia.gov/totalenergy/data/browser/csv.php?tbl=T09.08", note: "Residential price CAGR 3.05% (2005–2025), 5.55% (2020–2025)", checked: SOLAR_CHECKED },
  esCost: { label: "EnergySage — solar panel cost by state", url: "https://www.energysage.com/local-data/solar-panel-cost/", note: "State $/W, October 2026", checked: SOLAR_CHECKED },
  esReport: { label: "EnergySage H1 2026 marketplace report (via Mercom)", url: "https://mercomindia.com/us-residential-solar-prices-rise-3-as-market-adjusts-to-tax-credit-expiry", note: "$2.57/W median; batteries $1,130/kWh", checked: SOLAR_CHECKED },
  lbnl: { label: "Berkeley Lab — U.S. Distributed Solar and Storage Data, 2026 update", url: "https://eta-publications.lbl.gov/sites/default/files/2026-08/distributed_solar_storage-2026_data_update_final.pdf", note: "$3.6/W host-owned median; 7.7 kW median; roof coverage 22–31%", checked: SOLAR_CHECKED },
  esPanels: { label: "EnergySage — best solar panels ranking", url: "https://www.energysage.com/solar/best-solar-panels-complete-ranking/", note: "Top residential panels 430–460 W, 22–23% efficient", checked: SOLAR_CHECKED },
  esIncent: { label: "EnergySage — solar rebates and incentives by state", url: "https://www.energysage.com/local-data/solar-rebates-incentives/", note: "State credits, rebates and export rules", checked: SOLAR_CHECKED },
  caNbt: { label: "NRG Clean Power — NEM 3.0 export value summary", url: "https://nrgcleanpower.com/learning-center/nem-3-0-is-final/", note: "California production-weighted export credit ~4.1¢/kWh", checked: SOLAR_CHECKED },
  osti: { label: "NLR PV Fleet Performance study (OSTI 1864619)", url: "https://www.osti.gov/biblio/1864619", note: "Degradation 0.5%/yr default; 0.88%/yr hot climates", checked: SOLAR_CHECKED },
  enphase: { label: "Enphase IQ Battery 5P data sheet", url: "https://enphase.com/download/iq-battery-5p-data-sheet", note: "90% round-trip efficiency", checked: SOLAR_CHECKED },
  esStorage: { label: "EnergySage — energy storage cost", url: "https://www.energysage.com/local-data/energy-storage-cost/", note: "Battery $/kWh by state, H1 2026", checked: SOLAR_CHECKED },
  tpo: { label: "EnergySage — tax changes and leased solar", url: "https://www.energysage.com/news/trumps-tax-changes-impact-tpo-solar/", note: "48E credit for lease/PPA owners", checked: SOLAR_CHECKED },
};

export function solarSources(...keys: (keyof typeof S)[]): SourceRef[] {
  return keys.map((k) => S[k]);
}
