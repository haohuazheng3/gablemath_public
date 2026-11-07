"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "gm-consent";

function loadAnalytics() {
  if (document.querySelector('script[src="https://flowglance.com/fw.js"]')) return;
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://flowglance.com/fw.js";
  s.setAttribute("data-site", "fw_pub_8kcAuBJNuLCCopt2IrZa8z2d");
  document.head.appendChild(s);
}

/**
 * Floating consent card. Shown once until the visitor chooses. Opt-in regions see it as a real
 * choice before analytics load; elsewhere analytics run and the card offers a one-tap opt-out.
 */
export function ConsentBanner() {
  const [show, setShow] = useState(false);
  const [optIn, setOptIn] = useState(false);

  useEffect(() => {
    let choice: string | null = null;
    try {
      choice = localStorage.getItem(KEY);
    } catch {
      /* storage blocked: treat as undecided */
    }
    const region = window.__gmConsentRegion ?? "opt-out";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read consent state after hydration
    setOptIn(region === "opt-in");
    // Opt-in regions must choose before analytics load; elsewhere the notice waits a moment so it
    // never competes with the first thing the visitor came to do.
    const timer = !choice ? window.setTimeout(() => setShow(true), region === "opt-in" ? 0 : 2500) : undefined;
    const open = () => setShow(true);
    window.addEventListener("gm:open-consent", open);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("gm:open-consent", open);
    };
  }, []);

  function decide(granted: boolean) {
    try {
      localStorage.setItem(KEY, granted ? "granted" : "denied");
    } catch {
      /* storage blocked: choice applies to this page only */
    }
    setShow(false);
    if (granted) loadAnalytics();
    else if (document.querySelector('script[src="https://flowglance.com/fw.js"]')) window.location.reload();
  }

  if (!show) return null;
  return (
    <div
      role="dialog"
      aria-label="Privacy choices"
      className="no-print animate-rise fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[55] mx-auto max-w-md sm:left-6 sm:right-auto"
    >
      <div className="module flex flex-col gap-2.5 p-3.5 shadow-float-2 sm:p-4">
        <p className="text-[0.8rem] leading-snug text-ink-2 sm:text-[0.86rem] sm:leading-relaxed">
          {optIn
            ? "May we use privacy-friendly analytics to learn which calculators help? Nothing is sold. "
            : "We use privacy-friendly analytics to improve our calculators. Nothing is sold. "}
          <Link href="/privacy" className="font-semibold text-ink underline underline-offset-2">
            Details
          </Link>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => decide(true)}
            className="h-9 flex-1 rounded-full bg-ink text-[0.84rem] font-semibold text-bg transition active:scale-95 sm:h-10"
          >
            {optIn ? "Allow analytics" : "OK"}
          </button>
          <button
            type="button"
            onClick={() => decide(false)}
            className="h-9 flex-1 rounded-full bg-surface-2 text-[0.84rem] font-semibold text-ink-2 ring-1 ring-line transition active:scale-95 sm:h-10"
          >
            {optIn ? "No thanks" : "Opt out"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsentLink() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("gm:open-consent"))}
      className="text-left hover:text-ink"
    >
      Privacy choices
    </button>
  );
}
