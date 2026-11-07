"use client";

import { useEffect } from "react";

export default function GlobalError({ error }: { error: unknown }) {
  useEffect(() => {
    try {
      const e = error instanceof Error ? error : new Error(String(error));
      const body = JSON.stringify({ name: e.name, message: e.message, stack: e.stack, url: location.href, kind: "boundary" });
      navigator.sendBeacon?.("/api/errors", new Blob([body], { type: "application/json" }));
    } catch (err) {
      console.error("[global-error] could not report", err);
    }
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f3f2ee", color: "#15161a", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ background: "#fff", borderRadius: 28, padding: 32, maxWidth: 420, textAlign: "center", boxShadow: "0 22px 44px -26px rgba(16,18,24,.3)" }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>GableMath hit an unexpected error</h1>
          <p style={{ color: "#484b53" }}>It has been reported. Please reload the page.</p>
          <button onClick={() => location.reload()} style={{ height: 44, borderRadius: 999, border: 0, background: "#15161a", color: "#fff", padding: "0 20px", fontWeight: 600 }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
