"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

const TOPICS = [
  { value: "question", label: "A question about a calculator" },
  { value: "data", label: "A number looks wrong or outdated" },
  { value: "bug", label: "Something is broken" },
  { value: "suggestion", label: "Suggest a calculator or feature" },
  { value: "business", label: "Business or press" },
  { value: "other", label: "Something else" },
];

export function ContactForm() {
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          topic: form.get("topic"),
          message: form.get("message"),
          page: document.referrer ? new URL(document.referrer).pathname : undefined,
          website: form.get("website") || "",
          elapsedMs: Date.now() - started.current,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Something went wrong — please try again.");
      setState("sent");
      track("contact_submitted", { topic: String(form.get("topic")) });
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  if (state === "sent") {
    return (
      <div className="module animate-pop p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-ok-soft text-ok">✓</div>
        <h2 className="display mt-4 text-2xl text-ink">Message received</h2>
        <p className="mt-2 text-ink-2">Thanks — we&apos;ll reply to your email within 2 business days.</p>
      </div>
    );
  }

  const input = "well h-12 w-full px-4 text-[1rem] text-ink outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]";
  return (
    <form onSubmit={onSubmit} className="module space-y-4 p-5 sm:p-7" noValidate={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[0.86rem] font-semibold text-ink">Your name</span>
          <input name="name" required maxLength={100} autoComplete="name" className={input} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.86rem] font-semibold text-ink">Email</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" className={input} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[0.86rem] font-semibold text-ink">What is it about?</span>
        <select name="topic" className={clsx(input, "cursor-pointer")} defaultValue="question">
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[0.86rem] font-semibold text-ink">Message</span>
        <textarea name="message" required minLength={10} maxLength={5000} rows={6} className="well w-full px-4 py-3 text-[1rem] leading-relaxed text-ink outline-none focus:border-accent" placeholder="Which calculator, what you entered, and what you expected — the more detail, the faster we can help." />
      </label>
      {/* spam trap: invisible to people */}
      <label className="absolute -left-[9999px]" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {state === "error" ? <p className="rounded-[14px] bg-bad-soft px-4 py-3 text-[0.9rem] text-bad">{error}</p> : null}
      <button
        type="submit"
        disabled={state === "sending"}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[0.95rem] font-semibold text-bg transition active:scale-[0.98] disabled:opacity-80 sm:w-auto sm:px-8"
      >
        {state === "sending" ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-bg/40 border-t-bg" /> Sending…
          </>
        ) : (
          "Send message"
        )}
      </button>
      <p className="text-[0.78rem] leading-snug text-ink-3">
        We use your email only to reply. See our privacy policy for how messages are stored.
      </p>
    </form>
  );
}
