import { absoluteUrl } from "@/lib/site";
import { sitemapSections } from "@/lib/sitemap-data";

export const dynamic = "force-static";

/** Sitemap index: one child sitemap per section, each with its real last-modified date. */
export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapSections()
  .map((s) => `  <sitemap><loc>${absoluteUrl(`/sitemaps/${s.name}.xml`)}</loc><lastmod>${s.lastmod}</lastmod></sitemap>`)
  .join("\n")}
</sitemapindex>`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
