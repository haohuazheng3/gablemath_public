import Link from "next/link";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import type { FAQ, SourceRef } from "@/calculators/types";
import { formatVerified } from "@/lib/site";

/* Shared server-rendered page blocks used by every template. */

export function PageContainer({ children, className, narrow }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={clsx("mx-auto w-full px-4 sm:px-6", narrow ? "max-w-3xl" : "max-w-6xl", className)}>{children}</div>;
}

export interface Crumb {
  name: string;
  href: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[0.8rem] text-ink-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden className="text-ink-3/60">/</span> : null}
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-ink-2">
                {c.name}
              </span>
            ) : (
              <Link href={c.href} className="transition hover:text-ink">
                {c.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function VerifiedChip({ date, className }: { date: string; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-1 text-[0.74rem] font-semibold text-ok", className)}>
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Data checked {formatVerified(date)}
    </span>
  );
}

export function SectionTitle({ children, id, eyebrow }: { children: ReactNode; id?: string; eyebrow?: string }) {
  return (
    <div className="mb-5">
      {eyebrow ? <div className="eyebrow mb-2">{eyebrow}</div> : null}
      <h2 id={id} className="display text-[1.6rem] leading-tight text-ink sm:text-[1.85rem]">
        {children}
      </h2>
    </div>
  );
}

export function FaqList({ faq }: { faq: FAQ[] }) {
  if (!faq.length) return null;
  return (
    <div className="module divide-y divide-line overflow-hidden">
      {faq.map((f) => (
        <details key={f.q} className="group px-5 py-1 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[0.98rem] font-semibold text-ink">
            <h3>{f.q}</h3>
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3 transition-transform duration-300 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="pb-5 pr-8 text-[0.94rem] leading-relaxed text-ink-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function SourceList({ sources }: { sources: SourceRef[] }) {
  if (!sources.length) return null;
  return (
    <ul className="space-y-2.5">
      {sources.map((s) => (
        <li key={s.url + s.label} className="flex gap-3 text-[0.86rem] leading-snug">
          <span aria-hidden className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-ink-3" />
          <span>
            <a href={s.url} target="_blank" rel="noopener nofollow" className="font-medium text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
              {s.label}
            </a>
            {s.note ? <span className="text-ink-2"> — {s.note}</span> : null}
            <span className="text-ink-3"> · checked {formatVerified(s.checked)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LinkCard({ href, title, sub, icon }: { href: string; title: string; sub?: string; icon?: ReactNode }) {
  return (
    <Link href={href} className="module module-raise group flex items-start gap-3.5 p-4 sm:p-5">
      {icon ? (
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-surface-2 text-ink ring-1 ring-line transition group-hover:bg-accent-soft group-hover:text-accent">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-[0.98rem] font-semibold leading-snug text-ink">{title}</span>
        {sub ? <span className="mt-1 block text-[0.84rem] leading-snug text-ink-3">{sub}</span> : null}
      </span>
      <span aria-hidden className="ml-auto self-center text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink">
        →
      </span>
    </Link>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-surface px-3 py-1 text-[0.78rem] font-medium text-ink-2 ring-1 ring-line">{children}</span>;
}

export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be raw JSON; escape "<" so content can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
