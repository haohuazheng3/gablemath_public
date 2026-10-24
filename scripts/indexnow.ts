// Push every sitemap URL to IndexNow (Bing, Yandex, Seznam, Naver…) in batches of ≤10,000.
// Usage: INDEXNOW_KEY=… npx tsx scripts/indexnow.ts
async function urlsFromSitemap(index: string): Promise<string[]> {
  const xml = await (await fetch(index)).text();
  const children = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const out: string[] = [];
  for (const c of children) {
    if (!c.endsWith(".xml")) {
      out.push(c);
      continue;
    }
    const sub = await (await fetch(c)).text();
    out.push(...[...sub.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  return out;
}

async function main() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) throw new Error("INDEXNOW_KEY missing");
  const urls = await urlsFromSitemap("https://gablemath.com/sitemap.xml");
  console.log(`${urls.length} URLs from sitemap`);
  for (let i = 0; i < urls.length; i += 10000) {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: "gablemath.com", key, keyLocation: "https://gablemath.com/indexnow-key.txt", urlList: urls.slice(i, i + 10000) }),
    });
    console.log(`batch ${i / 10000 + 1}: HTTP ${res.status} ${await res.text()}`);
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
