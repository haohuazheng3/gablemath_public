// Crawl every sitemap URL, collect internal links on each page, and report anything that isn't 200.
// Usage: npx tsx scripts/check-links.ts [baseUrl]   (default https://gablemath.com)
const BASE = (process.argv[2] ?? "https://gablemath.com").replace(/\/$/, "");

async function locs(url: string): Promise<string[]> {
  const xml = await (await fetch(url)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace("https://gablemath.com", BASE));
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

async function main() {
  const pages: string[] = [];
  for (const child of await locs(`${BASE}/sitemap.xml`)) pages.push(...(await locs(child)));
  console.log(`${pages.length} sitemap URLs`);
  const status = new Map<string, number>();
  const linkedFrom = new Map<string, string>();
  await pool(pages, 8, async (p) => {
    const res = await fetch(p, { redirect: "manual" });
    status.set(new URL(p).pathname, res.status);
    if (res.status !== 200) return;
    const html = await res.text();
    for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
      const href = m[1];
      if (href.startsWith("/_next") || href === "/") continue;
      if (!linkedFrom.has(href)) linkedFrom.set(href, new URL(p).pathname);
    }
  });
  const toCheck = [...linkedFrom.keys()].filter((h) => !status.has(h));
  await pool(toCheck, 8, async (h) => {
    const res = await fetch(`${BASE}${h}`, { redirect: "manual" });
    status.set(h, res.status);
  });
  const bad = [...status.entries()].filter(([, s]) => s !== 200);
  console.log(`${status.size} unique URLs checked, ${bad.length} not 200`);
  for (const [u, s] of bad) console.log(`  ${s} ${u}  (linked from ${linkedFrom.get(u) ?? "sitemap"})`);
  if (bad.length) process.exit(1);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
