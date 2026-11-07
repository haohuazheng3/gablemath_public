"use client";

export function HomeSearch() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("gm:open-search"))}
      className="module group flex h-16 w-full max-w-xl items-center gap-3 px-5 text-left shadow-float-2 transition active:scale-[0.99] sm:h-[68px]"
    >
      <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="flex-1 truncate text-[1rem] text-ink-3">Search calculators — try “10x12 patio” or “space heater”</span>
      <span className="hidden rounded-full bg-ink px-4 py-2 text-[0.84rem] font-semibold text-bg sm:inline">Search</span>
    </button>
  );
}
