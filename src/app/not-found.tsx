import Link from "next/link";
import { CATEGORIES } from "@/calculators/categories";
import { CategoryIcon } from "@/components/brand/CategoryIcon";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <div className="text-center">
        <div className="eyebrow">404</div>
        <h1 className="display mt-2 text-4xl text-ink">We couldn&apos;t find that page</h1>
        <p className="mt-3 text-ink-2">The link may be old. Pick a calculator below, or use search (press /).</p>
      </div>
      <div className="mt-10 grid gap-2.5 sm:grid-cols-3">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/${c.slug}`} className="module module-raise flex items-center gap-3 p-4">
            <CategoryIcon slug={c.slug} className="size-5 text-ink-2" />
            <span className="font-semibold text-ink">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
