"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    try {
      const t = localStorage.getItem("gm-theme");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved theme after hydration
      if (t === "light" || t === "dark") setMode(t);
    } catch {
      /* storage unavailable — follow the system theme */
    }
  }, []);

  function cycle() {
    const next: Mode = mode === "system" ? "dark" : mode === "dark" ? "light" : "system";
    setMode(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    try {
      if (next === "system") localStorage.removeItem("gm-theme");
      else localStorage.setItem("gm-theme", next);
    } catch {
      /* storage unavailable — theme applies to this page only */
    }
  }

  const label = mode === "system" ? "Theme: automatic" : mode === "dark" ? "Theme: dark" : "Theme: light";
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${label}. Change theme`}
      title={label}
      className="grid size-10 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink active:scale-90"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {mode === "dark" ? (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        ) : mode === "light" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v18" />
            <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
          </>
        )}
      </svg>
    </button>
  );
}
