import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory } from "@/calculators/categories";
import { CALCULATORS, getCalculator } from "@/calculators/registry";
import { calcKey, calcPath } from "@/calculators/types";
import { AdSlot } from "@/components/page/AdSlot";
import { Feedback } from "@/components/page/Feedback";
import { Breadcrumbs, JsonLd, PageContainer, SectionTitle, SourceList, VerifiedChip } from "@/components/page/blocks";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return CALCULATORS.flatMap((c) => (c.presets ?? []).map((p) => ({ category: c.meta.category, calc: c.meta.slug, preset: p.slug })));
}

function find(category: string, calc: string, preset: string) {
  const entry = getCalculator(category, calc);
  const p = entry?.presets?.find((x) => x.slug === preset);
  return entry && p ? { entry, preset: p } : null;
}

export async function generateMetadata({ params }: PageProps<"/[category]/[calc]/[preset]">): Promise<Metadata> {
  const { category, calc, preset } = await params;
  const hit = find(category, calc, preset);
  if (!hit) return {};
  const path = `${calcPath(hit.entry.meta)}/${hit.preset.slug}`;
  return pageMetadata({ title: hit.preset.metaTitle, description: hit.preset.metaDescription, path, ogImage: `${calcPath(hit.entry.meta)}/opengraph-image` });
}

export default async function PresetPage({ params }: PageProps<"/[category]/[calc]/[preset]">) {
  const { category, calc, preset: presetSlug } = await params;
  const hit = find(category, calc, presetSlug);
  const cat = getCategory(category);
  if (!hit || !cat) notFound();
  const { entry, preset } = hit;
  const { meta, Calculator, PresetExtra } = entry;
  const answer = entry.presetAnswer?.(preset.values);
  const path = `${calcPath(meta)}/${preset.slug}`;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: cat.name, href: `/${cat.slug}` },
    { name: meta.name, href: calcPath(meta) },
    { name: preset.label, href: path },
  ];
  const siblings = (entry.presets ?? []).filter((p) => p.slug !== preset.slug && (p.group ?? "") === (preset.group ?? "")).slice(0, 12);

  return (
    <PageContainer className="pt-6 sm:pt-10">
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl">
        <h1 className="display text-[2rem] leading-[1.1] text-ink sm:text-[2.6rem]">{preset.h1}</h1>
        <div className="mt-4">
          <VerifiedChip date={meta.updated} />
        </div>
      </header>

      {answer ? (
        <section aria-labelledby="answer" className="module mt-7 max-w-3xl p-5 sm:p-7">
          <h2 id="answer" className="eyebrow">
            Short answer
          </h2>
          <p className="mt-2 text-[1.2rem] font-semibold leading-snug text-ink sm:text-[1.35rem]">{answer.headline}</p>
          <ul className="mt-4 space-y-2">
            {answer.bullets.map((b) => (
              <li key={b} className="flex gap-2.5 text-[0.98rem] leading-relaxed text-ink-2">
                <span aria-hidden className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-accent" />
                {b}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="adjust">
        <h2 id="adjust" className="display mb-4 text-[1.5rem] text-ink">
          Adjust it to your exact job
        </h2>
        <Calculator initial={preset.values} presetSlug={preset.slug} />
      </section>

      <div className="mt-8">
        <Feedback calcKey={calcKey(meta)} />
      </div>

      <AdSlot name="after-calculator" />

      {answer?.table ? (
        <section className="mt-14 max-w-3xl" aria-labelledby="compare">
          <SectionTitle id="compare" eyebrow="Compare">
            {answer.table.caption}
          </SectionTitle>
          <div className="module overflow-x-auto p-2">
            <table className="w-full min-w-[480px] text-[0.92rem]">
              <thead>
                <tr>
                  {answer.table.columns.map((c) => (
                    <th key={c} scope="col" className="px-3.5 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-ink-3">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {answer.table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    {r.map((cell, j) => (
                      <td key={j} className={j === 0 ? "px-3.5 py-2.5 font-medium text-ink" : "num px-3.5 py-2.5 text-ink-2"}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {answer?.notes?.length ? (
        <section className="prose-gm mt-12 max-w-[72ch]" aria-labelledby="notes">
          <h2 id="notes">How this was worked out</h2>
          {answer.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
          <p>
            The full method, material data and tips are on the main{" "}
            <Link href={calcPath(meta)}>{meta.name.toLowerCase()}</Link> page.
          </p>
        </section>
      ) : null}

      {PresetExtra ? (
        <div className="mt-12">
          <PresetExtra preset={preset} />
        </div>
      ) : null}

      {siblings.length ? (
        <section className="mt-14" aria-labelledby="similar">
          <SectionTitle id="similar" eyebrow="Similar jobs">
            Other sizes people check
          </SectionTitle>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link href={`${calcPath(meta)}/${s.slug}`} className="module module-raise block px-4 py-3 text-[0.92rem] font-medium text-ink-2 hover:text-ink">
                  {s.h1}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-14 max-w-3xl" aria-labelledby="sources">
        <SectionTitle id="sources" eyebrow="Sources">
          Data behind this answer
        </SectionTitle>
        <SourceList sources={meta.sources} />
      </section>

      <JsonLd
        data={[
          breadcrumbLd(crumbs),
          ...(answer
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: [{ "@type": "Question", name: preset.h1, acceptedAnswer: { "@type": "Answer", text: `${answer.headline} ${answer.bullets.join(" ")}`, url: absoluteUrl(path) } }],
                },
              ]
            : []),
        ]}
      />
    </PageContainer>
  );
}
