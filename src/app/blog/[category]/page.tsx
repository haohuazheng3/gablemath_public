import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_CATEGORIES, postsIn } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";
import { CategoryList } from "./CategoryList";

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = BLOG_CATEGORIES.find((c) => c.slug === category);
  if (!cat) return {};
  return pageMetadata({ title: cat.title, description: cat.description, path: `/blog/${cat.slug}`, noindex: postsIn(cat.slug).length === 0 });
}

export default async function BlogCategoryPage({ params }: PageProps<"/blog/[category]">) {
  const { category } = await params;
  const cat = BLOG_CATEGORIES.find((c) => c.slug === category);
  if (!cat) notFound();
  return <CategoryList cat={cat} page={1} />;
}
