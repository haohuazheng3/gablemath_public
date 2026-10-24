// Declarative "quick tool" definitions: a list of fields plus a pure compute function.
// Shared by the client renderer (QuickCalc) and the unit tests; never imported by server pages.

import type { CostLine } from "@/components/calc/CostLines";
import type { ShoppingItem } from "@/components/calc/projects";

export type QVal = string | number | boolean;
export type QValues = Record<string, QVal>;

interface FieldBase<V extends QValues> {
  key: keyof V & string;
  label: string;
  help?: string;
  /** Hide the field unless this returns true for the current values. */
  showIf?: (v: V) => boolean;
}

export type QField<V extends QValues> =
  | (FieldBase<V> & { kind: "length"; base?: "ft" | "in"; allowZero?: boolean })
  | (FieldBase<V> & { kind: "number"; prefix?: string; suffix?: string; step?: number; min?: number; max?: number; decimals?: number })
  | (FieldBase<V> & { kind: "select"; options: { value: string; label: string; group?: string }[] })
  | (FieldBase<V> & { kind: "segmented"; options: { value: string | number; label: string; sub?: string }[]; columns?: number })
  | (FieldBase<V> & { kind: "toggle" });

export interface QSection<V extends QValues> {
  title?: string;
  /** Collapsed behind a disclosure button (advanced inputs). */
  more?: boolean;
  fields: QField<V>[];
}

export interface QTable {
  title?: string;
  caption: string;
  columns: string[];
  rows: (string | number)[][];
  highlight?: number;
  note?: string;
}

export interface QResult {
  hero: { label: string; value: string; unit?: string; sub?: string };
  /** Short value for the mobile results dock; defaults to hero value + unit. */
  dock?: string;
  stats?: { label: string; value: string; unit?: string; hint?: string; emphasis?: boolean }[];
  tables?: QTable[];
  notes?: { tone: "info" | "tip" | "warn" | "ok"; title?: string; text: string }[];
  shopping?: ShoppingItem[];
  costs?: CostLine[];
  costFootnote?: string;
  /** One-line plain-text summary used when saving or sharing. */
  summary: string;
}

export interface QuickDef<V extends QValues = QValues> {
  /** "category/slug" */
  key: string;
  name: string;
  defaults: V;
  sections: QSection<V>[];
  compute: (v: V, ctx: { metric: boolean }) => QResult;
  /** Show the imperial/metric switch (only when fields are length-based). */
  unitToggle?: boolean;
}

export function defineTool<V extends QValues>(def: QuickDef<V>): QuickDef<V> {
  return def;
}
