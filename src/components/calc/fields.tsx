"use client";

import { clsx } from "clsx";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { fmt } from "@/lib/format";
import {
  convertLength,
  formatFeetInches,
  parseLength,
  toFeet,
  type LengthUnit,
} from "@/lib/units";
import { useUnits } from "./units-context";

/* ───────────────────────── shared bits ───────────────────────── */

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[0.86rem] font-semibold text-ink">
        {children}
      </label>
      {hint ? <span className="text-[0.75rem] text-ink-3">{hint}</span> : null}
    </div>
  );
}

export function FieldHelp({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-[0.78rem] leading-snug text-ink-3">{children}</p>;
}

const wellInput =
  "w-full min-w-0 bg-transparent text-[1.05rem] font-medium text-ink outline-none placeholder:text-ink-3 num";

function Well({ children, invalid, className }: { children: ReactNode; invalid?: boolean; className?: string }) {
  return (
    <div
      className={clsx(
        "well flex h-12 items-center gap-2 px-3.5 transition-[box-shadow,border-color] duration-150 focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-soft)]",
        invalid && "border-bad! shadow-[0_0_0_4px_var(--bad-soft)]!",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ───────────────────────── length ───────────────────────── */

const IMPERIAL_FOR: Record<"ft" | "in", LengthUnit[]> = { ft: ["ft", "in", "yd"], in: ["in", "ft"] };
const METRIC_FOR: Record<"ft" | "in", LengthUnit[]> = { ft: ["m", "cm"], in: ["cm", "mm"] };

/**
 * Length input. `value` is always in `base` units (ft or in). The visible unit can be switched
 * (ft/in/yd or m/cm/mm) and free text like 10'6" or 3.2m is understood.
 */
export function LengthField({
  label,
  value,
  onChange,
  base = "ft",
  help,
  hint,
  min = 0,
  allowZero = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  base?: "ft" | "in";
  help?: ReactNode;
  hint?: ReactNode;
  min?: number;
  allowZero?: boolean;
}) {
  const id = useId();
  const { system } = useUnits();
  const choices = system === "metric" ? METRIC_FOR[base] : IMPERIAL_FOR[base];
  const [unit, setUnit] = useState<LengthUnit>(choices[0]);
  const [text, setText] = useState(() => fmt(value, 3));
  const [invalid, setInvalid] = useState(false);
  const focused = useRef(false);

  // follow unit-system switches
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- unit list changed with the global system
    setUnit(choices[0]);
  }, [choices]);

  // reflect external value / unit changes when not typing
  useEffect(() => {
    if (focused.current) return;
    const shown = convertLength(value, base, unit);
     
    setText(Number.isFinite(shown) ? fmt(shown, unit === "mm" ? 0 : 3) : "");
  }, [value, unit, base]);

  function commit(raw: string) {
    const feet = parseLength(raw, unit);
    if (feet == null || feet < 0 || (!allowZero && feet === 0 && raw.trim() !== "")) {
      setInvalid(raw.trim() !== "");
      return;
    }
    setInvalid(false);
    const inBase = base === "ft" ? feet : feet * 12;
    if (inBase >= min) onChange(inBase);
  }

  const feetValue = base === "ft" ? value : value / 12;
  const showFtIn = system === "imperial" && (unit === "ft" || unit === "in") && value > 0;

  return (
    <div>
      <FieldLabel htmlFor={id} hint={hint}>
        {label}
      </FieldLabel>
      <Well invalid={invalid}>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          className={wellInput}
          value={text}
          onFocus={(e) => {
            focused.current = true;
            e.currentTarget.select();
          }}
          onBlur={() => {
            focused.current = false;
            const shown = convertLength(value, base, unit);
            setText(fmt(shown, unit === "mm" ? 0 : 3));
            setInvalid(false);
          }}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          aria-invalid={invalid || undefined}
        />
        <select
          aria-label={`${label} unit`}
          className="h-8 cursor-pointer rounded-lg bg-surface-3 px-2 text-[0.82rem] font-semibold text-ink-2 outline-none"
          value={unit}
          onChange={(e) => setUnit(e.target.value as LengthUnit)}
        >
          {choices.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </Well>
      {invalid ? (
        <FieldHelp>
          <span className="text-bad">Try a number like 12, 12.5, 12&apos;6&quot; or 3.8m.</span>
        </FieldHelp>
      ) : help ? (
        <FieldHelp>{help}</FieldHelp>
      ) : showFtIn ? (
        <FieldHelp>
          = {formatFeetInches(feetValue)}
          {base === "ft" && feetValue > 0 ? ` · ${fmt(toFeet(feetValue, "ft") / 3.280839895, 2)} m` : ""}
        </FieldHelp>
      ) : null}
    </div>
  );
}

/* ───────────────────────── plain number ───────────────────────── */

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min = 0,
  max,
  decimals = 2,
  help,
  hint,
  stepper = true,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  help?: ReactNode;
  hint?: ReactNode;
  stepper?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(() => fmt(value, decimals));
  const focused = useRef(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (focused.current) return;
     
    setText(fmt(value, decimals));
  }, [value, decimals]);

  function commit(raw: string) {
    const n = Number(raw.replace(/[,$%\s]/g, ""));
    if (!Number.isFinite(n) || n < min || (max != null && n > max)) {
      setInvalid(raw.trim() !== "");
      return;
    }
    setInvalid(false);
    onChange(n);
  }

  function bump(dir: 1 | -1) {
    const next = Math.round((value + dir * step) / step) * step;
    const bounded = Math.max(min, max != null ? Math.min(max, next) : next);
    onChange(Number(bounded.toFixed(6)));
  }

  return (
    <div>
      <FieldLabel htmlFor={id} hint={hint}>
        {label}
      </FieldLabel>
      <Well invalid={invalid} className="pr-1.5">
        {prefix ? <span className="text-ink-3 font-medium">{prefix}</span> : null}
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className={wellInput}
          value={text}
          onFocus={(e) => {
            focused.current = true;
            e.currentTarget.select();
          }}
          onBlur={() => {
            focused.current = false;
            setText(fmt(value, decimals));
            setInvalid(false);
          }}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          aria-invalid={invalid || undefined}
        />
        {suffix ? <span className="whitespace-nowrap pr-1 text-[0.85rem] font-medium text-ink-3">{suffix}</span> : null}
        {stepper ? (
          <span className="flex shrink-0 items-center gap-1">
            <StepBtn label={`Decrease ${label}`} onClick={() => bump(-1)}>
              −
            </StepBtn>
            <StepBtn label={`Increase ${label}`} onClick={() => bump(1)}>
              +
            </StepBtn>
          </span>
        ) : null}
      </Well>
      {invalid ? (
        <FieldHelp>
          <span className="text-bad">
            Enter a number{max != null ? ` between ${fmt(min)} and ${fmt(max)}` : min > 0 ? ` of at least ${fmt(min)}` : ""}.
          </span>
        </FieldHelp>
      ) : help ? (
        <FieldHelp>{help}</FieldHelp>
      ) : null}
    </div>
  );
}

function StepBtn({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-[10px] bg-surface text-[1.1rem] font-semibold text-ink-2 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-line transition active:scale-90 active:bg-accent-soft"
    >
      {children}
    </button>
  );
}

/* ───────────────────────── segmented ───────────────────────── */

export interface SegOption<T extends string | number> {
  value: T;
  label: string;
  sub?: string;
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  help,
  columns,
}: {
  label: string;
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  help?: ReactNode;
  columns?: number;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={id}>
      <div id={id} className="mb-1.5 text-[0.86rem] font-semibold text-ink">
        {label}
      </div>
      <div
        className="well grid gap-1 p-1"
        style={{ gridTemplateColumns: `repeat(${columns ?? Math.min(options.length, 4)}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={clsx(
                "min-h-10 rounded-[11px] px-2 py-1.5 text-center text-[0.86rem] font-semibold transition-[background,color,box-shadow,transform] duration-150 active:scale-[0.97]",
                active
                  ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08),0_6px_14px_-8px_rgba(0,0,0,0.25)] ring-1 ring-line"
                  : "text-ink-3 hover:text-ink-2",
              )}
            >
              <span className="block leading-tight">{o.label}</span>
              {o.sub ? <span className="block text-[0.7rem] font-medium text-ink-3">{o.sub}</span> : null}
            </button>
          );
        })}
      </div>
      {help ? <FieldHelp>{help}</FieldHelp> : null}
    </div>
  );
}

/* ───────────────────────── select ───────────────────────── */

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  help,
  hint,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; group?: string }[];
  help?: ReactNode;
  hint?: ReactNode;
}) {
  const id = useId();
  const groups = useMemo(() => {
    const map = new Map<string, { value: T; label: string }[]>();
    for (const o of options) {
      const g = o.group ?? "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(o);
    }
    return [...map.entries()];
  }, [options]);
  return (
    <div>
      <FieldLabel htmlFor={id} hint={hint}>
        {label}
      </FieldLabel>
      <Well className="relative pr-9">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={clsx(wellInput, "cursor-pointer appearance-none text-[1rem]")}
        >
          {groups.map(([g, opts]) =>
            g ? (
              <optgroup key={g} label={g}>
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              opts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            ),
          )}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="pointer-events-none absolute right-3.5 size-4 text-ink-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Well>
      {help ? <FieldHelp>{help}</FieldHelp> : null}
    </div>
  );
}

/* ───────────────────────── toggle ───────────────────────── */

export function ToggleField({
  label,
  checked,
  onChange,
  help,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  help?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-[0.86rem] font-semibold text-ink">
          {label}
        </label>
        {help ? <FieldHelp>{help}</FieldHelp> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150",
          checked ? "bg-accent" : "bg-surface-3 ring-1 ring-line-strong",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 size-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-[var(--ease-spring)]",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

/* ───────────────────────── layout helpers ───────────────────────── */

export function FieldGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  return (
    <div
      className={clsx(
        "grid gap-4",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "sm:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

export function FieldSection({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <div className="flex items-center justify-between">
        <legend className="eyebrow">{title}</legend>
        {aside}
      </div>
      {children}
    </fieldset>
  );
}
