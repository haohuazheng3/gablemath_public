// Single source of truth for brand + site-wide constants.

export const SITE = {
  name: "GableMath",
  domain: "gablemath.com",
  url: "https://gablemath.com",
  tagline: "Measure once. Buy right.",
  description:
    "Free, source-checked calculators for home projects and energy costs — concrete, gravel, mulch, paint, flooring, tile, fencing, roofing, appliance electricity cost and solar savings by state.",
  contactEmail: "contact@gablemath.com",
  replyWindow: "We read every message and reply within 2 business days.",
  foundingYear: 2026,
  // Public (browser-side) FlowGlance site key. Not a secret.
  flowglanceSiteKey: "fw_pub_8kcAuBJNuLCCopt2IrZa8z2d",
  // Owner identity for analytics self-exclusion; injected at build time, never committed.
  ownerEmail: process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "",
  locale: "en_US",
} as const;

export const INDEXABLE = process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true";
export const BUILD_YEAR = Number(process.env.NEXT_PUBLIC_BUILD_YEAR ?? SITE.foundingYear);
export const GIT_SHA = process.env.NEXT_PUBLIC_GIT_SHA ?? "dev";

/** Date the calculator datasets were last checked against their sources (ISO). */
export const DATA_VERIFIED_ON = "2026-10-23";

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatVerified(iso: string = DATA_VERIFIED_ON): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
