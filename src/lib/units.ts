// Unit handling. Calculators store canonical imperial values
// (feet, inches, square feet, cubic feet, pounds); this module converts
// for display and parses what people actually type ("10' 6\"", "10ft 6in", "3.2m").

export type UnitSystem = "imperial" | "metric";

export const FT_PER_M = 3.280839895;
export const IN_PER_CM = 0.3937007874;
export const SQFT_PER_SQM = 10.763910417;
export const CUFT_PER_CUYD = 27;
export const CUFT_PER_CUM = 35.314666721;
export const LB_PER_KG = 2.2046226218;
export const LB_PER_SHORT_TON = 2000;
export const L_PER_GAL = 3.785411784;

export type LengthUnit = "ft" | "in" | "yd" | "m" | "cm" | "mm";

const TO_FEET: Record<LengthUnit, number> = {
  ft: 1,
  in: 1 / 12,
  yd: 3,
  m: FT_PER_M,
  cm: FT_PER_M / 100,
  mm: FT_PER_M / 1000,
};

export function toFeet(value: number, unit: LengthUnit): number {
  return value * TO_FEET[unit];
}

export function fromFeet(feet: number, unit: LengthUnit): number {
  return feet / TO_FEET[unit];
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  return fromFeet(toFeet(value, from), to);
}

/**
 * Parse free-form length text into feet. Accepts:
 *  12 · 12.5 · 12' · 12'6" · 12' 6" · 12 ft 6 in · 12ft6in · 6" · 6 in · 1.2m · 120cm · 3 yd · 12 6 (ft in)
 * `fallbackUnit` is used for bare numbers.
 * Returns null when the text can't be read as a length.
 */
export function parseLength(raw: string, fallbackUnit: LengthUnit = "ft"): number | null {
  const s = raw.trim().toLowerCase().replace(/[′’]/g, "'").replace(/[″”]/g, '"').replace(/,/g, "");
  if (!s) return null;

  // feet + inches combos
  const ftIn = s.match(
    /^(\d+(?:\.\d+)?)\s*(?:'|ft|feet|foot)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)?)?$/,
  );
  if (ftIn) {
    const ft = parseFloat(ftIn[1]);
    const inch = ftIn[2] ? parseFloat(ftIn[2]) : 0;
    return ft + inch / 12;
  }
  const withUnit = s.match(/^(\d+(?:\.\d+)?|\.\d+)\s*("|in|inch|inches|yd|yds|yard|yards|m|meter|meters|metre|metres|cm|mm)$/);
  if (withUnit) {
    const v = parseFloat(withUnit[1]);
    const u = withUnit[2];
    if (u === '"' || u.startsWith("in")) return v / 12;
    if (u.startsWith("y")) return v * 3;
    if (u === "cm") return toFeet(v, "cm");
    if (u === "mm") return toFeet(v, "mm");
    return toFeet(v, "m");
  }
  // "12 6" → 12 ft 6 in (only when fallback is feet)
  const pair = s.match(/^(\d+)\s+(\d+(?:\.\d+)?)$/);
  if (pair && fallbackUnit === "ft") return parseInt(pair[1], 10) + parseFloat(pair[2]) / 12;
  // fractions like 3/4 or 1 1/2 (inches mostly)
  const frac = s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (frac) {
    const whole = frac[1] ? parseInt(frac[1], 10) : 0;
    const v = whole + parseInt(frac[2], 10) / parseInt(frac[3], 10);
    return toFeet(v, fallbackUnit);
  }
  const bare = Number(s);
  if (Number.isFinite(bare)) return toFeet(bare, fallbackUnit);
  return null;
}

/** 10.5 → `10' 6"` (rounded to nearest 1/4 inch). */
export function formatFeetInches(feet: number): string {
  if (!Number.isFinite(feet)) return "—";
  const totalQuarterInches = Math.round(feet * 12 * 4);
  const ft = Math.floor(totalQuarterInches / 48);
  const inQ = totalQuarterInches - ft * 48;
  const inches = inQ / 4;
  if (inches === 0) return `${ft}'`;
  if (ft === 0) return `${trimNum(inches)}"`;
  return `${ft}' ${trimNum(inches)}"`;
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
