// Number formatting helpers shared by server-rendered answers and client calculators.

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function fmtInt(n: number): string {
  return Number.isFinite(n) ? intFmt.format(Math.round(n)) : "—";
}

/** Fixed decimals but drop trailing zeros: 1.20 → "1.2", 3.00 → "3". */
export function fmt(n: number, maxDecimals = 2): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  }).format(n);
}

/** Significant-figure-aware formatting for quantities that span orders of magnitude. */
export function fmtSmart(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 100) return fmt(n, 0);
  if (a >= 10) return fmt(n, 1);
  if (a >= 1) return fmt(n, 2);
  return fmt(n, 3);
}

export function fmtMoney(n: number, opts: { cents?: boolean } = {}): string {
  if (!Number.isFinite(n)) return "—";
  const cents = opts.cents ?? Math.abs(n) < 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);
}

/** $0.0042 style for sub-cent costs (per-hour energy etc). */
export function fmtMoneyPrecise(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1) return fmtMoney(n, { cents: true });
  if (Math.abs(n) >= 0.01) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}

export function fmtPct(n: number, decimals = 0): string {
  return `${fmt(n * 100, decimals)}%`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return Math.round(n) === 1 ? one : many;
}

/** Round up to a purchasable whole number, but forgive float noise (12.0000001 → 12). */
export function ceilQty(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n - 1e-9);
}

/** Round up to the nearest step (e.g. 0.25 yd). */
export function ceilTo(n: number, step: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n / step - 1e-9) * step;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
