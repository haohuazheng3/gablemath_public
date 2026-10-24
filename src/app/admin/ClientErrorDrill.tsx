"use client";

import { useState } from "react";

/** Throws in the browser on purpose to verify client-side capture. */
export function ClientErrorDrill() {
  const [boom, setBoom] = useState(false);
  if (boom) throw new Error("GableMath test client error (drill) — safe to resolve");
  return (
    <button type="button" onClick={() => {
      // also exercise the window.onerror path, not only the React boundary
      setTimeout(() => { throw new Error("GableMath test window.onerror (drill) — safe to resolve"); }, 0);
      setBoom(true);
    }} className="rounded-full bg-surface px-3 py-1.5 ring-1 ring-line">
      Trigger client error
    </button>
  );
}
