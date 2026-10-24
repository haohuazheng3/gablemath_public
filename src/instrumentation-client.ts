// Browser error capture → /api/errors (deduped, capped per page view, never blocks the UI).

const sent = new Set<string>();
let budget = 8;

function report(payload: { name: string; message: string; stack?: string; kind: string }) {
  try {
    const key = `${payload.name}:${payload.message}`.slice(0, 300);
    if (sent.has(key) || budget <= 0) return;
    // Ignore noise we can't act on: browser extensions and cross-origin "Script error."
    if (/^Script error\.?$/.test(payload.message)) return;
    if (payload.stack && /(chrome|moz|safari(-web)?)-extension:\/\//.test(payload.stack)) return;
    sent.add(key);
    budget -= 1;
    const body = JSON.stringify({ ...payload, url: location.href, route: location.pathname });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/errors", new Blob([body], { type: "application/json" }));
    else void fetch("/api/errors", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
  } catch (err) {
    console.warn("[error-reporter] could not report", err);
  }
}

window.addEventListener("error", (event) => {
  const err = event.error as Error | undefined;
  report({ name: err?.name ?? "Error", message: err?.message ?? String(event.message), stack: err?.stack, kind: "error" });
});

window.addEventListener("unhandledrejection", (event) => {
  const r = event.reason as Error | undefined;
  report({
    name: r?.name ?? "UnhandledRejection",
    message: r?.message ?? (typeof event.reason === "string" ? event.reason : "Unhandled promise rejection"),
    stack: r?.stack,
    kind: "unhandledrejection",
  });
});

window.__gmReportError = report;

export {};
