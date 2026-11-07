"use client";

import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";

interface Item {
  title: string;
  href: string;
  group: string;
  hint?: string;
  terms: string;
}

let cached: Item[] | null = null;

function score(item: Item, words: string[]): number {
  let s = 0;
  const title = item.title.toLowerCase();
  for (const w of words) {
    if (title.startsWith(w)) s += 6;
    else if (title.includes(` ${w}`)) s += 4;
    else if (title.includes(w)) s += 3;
    else if (item.terms.includes(w)) s += 1;
    else return 0;
  }
  if (item.group === "Categories") s += 0.5;
  return s;
}

export function SearchPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(cached);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (cached) return;
    fetch("/search-index.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: Item[]) => {
        cached = data;
        setItems(data);
      })
      .catch((err) => {
        console.error("[search] index failed to load", err);
        setFailed(true);
      });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const results = useMemo(() => {
    if (!items) return [];
    const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length) return items.filter((i) => i.group !== "Quick answers").slice(0, 12);
    return items
      .map((i) => ({ i, s: score(i, words) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 14)
      .map((x) => x.i);
  }, [items, q]);

  function go(item: Item) {
    track("search_select", { q: q.slice(0, 60), href: item.href });
    onClose();
    router.push(item.href);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[12vh] sm:px-6" role="dialog" aria-modal="true" aria-label="Search">
      <button type="button" aria-label="Close search" onClick={onClose} className="absolute inset-0 cursor-default bg-bg/60 backdrop-blur-sm" />
      <div className="module animate-rise relative w-full max-w-xl overflow-hidden shadow-float-2">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <svg viewBox="0 0 24 24" className="size-5 text-ink-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                go(results[active]);
              }
            }}
            placeholder="Concrete for a 10x10 slab, paint for a bedroom…"
            className="h-14 w-full bg-transparent text-[1rem] text-ink outline-none placeholder:text-ink-3"
            aria-label="Search calculators"
            role="combobox"
            aria-expanded="true"
            aria-controls="gm-search-results"
          />
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-[0.72rem] font-semibold text-ink-3 ring-1 ring-line">
            Esc
          </button>
        </div>
        <ul id="gm-search-results" role="listbox" className="max-h-[52vh] overflow-auto p-2">
          {!items && !failed
            ? Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="px-2 py-2">
                  <div className="skeleton h-11" />
                </li>
              ))
            : null}
          {failed ? <li className="px-3 py-6 text-center text-[0.9rem] text-ink-3">Search is unavailable right now — browse categories from the menu.</li> : null}
          {items && !results.length ? (
            <li className="px-3 py-6 text-center text-[0.9rem] text-ink-3">No calculator matches “{q}” yet.</li>
          ) : null}
          {results.map((r, i) => (
            <li key={r.href} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={clsx(
                  "flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2.5 text-left transition active:scale-[0.99]",
                  i === active ? "bg-surface-2" : "",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.92rem] font-semibold text-ink">{r.title}</span>
                  {r.hint ? <span className="block truncate text-[0.78rem] text-ink-3">{r.hint}</span> : null}
                </span>
                <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[0.68rem] font-semibold text-ink-3">{r.group}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
