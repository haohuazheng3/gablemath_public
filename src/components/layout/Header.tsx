import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { CATEGORIES } from "@/calculators/categories";
import { HeaderActions } from "./HeaderActions";

/** Floating pill navigation, detached from the top edge. */
export function Header() {
  const cats = CATEGORIES.map((c) => ({ slug: c.slug, name: c.name, blurb: c.blurb }));
  return (
    <header className="no-print sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full border border-line bg-surface/80 pl-2 pr-1.5 shadow-float backdrop-blur-xl backdrop-saturate-150 sm:h-[60px] sm:pl-3 sm:pr-2">
        <Link href="/" aria-label="GableMath home" className="flex h-11 items-center rounded-full px-1.5 transition active:scale-95">
          <Logo />
        </Link>
        <HeaderActions categories={cats} />
      </div>
    </header>
  );
}
