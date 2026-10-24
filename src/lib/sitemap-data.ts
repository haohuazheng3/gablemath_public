import { CATEGORIES } from "@/calculators/categories";
import { calculatorsIn } from "@/calculators/registry";
import { calcPath, type CategorySlug } from "@/calculators/types";
import { listPosts } from "@/lib/blog";
import { absoluteUrl, DATA_VERIFIED_ON } from "@/lib/site";

export interface SitemapUrl {
  loc: string;
  lastmod: string;
}

/** Site pages that aren't calculators. lastmod is the real date their content last changed. */
const CORE: { path: string; lastmod: string }[] = [
  { path: "/", lastmod: DATA_VERIFIED_ON },
  { path: "/about", lastmod: "2026-10-23" },
  { path: "/how-we-calculate", lastmod: DATA_VERIFIED_ON },
  { path: "/faq", lastmod: "2026-10-23" },
  { path: "/changelog", lastmod: "2026-10-23" },
  { path: "/contact", lastmod: "2026-10-23" },
  { path: "/privacy", lastmod: "2026-10-23" },
  { path: "/terms", lastmod: "2026-10-23" },
  { path: "/cookies", lastmod: "2026-10-23" },
];

export function coreUrls(): SitemapUrl[] {
  const urls = CORE.map((c) => ({ loc: absoluteUrl(c.path), lastmod: c.lastmod }));
  const posts = listPosts();
  if (posts.length) {
    urls.push({ loc: absoluteUrl("/blog"), lastmod: posts[0].updated });
    const cats = new Map<string, string>();
    for (const p of posts) if (!cats.has(p.category) || cats.get(p.category)! < p.updated) cats.set(p.category, p.updated);
    for (const [c, d] of cats) urls.push({ loc: absoluteUrl(`/blog/${c}`), lastmod: d });
    for (const p of posts) urls.push({ loc: absoluteUrl(`/blog/${p.category}/${p.slug}`), lastmod: p.updated });
  }
  return urls;
}

export function categoryUrls(slug: CategorySlug): SitemapUrl[] {
  const calcs = calculatorsIn(slug);
  if (!calcs.length) return [];
  const newest = calcs.map((c) => c.meta.updated).sort().at(-1) ?? DATA_VERIFIED_ON;
  const urls: SitemapUrl[] = [{ loc: absoluteUrl(`/${slug}`), lastmod: newest }];
  for (const c of calcs) {
    urls.push({ loc: absoluteUrl(calcPath(c.meta)), lastmod: c.meta.updated });
    for (const p of c.presets ?? []) urls.push({ loc: absoluteUrl(`${calcPath(c.meta)}/${p.slug}`), lastmod: c.meta.updated });
  }
  return urls;
}

export function sitemapSections(): { name: string; lastmod: string }[] {
  const out = [{ name: "core", lastmod: coreUrls().map((u) => u.lastmod).sort().at(-1)! }];
  for (const c of CATEGORIES) {
    const urls = categoryUrls(c.slug);
    if (urls.length) out.push({ name: c.slug, lastmod: urls.map((u) => u.lastmod).sort().at(-1)! });
  }
  return out;
}

export function urlsFor(name: string): SitemapUrl[] | null {
  if (name === "core") return coreUrls();
  const c = CATEGORIES.find((x) => x.slug === name);
  return c ? categoryUrls(c.slug) : null;
}

export function allUrls(): string[] {
  return sitemapSections().flatMap((s) => (urlsFor(s.name) ?? []).map((u) => u.loc));
}

export function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
