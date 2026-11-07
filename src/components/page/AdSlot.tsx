"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT; // "ca-pub-…" — set once AdSense approves the site
const SLOTS: Record<string, string | undefined> = {
  "after-calculator": process.env.NEXT_PUBLIC_ADSENSE_SLOT_AFTER_CALC,
  "in-content": process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_CONTENT,
  "sidebar": process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
};

/**
 * Manual AdSense unit. Renders nothing until both the publisher id and this slot's id are
 * configured, and reserves its height when it does render so the layout never shifts (CLS).
 * Placement rule: never above or inside a calculator — only after the answer.
 */
export function AdSlot({ name, minHeight = 280 }: { name: keyof typeof SLOTS | string; minHeight?: number }) {
  const slot = SLOTS[name];
  const pushed = useRef(false);
  useEffect(() => {
    if (!CLIENT || !slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn("[ads] slot push failed", name, err);
    }
  }, [slot, name]);
  if (!CLIENT || !slot) return null;
  return (
    <aside aria-label="Advertisement" className="no-print my-8" style={{ minHeight }}>
      <div className="eyebrow mb-2 text-center">Advertisement</div>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: minHeight - 24 }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
