import type { ComponentType, ReactNode } from "react";

export type CategorySlug =
  | "measure"
  | "concrete"
  | "lumber"
  | "walls"
  | "landscaping"
  | "paint"
  | "flooring"
  | "tile"
  | "fence"
  | "roofing"
  | "electricity"
  | "solar";

export interface Category {
  slug: CategorySlug;
  name: string;
  /** Short noun used in nav chips. */
  short: string;
  blurb: string;
  /** H1 on the hub page. */
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Intro paragraph(s) on the hub page — plain text, 2–4 sentences. */
  intro: string;
}

export interface FAQ {
  q: string;
  /** Plain text answer (rendered as paragraph; also used in FAQPage JSON-LD). */
  a: string;
}

export interface SourceRef {
  label: string;
  url: string;
  /** What we took from it, e.g. "80-lb bag yields 0.60 cu ft". */
  note?: string;
  /** ISO date we last confirmed it. */
  checked: string;
}

/** Serializable, server-safe description of one calculator page. */
export interface CalculatorMeta {
  /** URL segment under the category, e.g. "slab-calculator" → /concrete/slab-calculator */
  slug: string;
  category: CategorySlug;
  name: string; // "Concrete Slab Calculator"
  shortName: string; // "Slabs & patios"
  h1: string;
  metaTitle: string; // ≤ 60 chars, no brand (template adds it)
  metaDescription: string; // ≤ 158 chars
  /** One or two sentences directly under the H1. */
  summary: string;
  /** What the user can expect to get (shown as chips): e.g. ["Bags by size", "Ready-mix yards", "Cost"]. */
  outputs: string[];
  faq: FAQ[];
  sources: SourceRef[];
  /** Keys "category/slug" of calculators that naturally come next in a project. */
  related: string[];
  /** ISO date this page's data/logic was last reviewed. */
  updated: string;
  /** Optional search synonyms for the site search. */
  keywords?: string[];
  /** Featured on the home page / hub top. */
  featured?: boolean;
}

/** A programmatic long-tail page: the calculator pre-filled with one concrete scenario. */
export interface Preset<V = Record<string, unknown>> {
  /** URL segment, e.g. "10x10-4-inch" → /concrete/slab-calculator/10x10-4-inch */
  slug: string;
  values: V;
  h1: string; // the question as people search it
  metaTitle: string;
  metaDescription: string;
  /** Short label used in link lists, e.g. "10×10 slab, 4 in". */
  label: string;
  /** Optional grouping label for link hubs, e.g. "Patio sizes". */
  group?: string;
}

export interface PresetAnswer {
  /** One-sentence direct answer with the key numbers. Rendered prominently and server-side. */
  headline: string;
  /** 3–6 supporting facts specific to this scenario. */
  bullets: string[];
  /** Optional comparison table specific to this scenario. */
  table?: { caption: string; columns: string[]; rows: (string | number)[][] };
  /** Optional scenario-specific notes (plain text paragraphs). */
  notes?: string[];
}

export interface CalculatorEntry<V = Record<string, unknown>> {
  meta: CalculatorMeta;
  /** Client component: the interactive calculator. Receives initial values (preset or default). */
  Calculator: ComponentType<{ initial?: Partial<V>; presetSlug?: string }>;
  /** Server component: long-form guidance below the calculator. */
  Content: ComponentType;
  presets?: Preset<V>[];
  /** Server-side: compute the direct answer for a preset page (pure; same math as the client). */
  presetAnswer?: (values: V) => PresetAnswer;
  /** Server-side: optional extra section for preset pages (e.g. neighbor sizes table). */
  PresetExtra?: ComponentType<{ preset: Preset<V> }>;
}

export type CalcKey = `${CategorySlug}/${string}`;

export function calcKey(meta: Pick<CalculatorMeta, "category" | "slug">): CalcKey {
  return `${meta.category}/${meta.slug}` as CalcKey;
}

export function calcPath(meta: Pick<CalculatorMeta, "category" | "slug">): string {
  return `/${meta.category}/${meta.slug}`;
}

export type Children = { children?: ReactNode };
