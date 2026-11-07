import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_CATEGORIES, POSTS_PER_PAGE, postsIn } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";
import { CategoryList } from "../../CategoryList";

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_CATEGORIES.flatMap((c) => {
    const pages = Math.ceil(postsIn(c.slug).length / POSTS_PER_PAGE);
    return Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({ category: c.slug, n: String(i + 2) }));
  });
}

export async function generateMetadata({ params }: PageProps<"/blog/[category]/page/[n]">): Promise<Metadata> {
  const { category, n } = await params;
  const cat = BLOG_CATEGORIES.find((c) => c.slug === category);
  if (!cat) return {};
  return pageMetadata({ title: `${cat.title} — Page ${n}`, description: cat.description, path: `/blog/${cat.slug}/page/${n}` });
}

export default async function BlogCategoryPaged({ params }: PageProps<"/blog/[category]/page/[n]">) {
  const { category, n } = await params;
  const cat = BLOG_CATEGORIES.find((c) => c.slug === category);
  const page = Number(n);
  if (!cat || !Number.isInteger(page) || page < 2) notFound();
  return <CategoryList cat={cat} page={page} />;
}
