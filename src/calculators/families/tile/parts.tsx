// UI pieces shared by the tile-family calculators. Imported only by the "use client" calculator
// components, so it runs on the client with them.

import { clsx } from "clsx";
import { useState, type ReactNode } from "react";
import { NumberField, Segmented, SelectField } from "@/components/calc/fields";
import { fmtJoint } from "./compute";
import { GROUTS, JOINT_OPTIONS, MORTARS, TILE_FORMATS, TROWELS, type GroutKind } from "./data";

export function MoreOptions({ label, children, defaultOpen = false }: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
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

export function TileSizePicker({ value, onChange, custom = true, help }: { value: string; onChange: (id: string) => void; custom?: boolean; help?: ReactNode }) {
  const opts = TILE_FORMATS.filter((f) => custom || f.id !== "custom").map((f) => ({ value: f.id as string, label: f.label, sub: f.sub }));
  return <Segmented label="Tile size" columns={4} value={value} options={opts} onChange={onChange} help={help} />;
}

export function JointPicker({ value, onChange, help }: { value: number; onChange: (v: number) => void; help?: ReactNode }) {
  const known = JOINT_OPTIONS.some((o) => o.value === value);
  return (
    <>
      <Segmented label="Grout joint" columns={4} value={known ? value : -1} options={JOINT_OPTIONS} onChange={(j) => j > 0 && onChange(j)} help={help} />
      {!known ? <NumberField label="Exact joint" value={value} onChange={onChange} suffix="in" step={0.0625} min={0.03} max={0.75} decimals={4} /> : null}
    </>
  );
}

export function ChipPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Segmented
      label="Mosaic chip size"
      columns={3}
      value={value}
      options={[
        { value: 1, label: "1 in", sub: "penny, 1×1" },
        { value: 2, label: "2 in", sub: "2×2, hex" },
        { value: 3, label: "3 in", sub: "3×3" },
      ]}
      onChange={onChange}
      help="Grout follows the size of each chip, not the 12 × 12 sheet."
    />
  );
}

export function TrowelSelect({ value, onChange, autoLabel }: { value: string; onChange: (v: string) => void; autoLabel: string }) {
  return (
    <SelectField
      label="Trowel notch"
      value={value}
      onChange={onChange}
      options={[{ value: "auto", label: `Recommended for this tile — ${autoLabel}` }, ...TROWELS.map((t) => ({ value: t.id as string, label: t.label }))]}
      help="Bigger tile needs a deeper notch. Check coverage by lifting a tile: 80% contact indoors, 95% in showers and outdoors."
    />
  );
}

export function MortarSelect({ value, onChange, autoLabel }: { value: string; onChange: (v: string) => void; autoLabel: string }) {
  return (
    <SelectField
      label="Thinset (mortar)"
      value={value}
      onChange={onChange}
      options={[
        { value: "auto", label: `Recommended — ${autoLabel}` },
        ...MORTARS.map((m) => ({ value: m.id, label: `${m.short} · ${m.size} ${m.unit}${m.equivalent ? ` (${m.equivalent})` : ""}`, group: m.group })),
      ]}
    />
  );
}

const KIND_LABEL: Record<GroutKind, string> = { sanded: "Sanded / fine aggregate", unsanded: "Unsanded", premixed: "Pre-mixed (pail)", epoxy: "Epoxy" };

export function GroutSelect({ value, onChange, autoLabel }: { value: string; onChange: (v: string) => void; autoLabel: string }) {
  return (
    <SelectField
      label="Grout"
      value={value}
      onChange={onChange}
      options={[{ value: "auto", label: `Recommended for the joint — ${autoLabel}` }, ...GROUTS.map((g) => ({ value: g.id, label: g.short, group: KIND_LABEL[g.kind] }))]}
    />
  );
}

export function jointLabel(j: number): string {
  return `${fmtJoint(j)} in`;
}
