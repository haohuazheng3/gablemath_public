// Thin client wrapper over FlowGlance's page API. The loader stub in <head>
// (see components/layout/AnalyticsHead) queues calls made before fw.js loads.

type FwFn = ((cmd: "event", name: string, props?: Record<string, unknown>) => void) &
  ((cmd: "identify", who: { userRef?: string; email?: string }) => void);

declare global {
  interface Window {
    fw?: FwFn & { q?: unknown[] };
  }
}

export function track(name: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.fw?.("event", name, props);
  } catch (err) {
    // Analytics must never break the page, but we still want to know.
    console.warn("[analytics] track failed", err);
  }
}

export function identify(who: { userRef?: string; email?: string }): void {
  if (typeof window === "undefined") return;
  try {
    window.fw?.("identify", who);
  } catch (err) {
    console.warn("[analytics] identify failed", err);
  }
}

const once = new Set<string>();
/** Fire an event at most once per page view (e.g. first interaction with a calculator). */
export function trackOnce(key: string, name: string, props?: Record<string, unknown>): void {
  if (once.has(key)) return;
  once.add(key);
  track(name, props);
}
