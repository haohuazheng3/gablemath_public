// Public record of data updates and corrections, newest first. Add an entry whenever a dataset is
// refreshed, a product spec changes, or a reader-reported error is fixed.
export interface ChangeEntry {
  date: string; // ISO
  kind: "launch" | "data" | "correction" | "feature";
  title: string;
  detail: string;
}

export const CHANGELOG: ChangeEntry[] = [
  {
    date: "2026-10-23",
    kind: "data",
    title: "Full data review before launch",
    detail:
      "Every calculator's constants were re-checked against current manufacturer technical data sheets, retailer listings, 2026 supplier price sheets, the EIA Electric Power Monthly and NREL. Outdated figures that still circulate online (for example \"a pallet of 80-lb concrete is a cubic yard\") were excluded.",
  },
  {
    date: "2026-10-23",
    kind: "launch",
    title: "GableMath launches",
    detail: "Calculators for concrete, gravel and mulch, paint, flooring, tile, fencing, roofing, electricity cost and solar.",
  },
];
