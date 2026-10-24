// UI pieces shared by the paint calculators. Imported only by the "use client" calculator
// components, so it runs on the client with them.

import { clsx } from "clsx";
import { useState, type ReactNode } from "react";
import type { CostLine } from "@/components/calc/CostLines";
import type { ShoppingItem } from "@/components/calc/projects";
import { OptionTable, ResultsHeading } from "@/components/calc/results";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { packOnly, packText, type Need, type PackPlan, type Priced, type PriceTag, type SupplyLine } from "./compute";
import { PACK_NAME } from "./data";

/** Collapsible "more options" group, same look as the slab calculator. */
export function MoreOptions({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-[0.99]"
      >
        {label}
        <span aria-hidden className={clsx("transition-transform duration-200", open && "rotate-180")}>
          ⌄
        </span>
      </button>
      {open ? <div className="animate-rise mt-4 space-y-4">{children}</div> : null}
    </div>
  );
}

const TAG_NOTE: Record<PriceTag, string | undefined> = {
  online: undefined,
  indicative: "indicative street price",
  typical: "typical price — no verified listing",
  estimate: "estimated quart price (40% of the gallon)",
};

/** One shopping line per container size for every coating need. */
export function needItems(needs: Need[]): ShoppingItem[] {
  return needs.flatMap((n) =>
    n.pack.lines.map((l) => ({
      id: `${n.key}-${n.productId}-${l.size}`,
      name: `${n.productName} — ${PACK_NAME[l.size]} (${n.label.toLowerCase()})`,
      qty: l.count,
      unit: l.count === 1 ? "can" : "cans",
      cost: Math.round(l.count * l.unitPrice * 100) / 100,
    })),
  );
}

export function needCostLines(needs: Need[]): CostLine[] {
  return needs.flatMap((n) =>
    n.pack.lines.map((l) => ({
      priceId: `paint-${n.productId}-${l.size}`,
      label: `${n.productName}, ${PACK_NAME[l.size]} (${n.label.toLowerCase()})`,
      qty: l.count,
      unit: l.count === 1 ? "can" : "cans",
      defaultPrice: l.unitPrice,
      note: TAG_NOTE[l.tag],
    })),
  );
}

export function supplyItems(lines: SupplyLine[]): ShoppingItem[] {
  return lines.map((s) => ({ id: s.id, name: s.name, qty: s.qty, unit: s.unit, note: s.note, cost: s.price != null ? Math.round(s.price * s.qty * 100) / 100 : undefined }));
}

export function supplyCostLines(lines: SupplyLine[]): CostLine[] {
  return lines.filter((s) => s.price != null).map((s) => ({ priceId: `paint-supply-${s.id}`, label: s.name, qty: s.qty, unit: s.unit, defaultPrice: s.price! }));
}

/** Area, coats, gallons and the cheapest can mix for every surface. */
export function NeedsTable({ needs, metric }: { needs: Need[]; metric: boolean }) {
  if (!needs.length) return null;
  return (
    <OptionTable
      caption="What to buy for each surface"
      columns={["Surface", metric ? "Area (m²)" : "Area (sq ft)", "Coats", "Need", "Buy", "Cost"]}
      rows={needs.map((n) => [
        <span key="s">
          <span className="font-semibold text-ink">{n.label}</span>
          <span className="block text-[0.74rem] text-ink-3">
            {n.productName} · {fmtInt(n.rate)} sq ft/gal
          </span>
        </span>,
        n.areaSqFt > 0 ? fmtInt(metric ? n.areaSqFt / 10.7639 : n.areaSqFt) : "spots",
        n.coats,
        `${fmt(n.gallons, 2)} gal`,
        packText(n.pack),
        fmtMoney(n.pack.cost),
      ])}
    />
  );
}

/** Cheapest mix vs whole gallons vs pails for one need. */
export function PackCompare({ need, priced }: { need: Need; priced: Priced }) {
  const options: { label: string; plan: PackPlan | null }[] = [
    { label: "Cheapest mix", plan: need.pack },
    { label: "Gallons only", plan: packOnly(need.gallons, priced, ["gal"]) },
    { label: "Gallons + quarts", plan: packOnly(need.gallons, priced, ["gal", "qt"]) },
    { label: "5-gal pails", plan: priced.prices.p5 != null ? packOnly(need.gallons, priced, ["p5", "gal"]) : null },
  ];
  const seen = new Set<string>();
  const rows = options.filter((o): o is { label: string; plan: PackPlan } => {
    if (!o.plan || !o.plan.lines.length) return false;
    const k = packText(o.plan);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (rows.length < 2) return null;
  return (
    <>
      <ResultsHeading>Quarts, gallons or a pail?</ResultsHeading>
      <OptionTable
        caption={`Ways to buy ${fmt(need.gallons, 2)} gal of ${need.label.toLowerCase()} paint`}
        columns={["Option", "Cans", "Leftover", "Cost"]}
        highlight={0}
        rows={rows.map((o) => [o.label, packText(o.plan), `${fmt(o.plan.leftoverGal, 2)} gal`, fmtMoney(o.plan.cost)])}
      />
    </>
  );
}
