// Electricity-cost data, checked against EIA, ENERGY STAR certified-product datasets (SoQL averages),
// eCFR 10 CFR 430.32, fueleconomy.gov, DOE AFDC, NOAA CPC, the California Energy Commission and
// manufacturer spec pages. Full evidence trail (URLs, quotes, dates) in research/electricity*.json.
// Monthly state prices come from src/data/eia-residential-rates.json (refreshed automatically).

import type { SourceRef } from "@/calculators/types";
import ratesJson from "@/data/eia-residential-rates.json";

export const ELECTRICITY_CHECKED = "2026-10-23";

/* ───────── EIA monthly residential prices (auto-refreshed) ───────── */

export interface StateRate {
  state: string;
  code: string;
  /** Latest month average residential price, cents/kWh (EPM Table 5.6.A). */
  cents: number;
  month: string;
  centsPrevYear: number;
  /** Year-to-date average, cents/kWh (EPM Table 5.6.B). */
  ytdCents: number;
  ytdPrevYearCents: number;
  period: string;
  sourceUrl: string;
}

export interface EiaRates {
  source: string;
  sourceUrls: { latest: string; ytd: string };
  month: string;
  monthLabel: string;
  period: string;
  updated: string;
  us: StateRate;
  states: StateRate[];
}

export const RATES = ratesJson as EiaRates;

/* ───────── unit conversions (EIA "British thermal units", 2026-10-23) ───────── */

export const BTU_PER_KWH = 3412;
export const BTU_PER_THERM = 100_000;
export const BTU_PER_GAL_PROPANE = 91_452;
export const BTU_PER_GAL_OIL = 138_500;
export const DAYS_PER_YEAR = 365;
export const DAYS_PER_MONTH = DAYS_PER_YEAR / 12;
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTH_NAME = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTH_ABBR = MONTH_NAME.map((m) => m.slice(0, 3));

/** FTC EnergyGuide labels since 2023-01-10 price electricity at 14¢/kWh (FR 2022-22036, Appendix K1). */
export const LABEL_CENTS = 14;

/* ───────── space heaters ───────── */

/** Lasko CC13700 ceramic heater: 1,500 W high / 900 W low, 12.5 A at 120 V (lasko.com, $49.99). */
export const HEATER_WATTS = [
  { value: 1500, label: "1,500 W", sub: "high / most heaters" },
  { value: 900, label: "900 W", sub: "low setting" },
  { value: 750, label: "750 W", sub: "low (some models)" },
] as const;

/** Share of time the element is on. Research range for thermostat heaters: 40–100%; 60% "cycling" scenario. */
export const HEATER_DUTY = [
  { value: 100, label: "Nonstop", sub: "100%" },
  { value: 70, label: "Cold room", sub: "70%" },
  { value: 60, label: "Cycling", sub: "60%" },
  { value: 40, label: "Mild", sub: "40%" },
];

/** A heating month is one whose normal mean temperature is below this (°F), from NOAA degree days. */
export const HEATING_MONTH_BELOW_F = 60;

/** Furnace efficiency (AFUE) bounds used for comparisons; research range 0.80–0.97. */
export const AFUE_OLD = 0.8;
export const AFUE_HIGH = 0.95;

/** ENERGY STAR certified split heat pumps 34–37k Btu/h: average HSPF2 8.44 (n=53,185); federal minimum 7.5. */
export const HSPF2_ES_AVG = 8.44;
export const HSPF2_MIN = 7.5;

/* ───────── air conditioning ───────── */

/** DOE room-AC energy basis: 750 full-load hours a year (reproduces ENERGY STAR annual kWh). */
export const ROOM_AC_HOURS_PER_YEAR = 750;
/** U.S. population-weighted normal cooling degree days (NOAA CPC), the base for climate scaling. */
export const US_CDD_NORMAL = 1216;

export interface WindowAcSize {
  btu: number;
  /** ENERGY STAR certified window units, average CEER (SoQL, 2026-10-23). */
  esCeer: number;
  esN: number;
  /** Federal minimum CEER for louvered units made on/after 2026-05-26, 10 CFR 430.32(b). */
  minCeer: number;
}

export const WINDOW_AC: WindowAcSize[] = [
  { btu: 5000, esCeer: 14.07, esN: 21, minCeer: 13.1 },
  { btu: 6000, esCeer: 14.21, esN: 29, minCeer: 13.7 },
  { btu: 8000, esCeer: 15.23, esN: 94, minCeer: 16.0 },
  { btu: 10000, esCeer: 15.35, esN: 90, minCeer: 16.0 },
  { btu: 12000, esCeer: 15.2, esN: 111, minCeer: 16.0 },
  { btu: 14000, esCeer: 15.47, esN: 35, minCeer: 16.0 },
  { btu: 18000, esCeer: 15.23, esN: 28, minCeer: 16.0 },
  { btu: 24000, esCeer: 13.35, esN: 29, minCeer: 13.8 },
];

/** Federal SEER2 minimums for split central AC (10 CFR 430.32(c)(5)–(6)); ENERGY STAR criteria and averages. */
export const SEER2_OPTIONS = [
  { value: 13.4, label: "13.4", sub: "min · North" },
  { value: 14.3, label: "14.3", sub: "min · South" },
  { value: 15.2, label: "15.2", sub: "ENERGY STAR" },
  { value: 17, label: "17", sub: "ES average" },
];

export const SEER2_REGION_MIN = { north: 13.4, southeast: 14.3, southwest: 14.3 } as const;

/** ENERGY STAR split heat pumps 34–37k Btu/h average EER2 11.49 → ~1,044 W per ton on a 95°F afternoon. */
export const EER2_TYPICAL = 11.49;

/** ENERGY STAR mini-split averages at 11.5–12.5k Btu/h (n=2,528). */
export const MINI_SPLIT = { seer2: 22.81, eer2: 12.79 };

export const CENTRAL_TONS = [1.5, 2, 2.5, 3, 3.5, 4, 5];
export const MINI_SPLIT_BTU = [9000, 12000, 18000, 24000];

/* ───────── EV charging ───────── */

export interface EvModel {
  id: string;
  name: string;
  /** EPA combined consumption from the wall, kWh per 100 miles (fueleconomy.gov, re-fetched 2026-10-23). */
  kwh100: number;
  /** EPA range in miles where listed for that exact trim. */
  range?: number;
}

export const EV_MODELS: EvModel[] = [
  { id: "model-y-lr", name: "2026 Tesla Model Y Long Range AWD", kwh100: 27 },
  { id: "model-y-std", name: "2026 Tesla Model Y Standard RWD (18 in)", kwh100: 24, range: 321 },
  { id: "model-3-std", name: "2026 Tesla Model 3 Standard RWD", kwh100: 24, range: 321 },
  { id: "model-3-awd", name: "2026 Tesla Model 3 Premium AWD", kwh100: 26, range: 346 },
  { id: "model-s", name: "2026 Tesla Model S", kwh100: 27 },
  { id: "model-x", name: "2026 Tesla Model X", kwh100: 32 },
  { id: "cybertruck", name: "2026 Tesla Cybertruck AWD", kwh100: 43 },
  { id: "equinox-ev", name: "2026 Chevrolet Equinox EV FWD", kwh100: 31, range: 319 },
  { id: "ioniq-5", name: "2026 Hyundai Ioniq 5 RWD", kwh100: 30, range: 318 },
  { id: "mach-e", name: "2026 Ford Mustang Mach-E RWD Extended", kwh100: 31, range: 320 },
  { id: "ev9", name: "2026 Kia EV9 Long Range RWD", kwh100: 38, range: 305 },
  { id: "leaf", name: "2026 Nissan LEAF 75 kWh (18 in)", kwh100: 28, range: 303 },
  { id: "prologue", name: "2026 Honda Prologue FWD", kwh100: 33, range: 308 },
  { id: "r1s", name: "2026 Rivian R1S Dual Large (20 in)", kwh100: 43 },
  { id: "f150-lightning", name: "2025 Ford F-150 Lightning ER (last model year)", kwh100: 48 },
];

/** DOE AFDC: Level 1 assumes 1.9 kW (120 V); residential Level 2 typically up to 7.2 kW (240 V). */
export const CHARGER_KW = { l1: 1.9, l2: 7.2 } as const;
/** EPA kWh/100 mi already counts Level 2 charging losses. Level 1 is less efficient; research adds ~10%
 *  (estimate — fueleconomy.gov puts charging efficiency at 84–93%). */
export const L1_EXTRA_LOSS = 0.1;
/** Charge-time derating for losses and taper (research EV formula). */
export const CHARGE_TIME_FACTOR = 0.9;
/** ENERGY STAR Level 2 chargers, average idle power (n=437). */
export const EVSE_IDLE_W = 6.85;
/** EPA Automotive Trends: model-year 2024 new-vehicle real-world average, 27.2 mpg (record high). */
export const GAS_MPG_DEFAULT = 27.2;
export const EV_MILES_DEFAULT = 1000;

/** Utility EV / time-of-use energy prices (cents/kWh), fixed monthly charges excluded. */
export const EV_RATE_PLANS = [
  { id: "pge-ev2a", label: "PG&E EV2-A off-peak", cents: 23, note: "midnight–3 pm, all year (prices eff. 2026-03-01)" },
  { id: "sce-toud", label: "SCE TOU-D-4-9PM off-peak", cents: 33, note: "summer weekday off-peak; winter super-off-peak 8 am–4 pm is 32¢" },
  { id: "fpl-tou", label: "FPL time-of-use off-peak", cents: 9, note: "“around 9 cents” off-peak, per FPL" },
];

/* ───────── refrigerators & freezers (ENERGY STAR certified averages, kWh/yr) ───────── */

export interface FridgeType {
  id: string;
  name: string;
  short: string;
  kwhYear: number;
  n: number;
}

export const FRIDGES: FridgeType[] = [
  { id: "french-door", name: "French-door / bottom-freezer refrigerator", short: "French door", kwhYear: 557, n: 1674 },
  { id: "top-freezer", name: "Top-freezer refrigerator", short: "Top freezer", kwhYear: 366, n: 839 },
  { id: "side-by-side", name: "Side-by-side refrigerator", short: "Side-by-side", kwhYear: 636, n: 123 },
  { id: "freezerless", name: "Full-size freezerless (all-refrigerator)", short: "Freezerless", kwhYear: 284, n: 296 },
  { id: "compact", name: "Compact / mini fridge", short: "Mini fridge", kwhYear: 257, n: 1769 },
  { id: "wine-cooler", name: "Beverage / wine cooler", short: "Wine cooler", kwhYear: 178, n: 53 },
  { id: "chest-freezer", name: "Chest freezer (manual defrost)", short: "Chest freezer", kwhYear: 263, n: 9 },
  { id: "upright-freezer", name: "Upright freezer", short: "Upright freezer", kwhYear: 450, n: 502 },
  { id: "compact-freezer", name: "Compact freezer", short: "Compact freezer", kwhYear: 259, n: 162 },
];

/* ───────── laundry ───────── */

/** DOE dryer test basis: 283 cycles a year; ENERGY STAR averages 607 kWh/yr vented (CEF 3.94, n=360)
 *  and 378 kWh/yr ventless heat pump (n=51). Per load = annual ÷ 283. */
export const DRYER_CYCLES_PER_YEAR = 283;
export const DRYER_KWH_YEAR = { vented: 607, heatpump: 378 } as const;
/** DOE washer test basis: 295 cycles a year; ENERGY STAR averages incl. electric water heating. */
export const WASHER_CYCLES_PER_YEAR = 295;
export const WASHER_KWH_YEAR = { front: 102, top: 165 } as const;

/* ───────── dehumidifiers ───────── */

export const LITERS_PER_PINT = 0.4732;
/** ENERGY STAR averages (2019 DOE test basis, 65°F): portable >30 pints IEF 2.02 (n=269),
 *  all portables 1.92 (n=547), whole-home 2.38 (n=24). */
export const DEHUM_ES_IEF = { portableLarge: 2.02, portableAll: 1.92, wholeHome: 2.38 } as const;
/** Federal minimum IEF, 10 CFR 430.32(v), made on/after 2019-06-13. */
export function dehumMinIef(pints: number, wholeHome: boolean): number {
  if (wholeHome) return 1.77; // ≤8 cu ft case volume; larger cases 2.41
  if (pints <= 25) return 1.3;
  if (pints <= 50) return 1.6;
  return 2.8;
}
/** ENERGY STAR capacity crosswalk after the 2019 test change: old (80°F) pints → new (65°F) pints. */
export const DEHUM_RATING_CROSSWALK = [
  { old: 30, now: 20 },
  { old: 50, now: 30 },
  { old: 70, now: 42.5 }, // ENERGY STAR gives "40–45"
];
export const DEHUM_PINTS = [20, 30, 35, 50];

/* ───────── pool pumps (ENERGY STAR certified filter pumps, SoQL 2026-10-23) ───────── */

export const POOL_PUMP = {
  inground: { low: 109.0, high: 786.7 },
  above: { low: 96.8, high: 572.1 },
  /** Legacy 1.5 hp single-speed in-ground pump: 1,500–2,000 W (unverified estimate; midpoint). */
  singleSpeed: 1750,
  /** Pressure-cleaner booster pumps in the ENERGY STAR list average ~916 W. */
  booster: 916,
  /** ENERGY STAR: certified in-ground pumps save about $50 a year, above-ground about $20. */
  esSavingsInground: 50,
};

/* ───────── hot tubs (California Title 20 §1605.3(g), Table G-3; docket 18-AAER-02) ───────── */

export const SPA = {
  /** Max normalized standby W for standard spas made on/after 2019-06-01: 3.75·V^(2/3) + 40 (V = fill gallons). */
  standardCoef: 3.75,
  standardAdd: 40,
  /** Inflatable spas: 7·V^(2/3). */
  inflatableCoef: 7,
  /** Standby is normalized to a 37°F water–air difference; test water held at 102°F. */
  testDeltaF: 37,
  testWaterF: 102,
};

/** Research range for a whole year of a portable hot tub including soaks (industry estimate, unverified). */
export const HOT_TUB_KWH_YEAR_RANGE = [1500, 3500] as const;

/* ───────── appliance quick-pick list (electricity-cost-calculator) ───────── */

export type ApplianceGroup =
  | "Heating & cooling"
  | "Kitchen"
  | "Refrigeration"
  | "Laundry & hot water"
  | "Electronics"
  | "Lighting & personal care"
  | "Outdoor, pool & garage"
  | "EV & charging";

export interface Appliance {
  id: string;
  name: string;
  group: ApplianceGroup;
  /** Running watts — or `kwhYear` for products rated by annual energy. */
  watts?: number;
  kwhYear?: number;
  hours: number;
  /** Percent of in-use time the appliance draws full power. */
  duty: number;
  days?: number;
  /** Where the number comes from, shown under the picker. */
  basis: string;
  /** Low-confidence typical value: shown as "typical — check the label". */
  estimate?: boolean;
  tip: string;
  /** Dedicated calculator for this appliance. */
  calc?: string;
}

const ES = "ENERGY STAR certified average";

export const APPLIANCES: Appliance[] = [
  // Heating & cooling
  { id: "space-heater", name: "Space heater, 1,500 W", group: "Heating & cooling", watts: 1500, hours: 8, duty: 100, basis: "Lasko ceramic heater on high: 1,500 W, 12.5 A at 120 V", tip: "A thermostat that cycles the element off is the only thing that lowers a heater's draw; heat the room you're in and close its door.", calc: "electricity/space-heater-cost-calculator" },
  { id: "space-heater-low", name: "Space heater, low (900 W)", group: "Heating & cooling", watts: 900, hours: 8, duty: 100, basis: "Lasko ceramic heater low setting: 900 W", tip: "Low uses 40% less power per hour than high, but only saves money if the room still stays warm enough.", calc: "electricity/space-heater-cost-calculator" },
  { id: "baseboard-6ft", name: "Electric baseboard, 6 ft", group: "Heating & cooling", watts: 1500, hours: 8, duty: 60, basis: "about 250 W per foot (rule of thumb)", estimate: true, tip: "Baseboards are resistance heat like a space heater; a programmable line-voltage thermostat cuts hours when rooms are empty." },
  { id: "electric-furnace", name: "Electric furnace / heat strips (15 kW)", group: "Heating & cooling", watts: 15000, hours: 6, duty: 100, basis: "heat kits run 5–25 kW (most 10–20 kW) — read the air-handler label", estimate: true, tip: "If these strips run with a heat pump, check the auxiliary-heat lockout temperature — strips cost 2–3× more per unit of heat than the heat pump itself." },
  { id: "window-ac-5000", name: "Window AC, 5,000 BTU", group: "Heating & cooling", watts: 355, hours: 8, duty: 100, basis: `${ES}, CEER 14.07 (n=21)`, tip: "Size to the room: an oversized unit short-cycles and dehumidifies poorly.", calc: "electricity/air-conditioner-cost-calculator" },
  { id: "window-ac-8000", name: "Window AC, 8,000 BTU", group: "Heating & cooling", watts: 525, hours: 8, duty: 100, basis: `${ES}, CEER 15.23 (n=94)`, tip: "New units made since May 26, 2026 must reach CEER 16.0 — about 5% less power than today's ENERGY STAR average.", calc: "electricity/air-conditioner-cost-calculator" },
  { id: "window-ac-12000", name: "Window AC, 12,000 BTU", group: "Heating & cooling", watts: 789, hours: 8, duty: 100, basis: `${ES}, CEER 15.20 (n=111)`, tip: "Seal the side panels and close blinds on the sunny side; every hour the compressor doesn't run is the saving.", calc: "electricity/air-conditioner-cost-calculator" },
  { id: "central-ac-3-ton", name: "Central AC, 3 ton", group: "Heating & cooling", watts: 3130, hours: 8, duty: 100, basis: "36,000 BTU/h ÷ EER2 11.5 (ENERGY STAR 3-ton average 11.49) — hot-afternoon draw", tip: "Each degree you raise the thermostat shortens compressor run time; change the filter and keep the outdoor coil clear.", calc: "electricity/air-conditioner-cost-calculator" },
  { id: "mini-split-12000", name: "Mini-split, 12,000 BTU", group: "Heating & cooling", watts: 526, hours: 8, duty: 100, basis: `12,000 BTU/h ÷ SEER2 22.81 (${ES}, n=2,528) — seasonal average`, tip: "Inverter mini-splits run at part speed most of the time; leave them on a steady setpoint instead of switching off and on.", calc: "electricity/air-conditioner-cost-calculator" },
  { id: "dehumidifier", name: "Dehumidifier, portable (>30 pints)", group: "Heating & cooling", kwhYear: 460, hours: 24, duty: 100, basis: `${ES}: 44 pints/day, IEF 2.02, 460 kWh/yr (DOE test hours)`, tip: "Set the humidistat to 50% instead of continuous; drain it to a floor drain so it never stops full.", calc: "electricity/dehumidifier-cost-calculator" },
  { id: "ceiling-fan", name: "Ceiling fan, high speed", group: "Heating & cooling", watts: 35, hours: 8, duty: 100, basis: `${ES} indoor fan, high speed 34.95 W (n=1,189)`, tip: "Fans cool people, not rooms — turn them off when you leave." },
  { id: "ceiling-fan-low", name: "Ceiling fan, low speed", group: "Heating & cooling", watts: 4.2, hours: 8, duty: 100, basis: `${ES} indoor fan, low speed 4.24 W`, tip: "On low a modern DC fan costs well under a dollar a month." },
  { id: "box-fan", name: "Box fan, 20 inch", group: "Heating & cooling", watts: 75, hours: 8, duty: 100, basis: "typical 50–100 W nameplate", estimate: true, tip: "Read the label or measure with a plug-in meter; older box fans draw more than new DC fans." },
  { id: "electric-blanket", name: "Electric blanket (double)", group: "Heating & cooling", watts: 100, hours: 8, duty: 100, basis: "DOE typical-wattage table: 100 W double, 60 W single", estimate: true, tip: "Warming the bed instead of the bedroom lets you lower the thermostat overnight." },
  // Kitchen
  { id: "microwave", name: "Microwave", group: "Kitchen", watts: 1100, hours: 0.25, duty: 100, basis: "DOE typical-wattage table: 750–1,100 W (label input watts can be higher)", estimate: true, tip: "Reheating in the microwave uses far less energy than heating the oven for a small portion." },
  { id: "electric-oven", name: "Electric oven (baking)", group: "Kitchen", watts: 3000, hours: 1, duty: 50, basis: "bake elements 2,000–3,500 W; thermostat cycles about half the time", estimate: true, tip: "Skip long preheats and use a toaster oven or air fryer for small batches." },
  { id: "electric-cooktop", name: "Electric / induction cooktop", group: "Kitchen", kwhYear: 191, hours: 1, duty: 100, basis: `${ES} induction ranges, cooktop only: 191 kWh/yr`, tip: "ENERGY STAR data show induction and radiant cooktops within about 2% of each other on annual energy." },
  { id: "induction-burner", name: "Portable induction burner", group: "Kitchen", watts: 1800, hours: 0.5, duty: 100, basis: "1,800 W maximum on a 15 A, 120 V plug", estimate: true, tip: "Most cooking runs below full power; this is a worst-case figure." },
  { id: "air-fryer", name: "Air fryer", group: "Kitchen", watts: 1500, hours: 0.5, duty: 100, basis: "basket air fryers typically 1,400–1,800 W", estimate: true, tip: "Short cook times are why an air fryer often beats the oven for small meals." },
  { id: "slow-cooker", name: "Slow cooker", group: "Kitchen", watts: 200, hours: 8, duty: 100, basis: "typical 150–300 W (low/high)", estimate: true, tip: "Keep the lid on — every lift lets heat out and adds run time." },
  { id: "coffee-maker", name: "Drip coffee maker", group: "Kitchen", watts: 1000, hours: 0.25, duty: 100, basis: "DOE typical-wattage table: 900–1,200 W", tip: "The warming plate keeps drawing power; brew into a thermal carafe instead." },
  { id: "kettle", name: "Electric kettle", group: "Kitchen", watts: 1500, hours: 0.1, duty: 100, basis: "most 120 V kettles 1,200–1,500 W", estimate: true, tip: "Boil only the water you need — energy scales with the volume." },
  { id: "toaster-oven", name: "Toaster oven", group: "Kitchen", watts: 1225, hours: 0.25, duty: 100, basis: "DOE typical-wattage table: 1,225 W", tip: "For one or two servings it heats a much smaller box than a full oven." },
  { id: "dishwasher", name: "Dishwasher", group: "Kitchen", kwhYear: 235, hours: 1, duty: 100, basis: `${ES} standard dishwasher: 235 kWh/yr at 215 cycles (DOE basis)`, tip: "Run full loads and skip heated dry; ENERGY STAR models must beat the 307 kWh federal maximum." },
  // Refrigeration
  { id: "fridge-french-door", name: "Refrigerator, French door", group: "Refrigeration", kwhYear: 557, hours: 24, duty: 100, basis: `${ES}: 557 kWh/yr (n=1,674)`, tip: "A 15-year-old fridge can use far more than its label — measure it with a plug-in meter before deciding to replace it.", calc: "electricity/refrigerator-cost-calculator" },
  { id: "fridge-top-freezer", name: "Refrigerator, top freezer", group: "Refrigeration", kwhYear: 366, hours: 24, duty: 100, basis: `${ES}: 366 kWh/yr (n=839)`, tip: "Top-freezer models are the most efficient full-size style in the ENERGY STAR list.", calc: "electricity/refrigerator-cost-calculator" },
  { id: "fridge-side-by-side", name: "Refrigerator, side-by-side", group: "Refrigeration", kwhYear: 636, hours: 24, duty: 100, basis: `${ES}: 636 kWh/yr (n=123)`, tip: "Side-by-sides use the most energy per cubic foot; keep door seals clean and tight.", calc: "electricity/refrigerator-cost-calculator" },
  { id: "mini-fridge", name: "Mini fridge", group: "Refrigeration", kwhYear: 257, hours: 24, duty: 100, basis: `${ES} compact refrigerator: 257 kWh/yr (n=1,769)`, tip: "A mini fridge uses about half the energy of a full-size top-freezer for a fraction of the space.", calc: "electricity/refrigerator-cost-calculator" },
  { id: "wine-cooler", name: "Wine / beverage cooler", group: "Refrigeration", kwhYear: 178, hours: 24, duty: 100, basis: `${ES} cooler: 178 kWh/yr (n=53)`, tip: "Keep it out of direct sun and away from the oven.", calc: "electricity/refrigerator-cost-calculator" },
  { id: "chest-freezer", name: "Chest freezer", group: "Refrigeration", kwhYear: 263, hours: 24, duty: 100, basis: `${ES} chest freezer: 263 kWh/yr (n=9, small sample)`, tip: "Chest freezers lose less cold air when opened than uprights.", calc: "electricity/refrigerator-cost-calculator" },
  { id: "upright-freezer", name: "Upright freezer", group: "Refrigeration", kwhYear: 450, hours: 24, duty: 100, basis: `${ES} upright freezer: 450 kWh/yr (n=502)`, tip: "Auto-defrost uprights use about 70% more than chest freezers in the ENERGY STAR data.", calc: "electricity/refrigerator-cost-calculator" },
  // Laundry & hot water
  { id: "dryer-electric", name: "Electric clothes dryer (vented)", group: "Laundry & hot water", kwhYear: 607, hours: 1, duty: 100, basis: `${ES}: 607 kWh/yr at 283 loads (2.14 kWh per load)`, tip: "Spin clothes faster in the washer and clean the lint screen every load.", calc: "electricity/clothes-dryer-cost-calculator" },
  { id: "dryer-heat-pump", name: "Heat pump dryer (ventless)", group: "Laundry & hot water", kwhYear: 378, hours: 1, duty: 100, basis: `${ES} ventless: 378 kWh/yr at 283 loads`, tip: "Heat pump dryers use about 38% less energy than vented electric dryers.", calc: "electricity/clothes-dryer-cost-calculator" },
  { id: "washer-front", name: "Washer, front load", group: "Laundry & hot water", kwhYear: 102, hours: 1, duty: 100, basis: `${ES}: 102 kWh/yr at 295 loads, incl. electric water heating`, tip: "Most washer energy is hot water — wash in cold." },
  { id: "washer-top", name: "Washer, top load", group: "Laundry & hot water", kwhYear: 165, hours: 1, duty: 100, basis: `${ES}: 165 kWh/yr at 295 loads, incl. electric water heating`, tip: "Top-loaders use more water, so more water-heating energy, than front-loaders." },
  { id: "water-heater", name: "Electric water heater, 50 gal tank", group: "Laundry & hot water", kwhYear: 3530, hours: 24, duty: 100, basis: "DOE medium draw (55 gal/day, 67°F rise) at UEF 0.92 → 3,530 kWh/yr", tip: "This is often the second-biggest electric load in a home; a heat pump water heater uses about a quarter as much." },
  { id: "water-heater-hp", name: "Heat pump water heater", group: "Laundry & hot water", kwhYear: 907, hours: 24, duty: 100, basis: `${ES} medium draw: 907 kWh/yr (UEF 3.60, n=340)`, tip: "From May 2029 new electric tanks of 20–55 gal must meet heat-pump-level efficiency (UEF 2.30)." },
  // Electronics
  { id: "tv-32", name: "TV, 32 inch", group: "Electronics", watts: 31.5, hours: 5, duty: 100, basis: `${ES} on-mode (n=9)`, tip: "Turn on the TV's energy-saving picture mode; brightness drives power." },
  { id: "tv-43", name: "TV, 43 inch", group: "Electronics", watts: 62.7, hours: 5, duty: 100, basis: `${ES} on-mode (n=9)`, tip: "Turn on the TV's energy-saving picture mode; brightness drives power." },
  { id: "tv-55", name: "TV, 55 inch", group: "Electronics", watts: 93, hours: 5, duty: 100, basis: `${ES} on-mode (n=30); label basis 5 h/day`, tip: "HDR and bright 'vivid' modes can push power well above the label figure." },
  { id: "tv-65", name: "TV, 65 inch", group: "Electronics", watts: 116.2, hours: 5, duty: 100, basis: `${ES} on-mode (n=32)`, tip: "HDR and bright 'vivid' modes can push power well above the label figure." },
  { id: "tv-75", name: "TV, 75 inch", group: "Electronics", watts: 141, hours: 5, duty: 100, basis: `${ES} on-mode (n=9)`, tip: "HDR and bright 'vivid' modes can push power well above the label figure." },
  { id: "tv-85", name: "TV, 85 inch", group: "Electronics", watts: 178.5, hours: 5, duty: 100, basis: `${ES} on-mode (n=8)`, tip: "HDR and bright 'vivid' modes can push power well above the label figure." },
  { id: "monitor-27", name: "Computer monitor, 27 inch", group: "Electronics", watts: 17.9, hours: 8, duty: 100, basis: `${ES} display on-mode (n=526)`, tip: "Let the monitor sleep; sleep mode averages a third of a watt." },
  { id: "laptop", name: "Laptop", group: "Electronics", kwhYear: 13.7, hours: 8, duty: 100, basis: `${ES} notebook typical energy: 13.7 kWh/yr`, tip: "A laptop uses a fraction of a desktop's energy for the same office work." },
  { id: "desktop", name: "Desktop PC (office use)", group: "Electronics", kwhYear: 48.6, hours: 8, duty: 100, basis: `${ES} desktop typical energy: 48.6 kWh/yr (office duty cycle)`, tip: "Enable sleep after 15–30 minutes idle." },
  { id: "gaming-pc", name: "Gaming PC, mid-range (while gaming)", group: "Electronics", watts: 400, hours: 3, duty: 100, basis: "300–450 W wall draw while gaming; PSU rating is a ceiling, not usage", estimate: true, tip: "Cap the frame rate to your monitor's refresh rate — the GPU stops working harder than it needs to." },
  { id: "gaming-pc-high", name: "Gaming PC, high-end (RTX 5090 class)", group: "Electronics", watts: 750, hours: 3, duty: 100, basis: "600–900 W wall draw; the RTX 5090 alone is rated 575 W (NVIDIA)", estimate: true, tip: "A plug-in meter shows real draw; idle desktop power matters if it runs all day." },
  { id: "ps5", name: "PlayStation 5 (gaming)", group: "Electronics", watts: 215, hours: 3, duty: 100, basis: "Sony ecodesign data: 197–218 W gameplay, PS5 Pro 215 W", tip: "Rest mode with USB power off draws under 1 W." },
  { id: "router", name: "Wi-Fi router (24/7)", group: "Electronics", watts: 10, hours: 24, duty: 100, basis: "typical 6–15 W, always on", estimate: true, tip: "Always-on loads add up: 10 W around the clock is 88 kWh a year." },
  { id: "crypto-miner", name: "Bitcoin ASIC miner (24/7)", group: "Electronics", watts: 3500, hours: 24, duty: 100, basis: "Antminer S21-class, about 3.5 kW continuous", estimate: true, tip: "At 2,500+ kWh a month the electricity rate decides profitability — check your tier and time-of-use rules." },
  // Lighting & personal care
  { id: "led-bulb", name: "LED bulb (60 W equivalent)", group: "Lighting & personal care", watts: 9, hours: 5, duty: 100, basis: "8–9 W for 800 lumens", estimate: true, tip: "An LED uses about one-seventh of the 60 W incandescent it replaces." },
  { id: "incandescent", name: "Incandescent bulb, 60 W", group: "Lighting & personal care", watts: 60, hours: 5, duty: 100, basis: "rated 60 W", tip: "DOE's 45 lumens-per-watt rule took most of these off shelves in 2023 — swap any you still have." },
  { id: "hair-dryer", name: "Hair dryer", group: "Lighting & personal care", watts: 1875, hours: 0.25, duty: 100, basis: "DOE typical-wattage table: 1,200–1,875 W (top of range)", tip: "Towel-dry first; drying time is the only lever." },
  // Outdoor, pool & garage
  { id: "pool-pump-vs", name: "Pool pump, variable speed (low)", group: "Outdoor, pool & garage", watts: 109, hours: 12, duty: 100, basis: `${ES} in-ground variable-speed pump at low speed: 109 W`, tip: "Half the speed uses one-eighth of the power — run long and slow for filtration.", calc: "electricity/pool-pump-cost-calculator" },
  { id: "pool-pump-single", name: "Pool pump, single speed (1.5 hp)", group: "Outdoor, pool & garage", watts: 1750, hours: 8, duty: 100, basis: "legacy 1.5 hp in-ground pumps draw about 1,500–2,000 W", estimate: true, tip: "Replacing a single-speed pump with a variable-speed one is usually the biggest pool saving.", calc: "electricity/pool-pump-cost-calculator" },
  { id: "hot-tub", name: "Hot tub (whole year)", group: "Outdoor, pool & garage", kwhYear: 2500, hours: 24, duty: 100, basis: "1,500–3,500 kWh/yr depending on cover, climate and setpoint", estimate: true, tip: "The cover does most of the work; the hot tub calculator estimates your climate's heat loss.", calc: "electricity/hot-tub-cost-calculator" },
  { id: "sauna", name: "Sauna heater (traditional)", group: "Outdoor, pool & garage", watts: 6000, hours: 1, duty: 100, basis: "traditional sauna heaters 4.5–9 kW; preheat then cycling", estimate: true, tip: "Preheat time is the biggest share — don't let it idle hot between sessions." },
  { id: "well-pump", name: "Well pump", group: "Outdoor, pool & garage", watts: 1000, hours: 1, duty: 100, basis: "DOE table: deep-well pumps 250–1,100 W while running", estimate: true, tip: "A pump that cycles often may have a waterlogged pressure tank." },
  { id: "sump-pump", name: "Sump pump (1/3–1/2 hp)", group: "Outdoor, pool & garage", watts: 950, hours: 0.5, duty: 100, basis: "800–1,100 W while running; runs only when the pit fills", estimate: true, tip: "Run time depends on the water table — a sump that runs constantly signals a drainage problem." },
  // EV & charging
  { id: "ev-level-2", name: "EV charging, Level 2 (7.2 kW)", group: "EV & charging", watts: 7200, hours: 2, duty: 100, basis: "DOE AFDC: residential Level 2 typically up to 7.2 kW, ~25 miles of range per hour", tip: "Schedule charging for off-peak hours if your utility has a time-of-use or EV plan.", calc: "electricity/ev-charging-cost-calculator" },
  { id: "ev-level-1", name: "EV charging, Level 1 (120 V)", group: "EV & charging", watts: 1900, hours: 8, duty: 100, basis: "DOE AFDC Level 1 assumption: 1.9 kW, ~5 miles of range per hour", tip: "A 12 A portable cord set draws closer to 1.4 kW, so it adds fewer miles per hour.", calc: "electricity/ev-charging-cost-calculator" },
  { id: "ev-charger-idle", name: "EV charger on standby (24/7)", group: "EV & charging", watts: EVSE_IDLE_W, hours: 24, duty: 100, basis: `${ES} Level 2 chargers, idle: 6.85 W (n=437)`, tip: "Standby is small — about 60 kWh a year." },
  { id: "e-bike", name: "E-bike charger (48 V, 2 A)", group: "EV & charging", watts: 96, hours: 7.5, duty: 100, days: 8, basis: "Rad Power RadWagon 5: 720 Wh battery, 48 V 2 A charger (charger output; wall draw slightly higher)", tip: "A full charge is under 1 kWh — about what a 55-inch TV uses in eight hours." },
];

export function appliance(id: string): Appliance | undefined {
  return APPLIANCES.find((a) => a.id === id);
}

/* ───────── sources ───────── */

const src = (label: string, url: string, note: string, checked = ELECTRICITY_CHECKED): SourceRef => ({ label, url, note, checked });

export const SOURCES = {
  eiaMonthly: src(
    `EIA Electric Power Monthly, Tables 5.6.A & 5.6.B — residential price by state (${RATES.monthLabel})`,
    RATES.sourceUrls.latest,
    `latest month and ${RATES.period} year-to-date average for every state; preliminary, refreshed monthly`,
    RATES.updated,
  ),
  eiaAnnual: src(
    "EIA Electric Power Annual 2025, Table 2.10 — average price by state",
    "https://www.eia.gov/electricity/annual/table.php?t=epa_02_10.html",
    "2025 final residential average (U.S. 17.23¢/kWh)",
  ),
  eia861m: src(
    "EIA-861M sales and revenue by state",
    "https://www.eia.gov/electricity/data/eia861m/xls/sales_revenue.xlsx",
    "2025 average household use and bill per state (U.S. 878 kWh, $151.88 a month)",
  ),
  eiaTechNotes: src(
    "EIA Electric Power Monthly technical notes",
    "https://www.eia.gov/electricity/monthly/pdf/technotes.pdf",
    "average price = revenue ÷ sales, including fixed customer charges, fuel adjustments and surcharges",
  ),
  eiaGas: src(
    "EIA residential natural gas prices by state",
    "https://www.eia.gov/dnav/ng/ng_pri_sum_a_EPG0_PRS_DMcf_a.htm",
    "2025 annual $/Mcf (2024 where 2025 is withheld), ÷ 10.36 therms per Mcf",
  ),
  eiaHeatingFuels: src(
    "EIA Heating Oil and Propane Update",
    "https://www.eia.gov/petroleum/heatingoilpropane/",
    "residential propane and heating oil by state, week of Oct 19, 2026, excluding taxes",
  ),
  eiaGasoline: src(
    "EIA Gasoline and Diesel Fuel Update",
    "https://www.eia.gov/petroleum/gasdiesel/",
    "regular gasoline, week of Oct 19, 2026: U.S. $4.284/gal; state or regional series",
  ),
  eiaBtu: src(
    "EIA Energy Explained — British thermal units",
    "https://www.eia.gov/energyexplained/units-and-calculators/british-thermal-units.php",
    "1 kWh = 3,412 Btu; therm 100,000; propane 91,452 Btu/gal; heating oil 138,500 Btu/gal",
  ),
  noaaDegreeDays: src(
    "NOAA Climate Prediction Center — population-weighted state degree days",
    "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/cdus/degree_days/",
    "monthly normal heating and cooling degree days by state (base 65°F)",
  ),
  ecfr: src(
    "10 CFR 430.32 — federal energy conservation standards (eCFR)",
    "https://www.ecfr.gov/current/title-10/chapter-II/subchapter-D/part-430/subpart-C/section-430.32",
    "room AC CEER minimums from 2026-05-26; SEER2 regions; dehumidifier IEF; water heater UEF",
  ),
  esRoomAc: src(
    "ENERGY STAR certified room air conditioners (dataset)",
    "https://data.energystar.gov/resource/5xn2-dv4h.json",
    "average CEER by size for window units; 750 hours/yr label basis",
  ),
  esHeatPumps: src(
    "ENERGY STAR certified central AC & heat pumps (dataset)",
    "https://data.energystar.gov/resource/83eb-xbyy.json",
    "3-ton split average SEER2 17.06 / EER2 11.49 / HSPF2 8.44; 12k mini-split SEER2 22.81",
  ),
  esFridges: src(
    "ENERGY STAR certified refrigerators and freezers (datasets)",
    "https://data.energystar.gov/resource/p5st-her9.json",
    "average kWh/yr by configuration; freezers from dataset 8t9c-g3tn",
  ),
  esDryers: src(
    "ENERGY STAR certified clothes dryers (dataset)",
    "https://data.energystar.gov/resource/t9u7-4d2j.json",
    "vented electric 607 kWh/yr (CEF 3.94); ventless 378 kWh/yr; 283 cycles/yr DOE basis",
  ),
  esWashers: src(
    "ENERGY STAR certified clothes washers (dataset)",
    "https://data.energystar.gov/resource/bghd-e2wd.json",
    "front load 102 kWh/yr, top load 165 kWh/yr incl. water heating, 295 cycles/yr",
  ),
  esDehumidifiers: src(
    "ENERGY STAR certified dehumidifiers (dataset) and capacity-rating guide",
    "https://www.energystar.gov/products/dehumidifier_testing_and_capacity",
    "portable >30 pints: 44.4 pints/day, IEF 2.02, 460 kWh/yr; 2019 test at 65°F re-rated capacities",
  ),
  esPoolPumps: src(
    "ENERGY STAR pool pumps (product page and dataset)",
    "https://www.energystar.gov/products/pool_pumps",
    "half speed uses one-eighth the energy; in-ground VS pumps 109 W low / 787 W high; ~$50/yr savings",
  ),
  esOther: src(
    "ENERGY STAR certified TVs, displays, computers, ceiling fans, dishwashers, water heaters, EV chargers",
    "https://data.energystar.gov/",
    "on-mode watts by screen size, typical annual energy, idle watts (SoQL averages)",
  ),
  fuelEconomy: src(
    "fueleconomy.gov (EPA/DOE) — 2026 electric vehicles",
    "https://www.fueleconomy.gov/feg/PowerSearch.do?action=noform&path=1&year1=2026&year2=2026&vtype=Electric&srchtyp=newAfv&pageno=1&rowLimit=200&sortBy=Comb&tabView=0",
    "kWh per 100 miles (wall-to-wheels) and range for each model",
  ),
  afdc: src(
    "DOE Alternative Fuels Data Center — charging levels",
    "https://afdc.energy.gov/fuels/electricity-stations",
    "Level 1 ≈ 1.9 kW (~5 mi/h); Level 2 2.9–19.2 kW, residential typically 7.2 kW (~25 mi/h)",
  ),
  epaTrends: src(
    "EPA Automotive Trends Report — highlights",
    "https://www.epa.gov/automotive-trends/highlights-automotive-trends-report",
    "model-year 2024 new vehicles averaged a record 27.2 mpg real-world",
  ),
  utilityRates: src(
    "PG&E, SCE and FPL residential time-of-use rate pages",
    "https://www.pge.com/assets/pge/docs/account/rate-plans/residential-electric-rate-plan-pricing.pdf",
    "EV2-A off-peak 23¢; SCE TOU-D-4-9PM off-peak 32–33¢; FPL off-peak about 9¢",
  ),
  lasko: src(
    "Lasko CC13700 ceramic console space heater",
    "https://www.lasko.com/products/lasko-13-ceramic-console-space-heater-2-heat-settings-timer-thermostat",
    "1,500 W high / 900 W low, 7.5–12.5 A, $49.99",
  ),
  doeTable: src(
    "Virginia Cooperative Extension BSE-301 (DOE typical wattage table)",
    "https://www.pubs.ext.vt.edu/2901/2901-9014/2901-9014.html",
    "nameplate ranges for small appliances (legacy table; used only where no newer data exist)",
  ),
  ftcLabel: src(
    "Federal Register 2022-22036 — EnergyGuide label cost figures",
    "https://www.govinfo.gov/content/pkg/FR-2022-10-12/html/2022-22036.htm",
    "labels since Jan 10, 2023 assume 14¢/kWh",
  ),
  cecSpa: src(
    "California Energy Commission — Title 20 portable electric spa standard (Docket 18-AAER-02)",
    "https://efiling.energy.ca.gov/GetDocument.aspx?tn=224255",
    "max standby 3.75·V^(2/3)+40 W (standard spas), 7·V^(2/3) (inflatable), normalized to a 37°F water–air difference",
  ),
  sony: src(
    "Sony Interactive Entertainment — PS5 ecodesign power data",
    "https://www.playstation.com/en-gb/legal/ecodesign/",
    "197–218 W during gameplay; PS5 Pro 215 W",
  ),
  killAWatt: src(
    "P3 International Kill A Watt P4400",
    "https://www.p3international.com/products/p4400.html",
    "plug-in meter up to 15 A / 1,875 VA for measuring real kWh",
  ),
  irs: src(
    "IRS — clean vehicle (30D) and charger (30C) credits",
    "https://www.irs.gov/credits-deductions/alternative-fuel-vehicle-refueling-property-credit",
    "30D ended for vehicles acquired after Sept 30, 2025; 30C for property placed in service after June 30, 2026",
  ),
} satisfies Record<string, SourceRef>;
