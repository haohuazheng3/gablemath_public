import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/page/DocPage";
import { CHANGELOG } from "@/lib/changelog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Data Updates & Corrections",
  description: "A dated record of GableMath data refreshes, product-spec updates and corrections.",
  path: "/changelog",
});

const LABEL = { launch: "Launch", data: "Data update", correction: "Correction", feature: "New" } as const;

export default function Changelog() {
  return (
    <DocPage
      title="Data updates & corrections"
      path="/changelog"
      intro={
        <>
          When a dataset is refreshed, a product changes or a reader reports a mistake, it is recorded here with the date. Spot something
          wrong? <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">Tell us</Link>.
        </>
      }
    >
      <ol className="not-prose space-y-3">
        {CHANGELOG.map((c) => (
          <li key={c.date + c.title} className="module p-5">
            <div className="flex flex-wrap items-center gap-2 text-[0.78rem]">
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-semibold text-ink-2 ring-1 ring-line">{LABEL[c.kind]}</span>
              <time dateTime={c.date} className="text-ink-3">
                {new Date(`${c.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
              </time>
            </div>
            <h2 className="mt-2 text-[1.05rem] font-semibold text-ink">{c.title}</h2>
            <p className="mt-1 text-[0.92rem] leading-relaxed text-ink-2">{c.detail}</p>
          </li>
        ))}
      </ol>
    </DocPage>
  );
}
