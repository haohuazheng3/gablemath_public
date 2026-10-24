import Link from "next/link";
import { calculatorsIn } from "@/calculators/registry";
import { calcPath } from "@/calculators/types";
import { CategoryIcon } from "@/components/brand/CategoryIcon";
import { Breadcrumbs, JsonLd, LinkCard, PageContainer, SectionTitle } from "@/components/page/blocks";
import { PostCard } from "@/components/page/PostCard";
import { POSTS_PER_PAGE, postsIn, type BlogCategory } from "@/lib/blog";
import { breadcrumbLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

/** Category hub with crawlable pagination (/blog/<cat>, /blog/<cat>/page/2 …). */
export function CategoryList({ cat, page }: { cat: BlogCategory; page: number }) {
  const all = postsIn(cat.slug);
  const pages = Math.max(1, Math.ceil(all.length / POSTS_PER_PAGE));
  const posts = all.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
  const tools = cat.calcs.flatMap((c) => calculatorsIn(c)).slice(0, 9);
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Guides", href: "/blog" },
    { name: cat.name, href: `/blog/${cat.slug}` },
  ];
  return (
    <PageContainer className="pt-6 sm:pt-10">
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl">
        <h1 className="display text-[2.3rem] leading-[1.1] text-ink sm:text-[2.8rem]">
          {cat.title}
          {page > 1 ? <span className="text-ink-3"> — page {page}</span> : null}
        </h1>
        <p className="mt-4 text-[1.04rem] leading-relaxed text-ink-2">{cat.intro}</p>
      </header>
      {posts.length ? (
        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      ) : (
        <div className="module mt-10 p-8 text-center text-ink-2">
          Guides in this category are on the way. Meanwhile, see <Link href="/blog" className="underline">all guides</Link>.
        </div>
      )}
      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-10 flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={n === 1 ? `/blog/${cat.slug}` : `/blog/${cat.slug}/page/${n}`}
              aria-current={n === page ? "page" : undefined}
              className={n === page ? "grid size-10 place-items-center rounded-full bg-ink font-semibold text-bg" : "grid size-10 place-items-center rounded-full bg-surface font-semibold text-ink-2 ring-1 ring-line"}
            >
              {n}
            </Link>
          ))}
        </nav>
      ) : null}
      {tools.length ? (
        <section className="mt-16" aria-labelledby="tools">
          <SectionTitle id="tools" eyebrow="Calculators">
            Size the job with your own numbers
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <LinkCard key={calcPath(t.meta)} href={calcPath(t.meta)} title={t.meta.name} sub={t.meta.outputs.join(" · ")} icon={<CategoryIcon slug={t.meta.category} className="size-5" />} />
            ))}
          </div>
        </section>
      ) : null}
      <JsonLd
        data={[
          breadcrumbLd(crumbs),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: cat.title,
            description: cat.description,
            url: absoluteUrl(page > 1 ? `/blog/${cat.slug}/page/${page}` : `/blog/${cat.slug}`),
            mainEntity: {
              "@type": "ItemList",
              itemListElement: posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/blog/${p.category}/${p.slug}`), name: p.title })),
            },
          },
        ]}
      />
    </PageContainer>
  );
}
