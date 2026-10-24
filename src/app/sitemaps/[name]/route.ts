import { sitemapSections, urlsFor, xmlEscape } from "@/lib/sitemap-data";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return sitemapSections().map((s) => ({ name: `${s.name}.xml` }));
}

export async function GET(_req: Request, ctx: RouteContext<"/sitemaps/[name]">) {
  const { name } = await ctx.params;
  const urls = urlsFor(name.replace(/\.xml$/, ""));
  if (!urls) return new Response("Not found", { status: 404 });
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}
</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
