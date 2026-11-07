// UI pieces shared by the concrete calculators. Imported only by the "use client" calculator
// components, so it runs on the client with them.

import { clsx } from "clsx";
import { useState, type ReactNode } from "react";
import { NumberField, Segmented, SelectField } from "@/components/calc/fields";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { DEFAULT_FEES, type ConcreteOrder } from "./compute";
import { BAG_YIELD_CUFT, PRODUCTS, product, type BagSize, type ConcreteProduct } from "./data";

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

/** Product, bag size and overage — switching products keeps the bag size when that size exists. */
export function MixFields({
  productId,
  bag,
  waste,
  onChange,
  wasteHelp = "10% is standard for bagged concrete (uneven ground, spillage, form bulges).",
}: {
  productId: string;
  bag: number;
  waste: number;
  onChange: (patch: { product?: string; bag?: number; waste?: number }) => void;
  wasteHelp?: string;
}) {
  const p = product(productId);
  const size = p.sizes.includes(bag as BagSize) ? (bag as BagSize) : p.sizes[p.sizes.length - 1];
  return (
    <>
      <SelectField
        label="Concrete mix"
        value={p.id}
        onChange={(id) => {
          const next = product(id);
          onChange({ product: id, bag: next.sizes.includes(size) ? size : next.sizes[next.sizes.length - 1] });
        }}
        options={PRODUCTS.map((x) => ({ value: x.id, label: `${x.short} — ${x.name}` }))}
        help={p.bestFor}
      />
      <Segmented
        label="Bag size"
        columns={p.sizes.length}
        value={size}
        options={p.sizes.map((s) => ({ value: s, label: `${s} lb`, sub: `${BAG_YIELD_CUFT[s]} ft³` }))}
        onChange={(b) => onChange({ bag: b })}
      />
      <NumberField label="Extra for waste & spillage" value={waste} onChange={(w) => onChange({ waste: w })} suffix="%" step={5} min={0} max={50} decimals={0} help={wasteHelp} />
    </>
  );
}

export interface FeeValues {
  rm: number;
  slf: number;
  del: number;
  fuel: number;
}

/** Side-by-side bags vs delivered ready-mix, with editable plant prices and the break-even volume. */
export function BagsVsTruck({ order, fees, onFees }: { order: ConcreteOrder; fees: FeeValues; onFees: (patch: Partial<FeeValues>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[18px] border border-line p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[0.95rem] font-semibold text-ink">Bags or a ready-mix truck?</h3>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-[0.78rem] font-semibold text-accent">
          {open ? "Done" : "Edit plant prices"}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <CompareTile title={`${fmtInt(order.bags)} bags`} value={order.bagCost != null ? fmtMoney(order.bagCost) : "—"} win={order.cheaper === "bags"} note="materials only, before tax" />
        <CompareTile
          title={`${fmt(order.readyMixYd, 2)} yd³ delivered`}
          value={fmtMoney(order.readyMixCost)}
          win={order.cheaper === "ready-mix"}
          note={order.readyMixYd < DEFAULT_FEES.shortLoadUnderYd ? "incl. short-load & delivery fees" : "incl. delivery & fuel"}
        />
      </div>
      <p className="mt-3 text-[0.84rem] leading-relaxed text-ink-2">
        {order.breakEvenYd != null
          ? `At these prices a truck becomes cheaper from about ${fmt(order.breakEvenYd, 2)} yd³ (${fmtInt(Math.ceil((order.breakEvenYd * 27) / BAG_YIELD_CUFT[order.bagSize]))} bags). `
          : "At these prices bags stay cheaper — but labor grows with every bag. "}
        Over 1–2 yd³, a truck also saves hours of mixing: plan on 3–4 minutes per bag in a mixer.
      </p>
      {open ? (
        <div className="animate-rise mt-4 grid grid-cols-2 gap-3">
          <NumberField label="Price per yd³" value={fees.rm} onChange={(rm) => onFees({ rm })} prefix="$" step={5} decimals={0} stepper={false} />
          <NumberField label="Short-load fee" value={fees.slf} onChange={(slf) => onFees({ slf })} prefix="$" step={10} decimals={0} stepper={false} hint="< 4 yd³" />
          <NumberField label="Delivery fee" value={fees.del} onChange={(del) => onFees({ del })} prefix="$" step={10} decimals={0} stepper={false} />
          <NumberField label="Fuel surcharge" value={fees.fuel} onChange={(fuel) => onFees({ fuel })} prefix="$" step={5} decimals={0} stepper={false} />
          <p className="col-span-2 text-[0.76rem] leading-snug text-ink-3">
            Ask the plant: price per yard for 4,000 psi, minimum order, short-load threshold and fee, delivery zone fee, fuel surcharge, and how many minutes of unloading are included.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function CompareTile({ title, value, win, note }: { title: string; value: string; win: boolean; note: string }) {
  return (
    <div className={clsx("rounded-[14px] px-3.5 py-3 ring-1", win ? "bg-ok-soft ring-ok/30" : "bg-surface-2 ring-line")}>
      <div className="text-[0.76rem] font-medium text-ink-3">{title}</div>
      <div className="num mt-0.5 text-[1.25rem] font-semibold text-ink">{value}</div>
      <div className="text-[0.7rem] text-ink-3">
        {win ? "Cheaper ✓ · " : ""}
        {note}
      </div>
    </div>
  );
}

/** Strength and wait times from the product's data sheet. */
export function ProductTimeline({ p, title }: { p: ConcreteProduct; title?: string }) {
  return (
    <div className="rounded-[18px] border border-line p-4">
      <h3 className="text-[0.95rem] font-semibold text-ink">{title ?? `Timeline for ${p.short.toLowerCase()}`}</h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
        {p.timeline.map((t) => (
          <div key={t.label}>
            <dt className="text-[0.74rem] text-ink-3">{t.label}</dt>
            <dd className="text-[0.88rem] font-semibold text-ink">{t.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Code checks as a tidy pass/attention list (never color alone: each row says what it means). */
export function CheckList({ items }: { items: { label: string; ok: boolean; detail: string }[] }) {
  return (
    <ul className="divide-y divide-line rounded-[18px] border border-line">
      {items.map((c) => (
        <li key={c.label} className="flex items-start gap-3 px-4 py-2.5">
          <span
            aria-hidden
            className={clsx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold", c.ok ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}
          >
            {c.ok ? "✓" : "!"}
          </span>
          <span className="min-w-0 flex-1 text-[0.86rem] leading-snug">
            <span className="font-semibold text-ink">{c.label}</span>
            <span className="sr-only">{c.ok ? " — meets the rule" : " — check this"}</span>
            <span className="block text-[0.78rem] text-ink-3">{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
