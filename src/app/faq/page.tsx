import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/page/DocPage";
import { FaqList, JsonLd } from "@/components/page/blocks";
import { faqLd, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

const FAQ = [
  { q: "Is GableMath free?", a: "Yes. Every calculator is free to use with no account and no sign-up. The site may show advertising to cover its costs." },
  { q: "Where do your numbers come from?", a: "From primary sources: manufacturer technical data sheets for bag yields and coverage rates, current retailer listings and supplier price sheets for prices, the U.S. Energy Information Administration for electricity prices, and NREL for solar data. Each calculator lists its sources and the date we last checked them." },
  { q: "Why does your answer differ from the number on the bag or another calculator?", a: "Usually because of waste and rounding. We add a sensible overage (which you can change) and round up to whole packages. Some calculators also use older yields — for example, assuming a bag makes 0.5 cubic feet. We use the current published figure and show it next to the result." },
  { q: "Can I use my own store's prices?", a: "Yes. Tap any price in a cost estimate and type your local price. The calculator remembers it in your browser for next time." },
  { q: "How do saved projects work?", a: "Click “Save to project” under any calculation. Projects are stored only in this browser — nothing is uploaded — and each project combines its calculations into one shopping list you can print or copy." },
  { q: "Do you support metric units?", a: "Yes. Use the ft · in / m · cm switch on any calculator. You can also type values like 3.2m or 10'6\" directly into length fields." },
  { q: "Are the results guaranteed?", a: "No. They are planning estimates. Site conditions, product batches and local codes vary, so confirm critical quantities with your supplier and structural or code questions with a licensed professional." },
  { q: "How do I report a mistake or request a calculator?", a: `Use the contact form or email ${SITE.contactEmail}. Data corrections are reviewed first.` },
];

export const metadata: Metadata = pageMetadata({
  title: "Frequently Asked Questions",
  description: "How GableMath works: where the data comes from, why results include waste, saving projects, metric units and reporting corrections.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <DocPage title="Frequently asked questions" path="/faq" intro="Short answers about how GableMath works. Each calculator also has its own FAQ for the questions specific to that job.">
      <div className="not-prose">
        <FaqList faq={FAQ} />
      </div>
      <p className="mt-8">
        Still stuck? <Link href="/contact">Send us a message</Link>.
      </p>
      <JsonLd data={faqLd(FAQ)} />
    </DocPage>
  );
}
