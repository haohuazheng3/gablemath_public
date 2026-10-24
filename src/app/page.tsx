import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/calculators/categories";
import { CALCULATORS, calculatorsIn } from "@/calculators/registry";
import { calcPath } from "@/calculators/types";
import { CategoryIcon } from "@/components/brand/CategoryIcon";
import { HomeSearch } from "@/components/home/HomeSearch";
import { PageContainer, SectionTitle, VerifiedChip } from "@/components/page/blocks";
import { pageMetadata } from "@/lib/seo";
import { DATA_VERIFIED_ON, SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: `${SITE.name} — Home Project & Energy Cost Calculators`,
  description: SITE.description,
  path: "/",
});

const POPULAR = [
  { q: "Concrete for a 10×10 slab", href: "/concrete/slab-calculator/10x10-4-inch" },
  { q: "Mulch bags for my beds", href: "/landscaping/mulch-calculator" },
  { q: "Paint for a 12×12 room", href: "/paint/paint-calculator/12x12-room" },
  { q: "Space heater cost per month", href: "/electricity/space-heater-cost-calculator" },
  { q: "Is solar worth it in Texas?", href: "/solar/solar-payback-calculator/texas" },
  { q: "Shingle bundles for my roof", href: "/roofing/roofing-calculator" },
];

const PROMISES = [
  {
    title: "Numbers from the source",
    body: "Bag yields come from manufacturer data sheets, electricity prices from the EIA, sun hours from NREL. Every page shows when we last checked.",
    icon: (
      <path d="M9 12.5 11 14.5 15.5 10M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6z" />
    ),
  },
  {
    title: "Every unit you'll shop in",
    body: "Bags, yards, tons, boxes, rolls, gallons — side by side, rounded to what stores actually sell, with your local prices if you enter them.",
    icon: <path d="M3 7h18M6 7v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7M9 7V4h6v3M10 11v5M14 11v5" />,
  },
  {
    title: "Plan the whole job",
    body: "Save each calculation to a project and get one combined shopping list. No account, nothing to sign up for — it stays in your browser.",
    icon: <path d="M5 3h10l4 4v14H5zM8 3v5h7M8 13h8M8 17h5" />,
  },
];

export default function HomePage() {
  const featured = CALCULATORS.filter((c) => c.meta.featured).slice(0, 6);
  return (
    <>
      <section className="relative overflow-hidden">
        <PageContainer className="pb-12 pt-14 text-center sm:pb-20 sm:pt-24">
          <div className="flex justify-center">
            <VerifiedChip date={DATA_VERIFIED_ON} />
          </div>
          <h1 className="display mx-auto mt-6 max-w-4xl text-[2.9rem] leading-[1.02] text-ink sm:text-[4.6rem]">
            Measure once.
            <br />
            <span className="text-ink-3">Buy right.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[1.08rem] leading-relaxed text-ink-2 sm:text-[1.18rem]">
            Free calculators for concrete, gravel, paint, flooring, tile, fencing, roofing — and what your appliances and solar panels
            really cost to run in your state. Real product data, every unit you&apos;ll shop in, nothing to sign up for.
          </p>
          <div className="mt-9 flex justify-center">
            <HomeSearch />
          </div>
          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
            {POPULAR.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="rounded-full bg-surface/70 px-3.5 py-1.5 text-[0.82rem] font-medium text-ink-2 ring-1 ring-line backdrop-blur transition hover:bg-surface hover:text-ink active:scale-95"
              >
                {p.q}
              </Link>
            ))}
          </div>
        </PageContainer>
      </section>

      <PageContainer>
        <section aria-labelledby="cats">
          <h2 id="cats" className="sr-only">
            Calculator categories
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c, i) => {
              const n = calculatorsIn(c.slug).length;
              return (
                <Link
                  key={c.slug}
                  href={`/${c.slug}`}
                  className="module module-raise animate-rise group relative flex min-h-[148px] flex-col justify-between p-5 sm:p-6"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <span className="grid size-12 place-items-center rounded-[16px] bg-surface-2 text-ink ring-1 ring-line transition group-hover:bg-accent group-hover:text-accent-ink group-hover:ring-accent">
                      <CategoryIcon slug={c.slug} className="size-6" />
                    </span>
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.72rem] font-semibold text-ink-3">
                      {n ? `${n} calculator${n === 1 ? "" : "s"}` : "Coming soon"}
                    </span>
                  </div>
                  <div className="mt-6">
                    <div className="text-[1.12rem] font-semibold text-ink">{c.name}</div>
                    <div className="mt-1 text-[0.88rem] leading-snug text-ink-3">{c.blurb}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {featured.length ? (
          <section className="mt-24" aria-labelledby="featured">
            <SectionTitle id="featured" eyebrow="Most used">
              Start with a calculator
            </SectionTitle>
            <div className="grid gap-3 md:grid-cols-2">
              {featured.map((c) => (
                <Link key={calcPath(c.meta)} href={calcPath(c.meta)} className="module module-raise group flex items-start gap-4 p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-surface-2 text-ink ring-1 ring-line">
                    <CategoryIcon slug={c.meta.category} className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{c.meta.name}</span>
                    <span className="mt-1 block text-[0.88rem] leading-snug text-ink-3">{c.meta.summary}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-24" aria-labelledby="why">
          <SectionTitle id="why" eyebrow="Why GableMath">
            Built for the moment you&apos;re standing in the store aisle
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-3">
            {PROMISES.map((p) => (
              <div key={p.title} className="module p-6">
                <span className="grid size-11 place-items-center rounded-[14px] bg-accent-soft text-accent">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {p.icon}
                  </svg>
                </span>
                <h3 className="mt-5 text-[1.05rem] font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-2">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-[0.9rem] text-ink-3">
            Curious how the math works?{" "}
            <Link href="/how-we-calculate" className="font-semibold text-ink underline underline-offset-4">
              See our methods and sources
            </Link>
          </p>
        </section>
      </PageContainer>
    </>
  );
}
