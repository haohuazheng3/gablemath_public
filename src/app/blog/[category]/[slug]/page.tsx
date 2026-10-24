import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getByKey } from "@/calculators/registry";
import { calcPath } from "@/calculators/types";
import { Breadcrumbs, FaqList, JsonLd, LinkCard, PageContainer, SectionTitle, SourceList } from "@/components/page/blocks";
import { fmtDate } from "@/components/page/PostCard";
import { CategoryIcon } from "@/components/brand/CategoryIcon";
import { AdSlot } from "@/components/page/AdSlot";
import { allPosts, BLOG_CATEGORIES, getPost } from "@/lib/blog";
import { articleLd, breadcrumbLd, faqLd, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return allPosts().map((p) => ({ category: p.category, slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await params;
  const post = getPost(category, slug);
  if (!post) return {};
  return pageMetadata({ title: post.title, description: post.description, path: `/blog/${category}/${slug}`, type: "article", publishedTime: post.published, modifiedTime: post.updated });
}

export default async function ArticlePage({ params }: PageProps<"/blog/[category]/[slug]">) {
  const { category, slug } = await params;
  const post = getPost(category, slug);
  const cat = BLOG_CATEGORIES.find((c) => c.slug === category);
  if (!post || !cat) notFound();
  const path = `/blog/${category}/${slug}`;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Guides", href: "/blog" },
    { name: cat.name, href: `/blog/${cat.slug}` },
    { name: post.h1, href: path },
  ];
  const related = post.related.map((k) => getByKey(k)).filter((x): x is NonNullable<typeof x> => !!x);
  return (
    <PageContainer className="pt-6 sm:pt-10">
      <Breadcrumbs items={crumbs} />
      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="min-w-0">
          <header className="max-w-[72ch]">
            <Link href={`/blog/${cat.slug}`} className="eyebrow hover:text-ink">
              {cat.name}
            </Link>
            <h1 className="display mt-3 text-[2.2rem] leading-[1.1] text-ink sm:text-[2.8rem]">{post.h1}</h1>
            <p className="mt-4 text-[1.08rem] leading-relaxed text-ink-2">{post.description}</p>
            <p className="mt-5 text-[0.84rem] text-ink-3">
              By the {SITE.name} team · Published <time dateTime={post.published}>{fmtDate(post.published)}</time>
              {post.updated !== post.published ? (
                <>
                  {" "}
                  · Updated <time dateTime={post.updated}>{fmtDate(post.updated)}</time>
                </>
              ) : null}{" "}
              · {post.readingMinutes} min read
            </p>
          </header>
          {post.verdict ? (
            <section aria-label="Quick verdict" className="module mt-8 max-w-[72ch] p-5 sm:p-6">
              <div className="eyebrow">Quick verdict</div>
              <p className="mt-2 text-[1.05rem] font-medium leading-relaxed text-ink">{post.verdict.answer}</p>
              {post.verdict.picks.length ? (
                <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                  {post.verdict.picks.map((p) => (
                    <div key={p.when} className="rounded-[16px] bg-surface-2 px-4 py-3 ring-1 ring-line">
                      <dt className="text-[0.78rem] text-ink-3">{p.when}</dt>
                      <dd className="mt-0.5 text-[0.95rem] font-semibold text-ink">{p.pick}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {post.verdict.cta ? (
                <Link href={post.verdict.cta.href} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.88rem] font-semibold text-bg transition active:scale-95">
                  {post.verdict.cta.label} <span aria-hidden>→</span>
                </Link>
              ) : null}
            </section>
          ) : null}
          <div className="prose-gm mt-8 max-w-[72ch]" dangerouslySetInnerHTML={{ __html: post.html }} />
          <AdSlot name="in-content" />
          {post.faq.length ? (
            <section className="mt-14 max-w-[72ch]" aria-labelledby="faq">
              <SectionTitle id="faq" eyebrow="FAQ">
                Questions people ask
              </SectionTitle>
              <FaqList faq={post.faq} />
            </section>
          ) : null}
          {post.sources.length ? (
            <section className="mt-14 max-w-[72ch]" aria-labelledby="sources">
              <SectionTitle id="sources" eyebrow="Sources">
                Where these numbers come from
              </SectionTitle>
              <SourceList sources={post.sources} />
            </section>
          ) : null}
        </article>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          {post.toc.length > 2 ? (
            <nav aria-label="On this page" className="module p-4">
              <div className="eyebrow mb-2 px-1">On this page</div>
              <ul className="space-y-1 text-[0.86rem]">
                {post.toc.map((t) => (
                  <li key={t.id} className={t.level === 3 ? "pl-3" : ""}>
                    <a href={`#${t.id}`} className="block rounded-lg px-1 py-1 text-ink-2 hover:text-ink">
                      {t.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          {related.map((r) => (
            <LinkCard key={calcPath(r.meta)} href={calcPath(r.meta)} title={r.meta.name} sub={r.meta.outputs.join(" · ")} icon={<CategoryIcon slug={r.meta.category} className="size-5" />} />
          ))}
        </aside>
      </div>
      <JsonLd
        data={[
          articleLd({ headline: post.h1, description: post.description, path, published: post.published, modified: post.updated }),
          breadcrumbLd(crumbs),
          ...(post.faq.length ? [faqLd(post.faq)] : []),
        ]}
      />
    </PageContainer>
  );
}
