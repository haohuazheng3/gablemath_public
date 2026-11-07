import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/calculators/categories";
import { Breadcrumbs, JsonLd, PageContainer, SectionTitle } from "@/components/page/blocks";
import { PostCard } from "@/components/page/PostCard";
import { BLOG_CATEGORIES, listPosts, postsIn } from "@/lib/blog";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Guides: Home Projects & Energy Costs",
  description: "Practical, source-checked guides to concrete, landscaping, paint, flooring, tile, fencing, roofing, electricity costs and solar.",
  path: "/blog",
  noindex: listPosts().length === 0,
});

export default function BlogIndex() {
  const posts = listPosts();
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Guides", href: "/blog" },
  ];
  return (
    <PageContainer className="pt-6 sm:pt-10">
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl">
        <h1 className="display text-[2.4rem] leading-[1.08] text-ink sm:text-[3rem]">Guides</h1>
        <p className="mt-4 text-[1.06rem] leading-relaxed text-ink-2">
          The thinking behind the numbers: how to plan a job, what to buy, and what it should cost — written to be read in the
          store aisle or the night before you start.
        </p>
      </header>

      <nav aria-label="Guide categories" className="mt-8 flex flex-wrap gap-2">
        {BLOG_CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/blog/${c.slug}`} className="rounded-full bg-surface px-4 py-2 text-[0.88rem] font-medium text-ink-2 shadow-float ring-1 ring-line transition hover:text-ink active:scale-95">
            {c.name}
            <span className="ml-1.5 text-ink-3">{postsIn(c.slug).length || ""}</span>
          </Link>
        ))}
      </nav>

      {posts.length ? (
        <section className="mt-12" aria-labelledby="latest">
          <SectionTitle id="latest" eyebrow="Latest">
            New and updated guides
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 9).map((p) => (
              <PostCard key={`${p.category}/${p.slug}`} post={p} />
            ))}
          </div>
        </section>
      ) : (
        <section className="module mt-12 p-8 text-center">
          <h2 className="display text-2xl text-ink">Our first guides are being written</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-2">
            In the meantime every calculator page explains its method, the data behind it and the questions people ask most.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} className="rounded-full bg-surface-2 px-3.5 py-1.5 text-[0.84rem] font-medium text-ink-2 ring-1 ring-line hover:text-ink">
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
      <JsonLd data={breadcrumbLd(crumbs)} />
    </PageContainer>
  );
}
