import { ImageResponse } from "next/og";
import { getCategory } from "@/calculators/categories";
import { CALCULATORS, getCalculator } from "@/calculators/registry";
import { OgCard } from "../../opengraph-image";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GableMath calculator";

export function generateStaticParams() {
  return CALCULATORS.map((c) => ({ category: c.meta.category, calc: c.meta.slug }));
}

export default async function Image({ params }: { params: Promise<{ category: string; calc: string }> }) {
  const { category, calc } = await params;
  const entry = getCalculator(category, calc);
  const cat = getCategory(category);
  return new ImageResponse(
    <OgCard eyebrow={cat?.name ?? "Calculator"} title={entry?.meta.name ?? "GableMath"} sub={entry?.meta.outputs.join("  ·  ") ?? ""} />,
    size,
  );
}
