import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory } from "@/calculators/categories";
import { CALCULATORS, getByKey, getCalculator } from "@/calculators/registry";
import { calcKey, calcPath } from "@/calculators/types";
import { CategoryIcon } from "@/components/brand/CategoryIcon";
import { AdSlot } from "@/components/page/AdSlot";
import { Feedback } from "@/components/page/Feedback";
import { Breadcrumbs, Chip, FaqList, JsonLd, LinkCard, PageContainer, SectionTitle, SourceList, VerifiedChip } from "@/components/page/blocks";
import { listPosts } from "@/lib/blog";
import { breadcrumbLd, calculatorLd, faqLd, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return CALCULATORS.map((c) => ({ category: c.meta.category, calc: c.meta.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[category]/[calc]">): Promise<Metadata> {
  const { category, calc } = await params;
  const entry = getCalculator(category, calc);
  if (!entry) return {};
  return pageMetadata({ title: entry.meta.metaTitle, description: entry.meta.metaDescription, path: calcPath(entry.meta), ogImage: `${calcPath(entry.meta)}/opengraph-image` });
}

export default async function CalculatorPage({ params }: PageProps<"/[category]/[calc]">) {
  const { category, calc } = await params;
  const entry = getCalculator(category, calc);
  const cat = getCategory(category);
  if (!entry || !cat) notFound();
  const { meta, Calculator, Content } = entry;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: cat.name, href: `/${cat.slug}` },
    { name: meta.name, href: calcPath(meta) },
  ];
  const related = meta.related.map((k) => getByKey(k)).filter((x): x is NonNullable<typeof x> => !!x);
  const guides = listPosts().filter((p) => p.related.includes(calcKey(meta))).slice(0, 3);
  const presets = entry.presets ?? [];
  const groups = new Map<string, typeof presets>();
  for (const p of presets) {
    const g = p.group ?? "Common sizes";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(p);
  }

  return (
    <PageContainer className="pt-6 sm:pt-10">
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl">
        <h1 className="display text-[2.15rem] leading-[1.08] text-ink sm:text-[2.8rem]">{meta.h1}</h1>
        <p className="mt-3 text-[1.05rem] leading-relaxed text-ink-2">{meta.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <VerifiedChip date={meta.updated} />
          {meta.outputs.map((o) => (
            <Chip key={o}>{o}</Chip>
          ))}
        </div>
      </header>

      <div className="mt-8">
        <Calculator />
      </div>

      <div className="mt-8">
        <Feedback calcKey={calcKey(meta)} />
      </div>

      <AdSlot name="after-calculator" />

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="prose-gm min-w-0 max-w-[72ch]">
          <Content />
        </article>
        <aside className="no-print space-y-4 lg:sticky lg:top-28 lg:self-start">
          {related.length ? (
            <div className="module p-4">
              <div className="eyebrow mb-3 px-1">Next in your project</div>
              <ul className="space-y-1">
                {related.map((r) => (
                  <li key={calcKey(r.meta)}>
                    <Link href={calcPath(r.meta)} className="flex items-center gap-3 rounded-[14px] px-2.5 py-2 text-[0.9rem] font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink">
                      <CategoryIcon slug={r.meta.category} className="size-4 shrink-0" />
                      {r.meta.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {guides.length ? (
            <div className="module p-4">
              <div className="eyebrow mb-3 px-1">Deciding? Read</div>
              <ul className="space-y-1">
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/blog/${g.category}/${g.slug}`} className="block rounded-[14px] px-2.5 py-2 text-[0.9rem] font-medium leading-snug text-ink-2 transition hover:bg-surface-2 hover:text-ink">
                      {g.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="module p-4">
            <div className="eyebrow mb-2 px-1">Plan the whole job</div>
            <p className="px-1 text-[0.86rem] leading-relaxed text-ink-2">
              Save each calculation to a project and get one combined shopping list — no account needed.
            </p>
            <Link href="/projects" className="mt-3 inline-flex h-9 items-center rounded-full bg-ink px-4 text-[0.82rem] font-semibold text-bg active:scale-95">
              Open my projects
            </Link>
          </div>
          <AdSlot name="sidebar" minHeight={600} />
        </aside>
      </div>

      {presets.length ? (
        <section className="mt-16" aria-labelledby="quick-answers">
          <SectionTitle id="quick-answers" eyebrow="Quick answers">
            Already worked out for common jobs
          </SectionTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            {[...groups.entries()].map(([g, list]) => (
              <div key={g} className="module p-5">
                <h3 className="mb-3 text-[0.95rem] font-semibold text-ink">{g}</h3>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {list.map((p) => (
                    <li key={p.slug}>
                      <Link href={`${calcPath(meta)}/${p.slug}`} className="block rounded-[12px] px-2.5 py-1.5 text-[0.88rem] text-ink-2 transition hover:bg-surface-2 hover:text-ink">
                        {p.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {meta.faq.length ? (
        <section className="mt-16" aria-labelledby="faq">
          <SectionTitle id="faq" eyebrow="FAQ">
            Questions people ask
          </SectionTitle>
          <FaqList faq={meta.faq} />
        </section>
      ) : null}

      <section className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-labelledby="sources">
        <div>
          <SectionTitle id="sources" eyebrow="Sources">
            Where these numbers come from
          </SectionTitle>
          <SourceList sources={meta.sources} />
          <p className="mt-5 text-[0.84rem] leading-relaxed text-ink-3">
            We re-check product specs and price data on a schedule and note the date on every page. Found something out of date?{" "}
            <Link href="/contact" className="text-ink-2 underline underline-offset-2">
              Tell us
            </Link>
            .
          </p>
        </div>
        {related.length ? (
          <div className="space-y-3">
            <div className="eyebrow">Related calculators</div>
            {related.slice(0, 3).map((r) => (
              <LinkCard key={calcKey(r.meta)} href={calcPath(r.meta)} title={r.meta.name} sub={r.meta.summary} icon={<CategoryIcon slug={r.meta.category} className="size-5" />} />
            ))}
          </div>
        ) : null}
      </section>

      <JsonLd
        data={[
          calculatorLd({ name: meta.name, description: meta.metaDescription, path: calcPath(meta), updated: meta.updated }),
          breadcrumbLd(crumbs),
          ...(meta.faq.length ? [faqLd(meta.faq)] : []),
        ]}
      />
    </PageContainer>
  );
}
