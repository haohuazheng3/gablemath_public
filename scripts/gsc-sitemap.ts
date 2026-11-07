// Submit the sitemap index to Search Console and read back what Google has on file.
// Usage: npx tsx scripts/gsc-sitemap.ts [--submit]
import { googleAccessToken, GSC_PROPERTY } from "../src/lib/google";

const SITEMAP = "https://gablemath.com/sitemap.xml";

async function main() {
  const token = await googleAccessToken(["https://www.googleapis.com/auth/webmasters"]);
  const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_PROPERTY)}/sitemaps`;
  if (process.argv.includes("--submit")) {
    const res = await fetch(`${base}/${encodeURIComponent(SITEMAP)}`, { method: "PUT", headers: { authorization: `Bearer ${token}` } });
    console.log(`submit ${SITEMAP} → HTTP ${res.status}`);
    if (!res.ok) throw new Error(await res.text());
  }
  const list = await fetch(base, { headers: { authorization: `Bearer ${token}` } });
  console.log(JSON.stringify(await list.json(), null, 2));
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
