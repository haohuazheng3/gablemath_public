import { CATEGORIES } from "@/calculators/categories";
import { calculatorsIn } from "@/calculators/registry";
import { calcPath } from "@/calculators/types";
import { absoluteUrl, formatVerified, DATA_VERIFIED_ON, SITE } from "@/lib/site";

export const dynamic = "force-static";

/** llms.txt — a plain map of the site for AI assistants and answer engines. */
export function GET() {
  const lines: string[] = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    `Free web calculators for U.S. homeowners and DIYers. Inputs are imperial with a metric toggle. Product coverage and yields come from manufacturer technical data sheets; electricity prices from the U.S. Energy Information Administration; solar resource data from NREL. Data last checked ${formatVerified(DATA_VERIFIED_ON)}. No account required.`,
    "",
    "## Methodology",
    `- [How we calculate](${absoluteUrl("/how-we-calculate")}): formulas, data sources and update schedule`,
    `- [About](${absoluteUrl("/about")})`,
    "",
  ];
  for (const c of CATEGORIES) {
    const calcs = calculatorsIn(c.slug);
    if (!calcs.length) continue;
    lines.push(`## ${c.name}`, "", `${c.blurb}`, "");
    for (const k of calcs) {
      lines.push(`- [${k.meta.name}](${absoluteUrl(calcPath(k.meta))}): ${k.meta.metaDescription}`);
    }
    lines.push("");
  }
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
