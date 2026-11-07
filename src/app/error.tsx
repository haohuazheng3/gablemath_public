"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    const e = error instanceof Error ? error : new Error(String(error));
    window.__gmReportError?.({ name: e.name, message: e.message, stack: e.stack, kind: "boundary" });
  }, [error]);
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <div className="module p-8">
        <div className="eyebrow">Something broke</div>
        <h1 className="display mt-2 text-3xl text-ink">This page hit an error</h1>
        <p className="mt-3 text-ink-2">It has been reported automatically. Try again, or head back to the calculators.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={() => retry()} className="h-11 rounded-full bg-ink px-5 font-semibold text-bg active:scale-95">
            Try again
          </button>
          <Link href="/" className="h-11 rounded-full bg-surface-2 px-5 font-semibold leading-[2.75rem] text-ink-2 ring-1 ring-line">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
