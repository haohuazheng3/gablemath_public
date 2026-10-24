"use client";

// Input and result building blocks shared by the landscaping calculators (components only).

import { clsx } from "clsx";
import { useState, type ReactNode } from "react";
import { LengthField, NumberField, Segmented } from "@/components/calc/fields";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { allowsSections, type AreaValues } from "./area-model";
import type { TruckPlan } from "./compute";
import { TRUCK } from "./data";
import { tonsText, weightText } from "./display";

type AreaPatch = Partial<AreaValues & { vol: number; vu: string }>;

/** Shape picker + dimensions + up to two extra rectangles. */
export function AreaFields({
  v,
  set,
  shapes,
  lengthLabel = "Length",
  widthLabel = "Width",
}: {
  v: AreaValues & { vol?: number; vu?: string };
  set: (patch: AreaPatch) => void;
  shapes: { value: string; label: string; sub?: string }[];
  lengthLabel?: string;
  widthLabel?: string;
}) {
  return (
    <>
      {shapes.length > 1 ? <Segmented label="Shape" columns={shapes.length} value={v.shape} options={shapes} onChange={(shape) => set({ shape })} /> : null}
      {v.shape === "circle" ? (
        <LengthField label="Diameter" value={v.l1} onChange={(l1) => set({ l1 })} hint="edge to edge" />
      ) : v.shape === "ring" ? (
        <div className="grid grid-cols-2 gap-3">
          <LengthField label="Ring across" value={v.l1} onChange={(l1) => set({ l1 })} hint="outer edge" />
          <NumberField label="Trunk" value={v.tr ?? 0} onChange={(tr) => set({ tr })} suffix="in" step={1} min={0} max={120} decimals={1} stepper={false} hint="diameter" />
        </div>
      ) : v.shape === "sqft" ? (
        <NumberField label="Total area" value={v.a1} onChange={(a1) => set({ a1 })} suffix="sq ft" step={10} min={0} max={1_000_000} decimals={1} help="Add up the beds: length × width for each rectangle." />
      ) : v.shape === "vol" ? (
        <div className="space-y-3">
          <NumberField label="Amount you're ordering" value={v.vol ?? 0} onChange={(vol) => set({ vol })} suffix={v.vu === "ton" ? "tons" : "cu yd"} step={0.5} min={0} max={10_000} decimals={2} />
          <Segmented
            label="Measured in"
            value={v.vu ?? "yd"}
            options={[
              { value: "yd", label: "Cubic yards" },
              { value: "ton", label: "Tons" },
            ]}
            onChange={(vu) => set({ vu })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <LengthField label={lengthLabel} value={v.l1} onChange={(l1) => set({ l1 })} />
          <LengthField label={widthLabel} value={v.w1} onChange={(w1) => set({ w1 })} />
        </div>
      )}
      {allowsSections(v.shape) ? (
        <>
          {v.sections >= 2 ? <ExtraSection n={2} l={v.l2} w={v.w2} onL={(l2) => set({ l2 })} onW={(w2) => set({ w2 })} onRemove={() => set({ sections: 1 })} /> : null}
          {v.sections >= 3 ? <ExtraSection n={3} l={v.l3} w={v.w3} onL={(l3) => set({ l3 })} onW={(w3) => set({ w3 })} onRemove={() => set({ sections: 2 })} /> : null}
          {v.sections < 3 ? (
            <button
              type="button"
              onClick={() => set({ sections: v.sections + 1 })}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong text-[0.86rem] font-semibold text-ink-2 transition hover:border-accent hover:text-accent active:scale-[0.99]"
            >
              + Add another rectangle <span className="font-normal text-ink-3">(L-shapes, side beds)</span>
            </button>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function ExtraSection({ n, l, w, onL, onW, onRemove }: { n: number; l: number; w: number; onL: (v: number) => void; onW: (v: number) => void; onRemove: () => void }) {
  return (
    <div className="animate-rise rounded-[16px] border border-line bg-surface-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.8rem] font-semibold text-ink-2">Area {n}</span>
        <button type="button" onClick={onRemove} className="rounded-full px-2 py-0.5 text-[0.76rem] font-semibold text-ink-3 hover:text-bad">
          Remove
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LengthField label="Length" value={l} onChange={onL} />
        <LengthField label="Width" value={w} onChange={onW} />
      </div>
    </div>
  );
}

/** Preset depths plus an exact field (any value off the presets deselects them). */
export function DepthFields({
  label,
  value,
  options,
  onChange,
  help,
  exactLabel = "Exact depth",
  max = 36,
}: {
  label: string;
  value: number;
  options: { value: number; label: string; sub?: string }[];
  onChange: (d: number) => void;
  help?: ReactNode;
  exactLabel?: string;
  max?: number;
}) {
  const custom = !options.some((o) => o.value === value);
  return (
    <>
      <Segmented label={label} columns={options.length} value={custom ? -1 : value} options={options} onChange={(d) => d > 0 && onChange(d)} help={help} />
      <NumberField label={exactLabel} value={value} onChange={onChange} suffix="in" step={0.5} min={0} max={max} decimals={2} />
    </>
  );
}

/** Collapsible "more options" block. */
export function MoreOptions({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-[0.99]"
      >
        {title}
        <span aria-hidden className={clsx("transition-transform duration-200", open && "rotate-180")}>
          ⌄
        </span>
      </button>
      {open ? <div className="animate-rise mt-4 space-y-4">{children}</div> : null}
    </div>
  );
}

/** "Bags or bulk?" card: two priced tiles, a break-even sentence and an inline price editor. */
export function BuyCompare({
  heading,
  bagsTitle,
  bagCost,
  bulkTitle,
  bulkCost,
  bulkNote,
  cheaper,
  children,
  editor,
}: {
  heading: string;
  bagsTitle: string;
  bagCost?: number;
  bulkTitle: string;
  bulkCost?: number;
  bulkNote: string;
  cheaper: "bags" | "bulk" | "unknown";
  children: ReactNode;
  editor: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[18px] border border-line p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[0.95rem] font-semibold text-ink">{heading}</h3>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-[0.78rem] font-semibold text-accent active:scale-95">
          {open ? "Done" : "Edit prices"}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <CompareTile title={bagsTitle} value={bagCost != null ? fmtMoney(bagCost) : "—"} win={cheaper === "bags"} note={bagCost != null ? "materials, before tax" : "no bag price — add one"} />
        <CompareTile title={bulkTitle} value={bulkCost != null ? fmtMoney(bulkCost) : "—"} win={cheaper === "bulk"} note={bulkNote} />
      </div>
      <div className="mt-3 text-[0.84rem] leading-relaxed text-ink-2">{children}</div>
      {open ? <div className="animate-rise mt-4 grid grid-cols-2 gap-3">{editor}</div> : null}
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

/** Truck and pickup planning for heavy materials. */
export function HaulCard({
  tons,
  weightLb,
  truck,
  trips,
  payloadLb,
  metric,
  onPayload,
}: {
  tons: number;
  weightLb: number;
  truck: TruckPlan;
  trips: number;
  payloadLb: number;
  metric: boolean;
  onPayload: (lb: number) => void;
}) {
  const perTrip = payloadLb > 0 && tons > 0 ? Math.min(1, payloadLb / weightLb) : 0;
  return (
    <div className="rounded-[18px] border border-line p-4">
      <h3 className="text-[0.95rem] font-semibold text-ink">Getting it home</h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <dt className="text-[0.74rem] text-ink-3">Total weight</dt>
          <dd className="num text-[0.88rem] font-semibold text-ink">
            {tonsText(tons, metric)} · {weightText(weightLb, metric)}
          </dd>
        </div>
        <div>
          <dt className="text-[0.74rem] text-ink-3">Dump truck</dt>
          <dd className="text-[0.88rem] font-semibold text-ink">
            {truck.loads === 0 ? "—" : `${fmtInt(truck.loads)} ${truck.truck} load${truck.loads > 1 ? "s" : ""}`}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[0.74rem] text-ink-3">Your pickup</dt>
          <dd className="text-[0.88rem] font-semibold text-ink">
            {trips > 0 ? `${fmtInt(trips)} trip${trips > 1 ? "s" : ""} at ${fmtInt(payloadLb)} lb payload` : "—"}
            {perTrip > 0 && perTrip < 1 ? <span className="font-normal text-ink-3"> · about {fmt(perTrip * 100, 0)}% of the order per trip</span> : null}
          </dd>
        </div>
      </dl>
      <div className="mt-3 max-w-[14rem]">
        <NumberField label="Pickup payload" value={payloadLb} onChange={onPayload} suffix="lb" step={100} min={0} max={10_000} decimals={0} stepper={false} />
      </div>
      <p className="mt-2 text-[0.76rem] leading-snug text-ink-3">
        Payload is on the Tire &amp; Loading sticker in the driver&apos;s door jamb. Single-axle dump trucks carry about {TRUCK.singleAxleTons} tons; bigger orders come on a tandem
        (up to {TRUCK.tandemTons} tons).
      </p>
    </div>
  );
}
