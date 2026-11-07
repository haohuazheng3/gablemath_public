"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { track } from "@/lib/analytics";

/** "Did this answer your question?" — one tap, optional comment. */
export function Feedback({ calcKey }: { calcKey: string }) {
  const [vote, setVote] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send(helpful: boolean, text?: string) {
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ calcKey, page: location.pathname, helpful, comment: text || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState(text ? "sent" : "idle");
    } catch (err) {
      console.warn("[feedback] not saved", err);
      setState("error");
    }
  }

  return (
    <div className="no-print module mx-auto flex max-w-2xl flex-col items-center gap-3 px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
      {vote === null ? (
        <>
          <span className="text-[0.92rem] font-semibold text-ink">Did this answer your question?</span>
          <div className="flex gap-2">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => {
                  setVote(v);
                  track("calc_feedback", { calc: calcKey, helpful: v });
                  void send(v);
                }}
                className="h-10 rounded-full bg-surface-2 px-4 text-[0.88rem] font-semibold text-ink-2 ring-1 ring-line transition hover:text-ink active:scale-95"
              >
                {v ? "👍 Yes" : "👎 Not quite"}
              </button>
            ))}
          </div>
        </>
      ) : state === "sent" ? (
        <span className="w-full text-[0.9rem] font-medium text-ok">Thank you — we read every note.</span>
      ) : (
        <form
          className="flex w-full flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (comment.trim()) void send(vote, comment.trim());
          }}
        >
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            placeholder={vote ? "Thanks! Anything we could add?" : "What were you trying to work out?"}
            className="well h-11 min-w-0 flex-1 px-4 text-[0.92rem] text-ink outline-none"
            aria-label="Optional comment"
          />
          <button
            type="submit"
            disabled={!comment.trim() || state === "sending"}
            className={clsx("h-11 rounded-full px-5 text-[0.88rem] font-semibold transition active:scale-95", comment.trim() ? "bg-ink text-bg" : "bg-surface-3 text-ink-3")}
          >
            {state === "sending" ? "Sending…" : "Send"}
          </button>
          {state === "error" ? <span className="text-[0.8rem] text-bad">Couldn&apos;t send — try again.</span> : null}
        </form>
      )}
    </div>
  );
}
