import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/calculators/categories";
import { calculatorsIn } from "@/calculators/registry";
import { calcPath, type SourceRef } from "@/calculators/types";
import { DocPage } from "@/components/page/DocPage";
import { SourceList, VerifiedChip } from "@/components/page/blocks";
import { pageMetadata } from "@/lib/seo";
import { DATA_VERIFIED_ON } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "How We Calculate: Methods & Data Sources",
  description: "The formulas, rounding rules, waste factors and primary data sources behind every GableMath calculator — and how often we re-check them.",
  path: "/how-we-calculate",
});

function dedupe(sources: SourceRef[]) {
  const seen = new Set<string>();
  return sources.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
}

export default function HowWeCalculate() {
  return (
    <DocPage
      title="How we calculate"
      path="/how-we-calculate"
      updated={DATA_VERIFIED_ON}
      intro={
        <>
          Every number on GableMath traces back to a published source. This page explains the rules all our calculators share and
          lists the sources behind each one. <VerifiedChip date={DATA_VERIFIED_ON} className="ml-1 align-middle" />
        </>
      }
    >
      <h2>Rules every calculator follows</h2>
      <ul>
        <li>
          <strong>Measure → volume or area → product units.</strong> We compute the exact geometric quantity first (square feet,
          cubic feet, kilowatt-hours), then convert it into what you actually buy using the manufacturer&apos;s published yield or
          coverage for that product.
        </li>
        <li>
          <strong>Round up, never down.</strong> You can&apos;t buy 61.1 bags. Package counts are always rounded up to whole
          units, and bulk orders to the increments suppliers sell (for example quarter-yards of ready-mix).
        </li>
        <li>
          <strong>Waste is visible and adjustable.</strong> Default overage follows the manufacturer or trade guidance for that
          material (for example 10% for bagged concrete; more for diagonal flooring layouts), and you can change it.
        </li>
        <li>
          <strong>Prices are U.S. typicals with a date.</strong> They come from current retailer listings and published supplier
          price sheets, are shown with the month we checked them, and can be replaced with your local price.
        </li>
        <li>
          <strong>Regional data is regional.</strong> Electricity prices, sun hours and incentives are specific to your state.
        </li>
        <li>
          <strong>Server-rendered answers use the same math.</strong> The quick-answer pages run the exact code the interactive
          calculator runs, so the numbers always agree.
        </li>
      </ul>

      <h2>How often data is re-checked</h2>
      <ul>
        <li>State electricity prices: refreshed automatically when the EIA publishes its monthly update.</li>
        <li>Product yields and coverage: re-checked against manufacturer data sheets at least every six months, and whenever a product is reformulated.</li>
        <li>Prices: reviewed quarterly; every page shows its check date.</li>
        <li>Incentives and net-metering rules: reviewed whenever federal or state policy changes.</li>
      </ul>

      <h2>Sources by calculator</h2>
      {CATEGORIES.map((c) => {
        const calcs = calculatorsIn(c.slug);
        if (!calcs.length) return null;
        return (
          <section key={c.slug}>
            <h3>
              <Link href={`/${c.slug}`}>{c.name}</Link>
            </h3>
            <p className="!mt-1 text-[0.9rem]">
              {calcs.map((k, i) => (
                <span key={k.meta.slug}>
                  {i ? " · " : ""}
                  <Link href={calcPath(k.meta)}>{k.meta.name}</Link>
                </span>
              ))}
            </p>
            <div className="not-prose mt-3">
              <SourceList sources={dedupe(calcs.flatMap((k) => k.meta.sources))} />
            </div>
          </section>
        );
      })}

      <h2>Limits</h2>
      <p>
        These are planning estimates. Real jobs vary with site conditions, product batches, workmanship and local code. Confirm
        structural, electrical and code questions with a licensed professional or your building department.
      </p>
      <p>
        Spotted an outdated number? <Link href="/contact">Tell us</Link> — we fix data reports first.
      </p>
    </DocPage>
  );
}
