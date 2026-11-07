import { CATEGORIES } from "./categories";
import { CALCULATORS } from "./registry";
import { calcPath } from "./types";

export interface SearchItem {
  title: string;
  href: string;
  group: string;
  hint?: string;
  terms: string;
}

/** Small, serializable index for the header search (calculators + hubs + top presets). */
export function buildSearchIndex(): SearchItem[] {
  const items: SearchItem[] = [];
  for (const c of CATEGORIES) {
    items.push({ title: c.h1, href: `/${c.slug}`, group: "Categories", hint: c.blurb, terms: `${c.name} ${c.short} ${c.blurb}`.toLowerCase() });
  }
  for (const calc of CALCULATORS) {
    const cat = CATEGORIES.find((c) => c.slug === calc.meta.category);
    items.push({
      title: calc.meta.name,
      href: calcPath(calc.meta),
      group: cat?.name ?? "Calculators",
      hint: calc.meta.summary.slice(0, 90),
      terms: `${calc.meta.name} ${calc.meta.shortName} ${(calc.meta.keywords ?? []).join(" ")} ${cat?.name ?? ""}`.toLowerCase(),
    });
    for (const p of (calc.presets ?? []).slice(0, 6)) {
      items.push({
        title: p.h1,
        href: `${calcPath(calc.meta)}/${p.slug}`,
        group: "Quick answers",
        terms: `${p.h1} ${p.label} ${calc.meta.shortName}`.toLowerCase(),
      });
    }
  }
  return items;
}
