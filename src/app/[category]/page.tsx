import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, getCategory } from "@/calculators/categories";
import { calculatorsIn } from "@/calculators/registry";
import { calcPath } from "@/calculators/types";
import { CategoryIcon } from "@/components/brand/CategoryIcon";
import { Breadcrumbs, JsonLd, LinkCard, PageContainer, SectionTitle, VerifiedChip } from "@/components/page/blocks";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { DATA_VERIFIED_ON } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) return {};
  return pageMetadata({ title: cat.metaTitle, description: cat.metaDescription, path: `/${cat.slug}` });
}

export default async function CategoryPage({ params }: PageProps<"/[category]">) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();
  const calcs = calculatorsIn(cat.slug);
  const crumbs = [
    { name: "Home", href: "/" },
    { name: cat.name, href: `/${cat.slug}` },
  ];
  const quick = calcs.flatMap((c) => (c.presets ?? []).slice(0, 8).map((p) => ({ href: `${calcPath(c.meta)}/${p.slug}`, label: p.h1 })));

  return (
    <PageContainer className="pt-6 sm:pt-10">
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-[16px] bg-surface text-ink shadow-float ring-1 ring-line">
            <CategoryIcon slug={cat.slug} className="size-6" />
          </span>
          <VerifiedChip date={DATA_VERIFIED_ON} />
        </div>
        <h1 className="display mt-5 text-[2.3rem] leading-[1.08] text-ink sm:text-[3rem]">{cat.h1}</h1>
        <p className="mt-4 text-[1.06rem] leading-relaxed text-ink-2">{cat.intro}</p>
      </header>

      <section className="mt-10" aria-labelledby="calcs">
        <h2 id="calcs" className="sr-only">
          Calculators
        </h2>
        {calcs.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {calcs.map((c) => (
              <LinkCard
                key={c.meta.slug}
                href={calcPath(c.meta)}
                title={c.meta.name}
                sub={c.meta.summary}
                icon={<CategoryIcon slug={cat.slug} className="size-5" />}
              />
            ))}
          </div>
        ) : (
          <div className="module p-8 text-center text-ink-2">These calculators are being checked against current data and will be live shortly.</div>
        )}
      </section>

      {quick.length ? (
        <section className="mt-16" aria-labelledby="quick">
          <SectionTitle id="quick" eyebrow="Quick answers">
            Common {cat.short.toLowerCase()} questions, already worked out
          </SectionTitle>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {quick.slice(0, 24).map((q) => (
              <li key={q.href}>
                <Link href={q.href} className="block rounded-[16px] px-4 py-3 text-[0.92rem] text-ink-2 transition hover:bg-surface hover:text-ink hover:shadow-float">
                  {q.label} <span aria-hidden className="text-ink-3">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-16" aria-labelledby="others">
        <SectionTitle id="others" eyebrow="Keep planning">
          Other calculators
        </SectionTitle>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.slug !== cat.slug).map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-[0.88rem] font-medium text-ink-2 shadow-float ring-1 ring-line transition hover:text-ink active:scale-95">
              <CategoryIcon slug={c.slug} className="size-4" />
              {c.name}
            </Link>
          ))}
        </div>
      </section>
      <JsonLd data={breadcrumbLd(crumbs)} />
    </PageContainer>
  );
}
