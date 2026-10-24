import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { CategorySlug, FAQ, SourceRef } from "@/calculators/types";
import { renderMarkdown, type TocItem } from "./markdown";

// Blog = Markdown files in content/blog/<category>/<slug>.md with frontmatter:
//   title, h1?, description, published (YYYY-MM-DD), updated (YYYY-MM-DD), related (calc keys), draft,
//   verdict? { answer, picks: [{ when, pick }], cta: { label, href } }, faq? [{ q, a }], sources? [{ label, url, note }]
// Articles live only in the private repo (the public mirror never includes .md content).

export interface BlogCategory {
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  /** Calculator categories linked from this guide hub. */
  calcs: CategorySlug[];
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  {
    slug: "concrete",
    name: "Concrete & masonry",
    title: "Concrete Guides",
    description: "Pouring slabs, footings and posts: planning, mixing, curing and cost.",
    intro: "Practical guides for pouring concrete yourself and for knowing what to ask a contractor.",
    calcs: ["concrete"],
  },
  {
    slug: "landscaping",
    name: "Landscaping",
    title: "Landscaping & Driveway Guides",
    description: "Driveways, patios, mulch and rock compared on cost, upkeep and lifespan, with the numbers to order the right amount.",
    intro:
      "Hardscape and ground-cover choices last for decades, so the cheapest quote is rarely the cheapest option. These guides compare driveways, patios, mulch and rock on installed cost, upkeep and lifespan using contractor and extension-service data, and link straight to the calculators that turn your measurements into tons, yards and bags.",
    calcs: ["landscaping", "measure"],
  },
  {
    slug: "painting",
    name: "Painting & staining",
    title: "Painting Guides",
    description: "Interior and exterior paint, primer and stain: products, prep and coverage.",
    intro: "What separates a two-coat job from a four-coat one, and how to buy the right amount.",
    calcs: ["paint"],
  },
  {
    slug: "flooring-tile",
    name: "Flooring & tile",
    title: "Flooring & Tile Guides",
    description: "Vinyl plank vs laminate, grout vs caulk and other flooring and tile decisions, settled with manufacturer specs.",
    intro:
      "Flooring and tile decisions turn on details that showrooms gloss over: how a plank handles water, which joints need grout and which need caulk, and what the warranty actually covers. These guides answer those questions from manufacturer installation guides and industry standards, then point you to the calculators that size the order.",
    calcs: ["flooring", "tile"],
  },
  {
    slug: "fencing",
    name: "Fencing",
    title: "Fence Guides",
    description: "Fence materials compared on cost, lifespan and upkeep, plus layout and post-setting advice.",
    intro:
      "A fence is mostly posts, and the material you hang between them decides how often you will be back out there with a brush or a hammer. These guides compare fence materials on what they cost over their life, not just on day one, and link to calculators for posts, panels and concrete.",
    calcs: ["fence"],
  },
  {
    slug: "roofing",
    name: "Roofing & siding",
    title: "Roofing & Siding Guides",
    description: "Metal vs shingles, vinyl vs fiber cement siding: lifespan, cost and resale value compared.",
    intro:
      "Roofing and siding are the most expensive weatherproofing decisions on a house, and the options differ more in lifespan and upkeep than in first price. These guides line up installed cost, expected life, wind and fire ratings and resale data, then link to the calculators that measure your roof and walls in squares.",
    calcs: ["roofing"],
  },
  {
    slug: "energy",
    name: "Energy costs",
    title: "Home Energy Guides",
    description: "Water heaters, dryers, furnaces and heat pumps compared on running cost at today's electricity and gas prices.",
    intro:
      "The appliance that is cheaper to buy is often the one that costs more every month. These guides compare water heaters, dryers and heating systems on lifetime cost using current EIA electricity and natural gas prices and Department of Energy efficiency ratings, and link to calculators that redo the math with your own rates.",
    calcs: ["electricity", "solar"],
  },
  {
    slug: "solar",
    name: "Solar",
    title: "Solar Guides",
    description: "Leasing vs buying solar, batteries and payback by state, with current incentive rules.",
    intro:
      "Whether solar pays depends on how you pay for it, what your utility credits for exported power and which incentives are still available. These guides walk through those choices with current federal rules and utility tariffs, and link to the calculators that estimate payback for your state and usage.",
    calcs: ["solar", "electricity"],
  },
];

export interface PostMeta {
  slug: string;
  category: string;
  title: string;
  description: string;
  published: string;
  updated: string;
  related: string[];
  readingMinutes: number;
}

export interface Verdict {
  answer: string;
  picks: { when: string; pick: string }[];
  cta?: { label: string; href: string };
}

export interface Post extends PostMeta {
  h1: string;
  html: string;
  toc: TocItem[];
  verdict?: Verdict;
  faq: FAQ[];
  sources: SourceRef[];
}

const ROOT = path.join(process.cwd(), "content", "blog");

const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ""));

function readFile(category: string, file: string): Post | null {
  const raw = fs.readFileSync(path.join(ROOT, category, file), "utf8");
  const { data, content } = matter(raw);
  if (data.draft) return null;
  const { html, toc, words } = renderMarkdown(content);
  const v = data.verdict as Verdict | undefined;
  const published = day(data.published);
  return {
    slug: file.replace(/\.md$/, ""),
    category,
    title: String(data.title ?? ""),
    h1: String(data.h1 ?? data.title ?? ""),
    description: String(data.description ?? ""),
    published,
    updated: day(data.updated ?? data.published),
    related: Array.isArray(data.related) ? data.related.map(String) : [],
    readingMinutes: Math.max(1, Math.round(words / 230)),
    html,
    toc,
    verdict: v?.answer ? { answer: String(v.answer), picks: (v.picks ?? []).map((p) => ({ when: String(p.when), pick: String(p.pick) })), cta: v.cta } : undefined,
    faq: (Array.isArray(data.faq) ? data.faq : []).map((f: FAQ) => ({ q: String(f.q), a: String(f.a) })),
    sources: (Array.isArray(data.sources) ? data.sources : []).map((x: Record<string, unknown>) => ({
      label: String(x.label),
      url: String(x.url),
      note: x.note ? String(x.note) : undefined,
      checked: day(x.checked ?? data.updated ?? data.published),
    })),
  };
}

let cache: Post[] | null = null;

export function allPosts(): Post[] {
  if (cache) return cache;
  const out: Post[] = [];
  if (fs.existsSync(ROOT)) {
    for (const c of BLOG_CATEGORIES) {
      const dir = path.join(ROOT, c.slug);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith(".md")) continue;
        const p = readFile(c.slug, f);
        if (p && p.title && p.published) out.push(p);
      }
    }
  }
  out.sort((a, b) => (a.published < b.published ? 1 : -1));
  cache = out;
  return out;
}

export function listPosts(): PostMeta[] {
  return allPosts().map((p) => ({
    slug: p.slug,
    category: p.category,
    title: p.title,
    description: p.description,
    published: p.published,
    updated: p.updated,
    related: p.related,
    readingMinutes: p.readingMinutes,
  }));
}

export function postsIn(category: string): PostMeta[] {
  return listPosts().filter((p) => p.category === category);
}

export function getPost(category: string, slug: string): Post | undefined {
  return allPosts().find((p) => p.category === category && p.slug === slug);
}

export const POSTS_PER_PAGE = 12;
