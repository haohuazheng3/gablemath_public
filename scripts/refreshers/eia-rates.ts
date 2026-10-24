// Refreshes src/data/eia-residential-rates.json from the EIA Electric Power Monthly:
// Table 5.6.A (average residential price, latest month vs the same month a year earlier) and
// Table 5.6.B (year-to-date average vs the prior year-to-date). Both are keyless HTML tables.
// EIA posts a new month in the fourth week of each month; values are preliminary until revised.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { register } from "../lib/refresh-registry";

export const EPM_URLS = {
  latest: "https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a",
  ytd: "https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_b",
} as const;

const OUT_FILE = path.join(process.cwd(), "src/data/eia-residential-rates.json");

/** Sanity band for a residential state average (EIA 2025 range: 11.8¢ North Dakota – 40.4¢ Hawaii). */
const MIN_CENTS = 5;
const MAX_CENTS = 60;

export const STATE_CODES: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export interface EpmTable {
  /** "2026-08" */
  month: string;
  /** Residential cents/kWh by row name: [this year, prior year]. */
  rows: Map<string, [number, number]>;
}

function cellText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parses one EPM table page: the period from the title and the two residential columns of every row. */
export function parseEpmTable(html: string): EpmTable {
  const title = html.match(/systemtitle2[^>]*>([^<]+)</)?.[1] ?? "";
  const when = title.match(new RegExp(`(${MONTHS.join("|")}) (\\d{4}) and \\d{4}`));
  if (!when) throw new Error(`EPM table title not recognised: "${title.trim()}"`);
  const month = `${when[2]}-${String(MONTHS.indexOf(when[1]) + 1).padStart(2, "0")}`;

  const rows = new Map<string, [number, number]>();
  for (const tr of html.split(/<tr[\s>]/).slice(1)) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => cellText(m[1]));
    if (cells.length < 3) continue;
    rows.set(cells[0], [Number(cells[1]), Number(cells[2])]);
  }
  return { month, rows };
}

export interface StateRate {
  state: string;
  code: string;
  /** Average residential price in the latest month, cents/kWh (Table 5.6.A). */
  cents: number;
  month: string;
  /** Same month one year earlier. */
  centsPrevYear: number;
  /** Year-to-date average through `month` (Table 5.6.B). */
  ytdCents: number;
  ytdPrevYearCents: number;
  /** "Jan–Aug 2026" */
  period: string;
  sourceUrl: string;
}

export interface RatesFile {
  source: string;
  sourceUrls: typeof EPM_URLS;
  month: string;
  monthLabel: string;
  period: string;
  /** Date this file last changed (set by the refresher). */
  updated: string;
  us: StateRate;
  states: StateRate[];
}

function inRange(n: number): boolean {
  return Number.isFinite(n) && n >= MIN_CENTS && n <= MAX_CENTS;
}

/** Combines the two tables into the published file shape and validates every value. */
export function buildRatesFile(latest: EpmTable, ytd: EpmTable, updated: string): RatesFile {
  if (latest.month !== ytd.month) throw new Error(`Table months differ: 5.6.A ${latest.month} vs 5.6.B ${ytd.month}`);
  const [year, mm] = latest.month.split("-").map(Number);
  const period = mm === 1 ? `Jan ${year}` : `Jan–${MONTHS[mm - 1].slice(0, 3)} ${year}`;

  const row = (name: string, code: string): StateRate => {
    const a = latest.rows.get(name);
    const b = ytd.rows.get(name);
    if (!a || !b) throw new Error(`Missing row for ${name}`);
    const r: StateRate = {
      state: name,
      code,
      cents: a[0],
      month: latest.month,
      centsPrevYear: a[1],
      ytdCents: b[0],
      ytdPrevYearCents: b[1],
      period,
      sourceUrl: EPM_URLS.latest,
    };
    for (const v of [r.cents, r.centsPrevYear, r.ytdCents, r.ytdPrevYearCents]) {
      if (!inRange(v)) throw new Error(`${name}: ${v} ¢/kWh is outside ${MIN_CENTS}–${MAX_CENTS}`);
    }
    return r;
  };

  const states = Object.entries(STATE_CODES)
    .map(([name, code]) => row(name, code))
    .sort((x, y) => x.state.localeCompare(y.state));
  if (states.length !== 51) throw new Error(`Expected 51 rows (50 states + DC), got ${states.length}`);

  return {
    source: "U.S. Energy Information Administration, Electric Power Monthly, Tables 5.6.A and 5.6.B (residential)",
    sourceUrls: EPM_URLS,
    month: latest.month,
    monthLabel: `${MONTHS[mm - 1]} ${year}`,
    period,
    updated,
    us: { ...row("U.S. Total", "US"), state: "United States" },
    states,
  };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "GableMath data refresh (+https://gablemath.com)" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

async function run() {
  const [latestHtml, ytdHtml] = await Promise.all([fetchText(EPM_URLS.latest), fetchText(EPM_URLS.ytd)]);
  const today = new Date().toISOString().slice(0, 10);
  const next = buildRatesFile(parseEpmTable(latestHtml), parseEpmTable(ytdHtml), today);

  // A missing or unreadable file (first run) simply counts as changed.
  const prev = await readFile(OUT_FILE, "utf8").then(
    (s) => JSON.parse(s) as RatesFile,
    () => null,
  );
  const comparable = (f: RatesFile) => JSON.stringify({ month: f.month, us: f.us, states: f.states });
  if (prev && comparable(prev) === comparable(next)) {
    return { changed: false, detail: `${next.monthLabel}, U.S. ${next.us.cents}¢ (YTD ${next.us.ytdCents}¢)` };
  }
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(next, null, 2)}\n`);
  return {
    changed: true,
    detail: `${prev ? `${prev.month} → ` : ""}${next.month}: U.S. ${next.us.cents}¢ latest month, ${next.us.ytdCents}¢ ${next.period}`,
  };
}

register({ name: "eia-residential-rates", run });
