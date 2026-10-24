import { buildSearchIndex } from "@/calculators/search";

// Prerendered at build time and served from the CDN; the header search loads it on first open.
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildSearchIndex(), {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
