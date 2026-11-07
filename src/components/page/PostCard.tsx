import Link from "next/link";
import { BLOG_CATEGORIES, type PostMeta } from "@/lib/blog";

export function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function PostCard({ post }: { post: PostMeta }) {
  const cat = BLOG_CATEGORIES.find((c) => c.slug === post.category);
  return (
    <Link href={`/blog/${post.category}/${post.slug}`} className="module module-raise flex h-full flex-col p-5">
      <span className="eyebrow">{cat?.name}</span>
      <span className="mt-2 text-[1.05rem] font-semibold leading-snug text-ink">{post.title}</span>
      <span className="mt-2 line-clamp-3 text-[0.88rem] leading-relaxed text-ink-3">{post.description}</span>
      <span className="mt-auto pt-4 text-[0.78rem] text-ink-3">
        Updated {fmtDate(post.updated)} · {post.readingMinutes} min read
      </span>
    </Link>
  );
}
