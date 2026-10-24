import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { renderMarkdown } from "@/lib/markdown";
import type { CalculatorMeta, CategorySlug, FAQ, SourceRef } from "../types";

// Quick-tool pages: one Markdown file per tool in content/tools/<slug>.md.
// Frontmatter carries the page meta (title, h1, faq, sources…); the body is the guide below
// the calculator. Like the blog, this content lives only in the private repo.

const ROOT = path.join(process.cwd(), "content", "tools");

export interface QuickPage {
  meta: CalculatorMeta;
  html: string;
}

const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ""));
const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);

function read(file: string): QuickPage | null {
  const { data, content } = matter(fs.readFileSync(path.join(ROOT, file), "utf8"));
  if (data.draft) return null;
  const faq: FAQ[] = (Array.isArray(data.faq) ? data.faq : []).map((f: { q: string; a: string }) => ({ q: String(f.q), a: String(f.a) }));
  const sources: SourceRef[] = (Array.isArray(data.sources) ? data.sources : []).map((s: Record<string, unknown>) => ({
    label: String(s.label),
    url: String(s.url),
    note: s.note ? String(s.note) : undefined,
    checked: day(s.checked ?? data.updated),
  }));
  const meta: CalculatorMeta = {
    slug: file.replace(/\.md$/, ""),
    category: String(data.category) as CategorySlug,
    name: String(data.name),
    shortName: String(data.shortName ?? data.name),
    h1: String(data.h1),
    metaTitle: String(data.title),
    metaDescription: String(data.description),
    summary: String(data.summary),
    outputs: list(data.outputs),
    faq,
    sources,
    related: list(data.related),
    updated: day(data.updated),
    keywords: list(data.keywords),
    featured: !!data.featured,
  };
  return { meta, html: renderMarkdown(content).html };
}

let cache: QuickPage[] | null = null;

export function quickPages(): QuickPage[] {
  if (cache) return cache;
  cache = fs.existsSync(ROOT)
    ? fs
        .readdirSync(ROOT)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .map(read)
        .filter((p): p is QuickPage => !!p)
    : [];
  return cache;
}
