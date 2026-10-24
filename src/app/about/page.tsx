import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/page/DocPage";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "About GableMath",
  description: "GableMath builds free, source-checked calculators for home projects and energy costs. Who we are, how we work and how we keep the numbers honest.",
  path: "/about",
});

export default function About() {
  return (
    <DocPage
      title="About GableMath"
      path="/about"
      intro="GableMath makes free calculators for the questions that come up in the middle of a home project: how many bags, how many boxes, how many gallons — and what it will cost to run, power or finish."
      aside={
        <div className="module p-5">
          <div className="eyebrow mb-2">Contact</div>
          <p className="text-[0.9rem] leading-relaxed text-ink-2">
            Questions, corrections or ideas: <a className="font-semibold text-ink underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
          </p>
          <p className="mt-2 text-[0.82rem] text-ink-3">{SITE.replyWindow}</p>
        </div>
      }
    >
      <h2>Why we built it</h2>
      <p>
        Most material calculators stop at a single number, and many of them are built on figures copied from older pages — the
        &ldquo;a bag makes half a cubic foot&rdquo; kind of number that sends people back to the store. We wanted tools that start
        from what manufacturers and government agencies actually publish today, show their work, and answer the next question
        too: which size to buy, what it weighs, whether a truck is cheaper, and what else belongs on the list.
      </p>
      <h2>How we work</h2>
      <ul>
        <li>
          <strong>Primary sources first.</strong> Bag yields and coverage rates come from manufacturer technical data sheets.
          Electricity prices come from the U.S. Energy Information Administration. Solar resource data comes from the National
          Renewable Energy Laboratory. See <Link href="/how-we-calculate">how we calculate</Link> for the full list.
        </li>
        <li>
          <strong>Dated and re-checked.</strong> Every calculator shows the date its data was last checked, and scheduled jobs
          refresh public datasets such as state electricity prices as soon as they are published.
        </li>
        <li>
          <strong>Your prices win.</strong> Our prices are U.S. typicals. Every price can be replaced with the one on your
          store&apos;s shelf, and the calculator remembers it.
        </li>
        <li>
          <strong>No account, no paywall.</strong> GableMath is free to use. Saved projects stay in your browser.
        </li>
      </ul>
      <h2>What GableMath is not</h2>
      <p>
        Our results are planning estimates. They are not engineering, code-compliance or financial advice. Local codes, site
        conditions and the specific product you buy can change the right answer — when it matters, confirm with your supplier,
        a licensed contractor or your building department.
      </p>
      <h2>Found a mistake?</h2>
      <p>
        We would rather hear about it than be wrong. Use the <Link href="/contact">contact form</Link> or email{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> — corrections are reviewed first.
      </p>
    </DocPage>
  );
}
