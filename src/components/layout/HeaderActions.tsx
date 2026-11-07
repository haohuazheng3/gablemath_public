"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useProjects } from "@/components/calc/projects";
import { CategoryIcon } from "@/components/brand/CategoryIcon";
import { SearchPalette } from "./SearchPalette";
import { ThemeToggle } from "./ThemeToggle";

interface Cat {
  slug: string;
  name: string;
  blurb: string;
}

export function HeaderActions({ categories }: { categories: Cat[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const projects = useProjects();
  const saved = projects.reduce((n, p) => n + p.calcs.length, 0);

  // close overlays on navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- route changed: close any open overlay
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    const openSearch = () => setSearchOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("gm:open-search", openSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("gm:open-search", openSearch);
    };
  }, []);

  return (
    <>
      <nav aria-label="Primary" className="ml-2 hidden items-center gap-0.5 md:flex">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          className={clsx(
            "h-10 rounded-full px-4 text-[0.88rem] font-semibold transition active:scale-95",
            menuOpen ? "bg-surface-3 text-ink" : "text-ink-2 hover:text-ink",
          )}
        >
          Calculators
        </button>
        <Link href="/how-we-calculate" className="h-10 rounded-full px-4 text-[0.88rem] font-semibold leading-10 text-ink-2 transition hover:text-ink active:scale-95">
          Our data
        </Link>
        <Link href="/blog" className="h-10 rounded-full px-4 text-[0.88rem] font-semibold leading-10 text-ink-2 transition hover:text-ink active:scale-95">
          Guides
        </Link>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex h-10 items-center gap-2 rounded-full px-3 text-ink-2 transition hover:bg-surface-2 hover:text-ink active:scale-95 md:w-56 md:bg-surface-2 md:ring-1 md:ring-line"
          aria-label="Search calculators"
        >
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="hidden text-[0.85rem] md:inline">Search calculators</span>
          <kbd className="ml-auto hidden rounded-md bg-surface px-1.5 text-[0.7rem] font-semibold text-ink-3 ring-1 ring-line md:inline">⌘K</kbd>
        </button>
        <Link
          href="/projects"
          className="relative flex h-10 items-center gap-1.5 rounded-full px-3 text-[0.86rem] font-semibold text-ink-2 transition hover:bg-surface-2 hover:text-ink active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 3h10l4 4v14H5zM8 3v5h7" />
          </svg>
          <span className="sr-only lg:not-sr-only">Projects</span>
          {saved ? (
            <span className="num grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.68rem] font-bold text-accent-ink">
              {saved}
              <span className="sr-only"> saved</span>
            </span>
          ) : null}
        </Link>
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="grid size-10 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 active:scale-90 md:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
          </svg>
        </button>
      </div>

      {menuOpen ? <MegaMenu categories={categories} onClose={() => setMenuOpen(false)} /> : null}
      {searchOpen ? <SearchPalette onClose={() => setSearchOpen(false)} /> : null}
    </>
  );
}

function MegaMenu({ categories, onClose }: { categories: Cat[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <button type="button" aria-label="Close menu" onClick={onClose} className="fixed inset-0 top-20 z-40 cursor-default bg-transparent" />
      <div className="animate-rise absolute inset-x-3 top-[4.6rem] z-50 mx-auto max-w-6xl sm:inset-x-5 sm:top-[5.2rem]">
        <div className="module max-h-[calc(100dvh-6.5rem)] overflow-auto p-3 shadow-float-2 sm:p-4">
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                className="group flex items-start gap-3 rounded-[18px] p-3 transition hover:bg-surface-2 active:scale-[0.98]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-2 text-ink ring-1 ring-line transition group-hover:bg-surface">
                  <CategoryIcon slug={c.slug} className="size-5" />
                </span>
                <span>
                  <span className="block text-[0.92rem] font-semibold text-ink">{c.name}</span>
                  <span className="block text-[0.8rem] leading-snug text-ink-3">{c.blurb}</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 border-t border-line px-2 pt-3 md:hidden">
            <Link href="/how-we-calculate" className="rounded-full bg-surface-2 px-3.5 py-2 text-[0.84rem] font-semibold text-ink-2">
              Our data
            </Link>
            <Link href="/blog" className="rounded-full bg-surface-2 px-3.5 py-2 text-[0.84rem] font-semibold text-ink-2">
              Guides
            </Link>
            <Link href="/about" className="rounded-full bg-surface-2 px-3.5 py-2 text-[0.84rem] font-semibold text-ink-2">
              About
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
