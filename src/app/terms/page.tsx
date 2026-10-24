import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/page/DocPage";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description: "The terms for using GableMath's free calculators: estimates only, no warranty, acceptable use and contact.",
  path: "/terms",
});

export default function Terms() {
  return (
    <DocPage title="Terms of use" path="/terms" updated="2026-10-23" intro={`By using ${SITE.domain} you agree to these terms. They are short because the service is simple and free.`}>
      <h2>Estimates, not advice</h2>
      <p>
        GableMath calculators produce planning estimates from the inputs you provide and the published data we cite. They are not
        engineering, architectural, electrical, legal, tax or financial advice, and they do not replace a site visit, local building
        codes or the instructions of the product you buy. Confirm quantities with your supplier and consult a licensed professional
        for structural, electrical or code questions.
      </p>
      <h2>No warranty</h2>
      <p>
        The site is provided &ldquo;as is&rdquo; without warranties of any kind. Prices, product data and incentive rules change; we
        date our data and update it regularly but cannot guarantee it is complete, current or error-free for your situation.
      </p>
      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {SITE.name} is not liable for any loss arising from use of the calculators or
        content, including over- or under-purchasing materials, project delays or cost differences.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t attempt to disrupt the site, overload it with automated requests or bypass its security.</li>
        <li>Don&apos;t submit unlawful, abusive or spam content through our forms.</li>
        <li>Reasonable personal and professional use of results — including sharing them with clients — is welcome.</li>
      </ul>
      <h2>Content and trademarks</h2>
      <p>
        Site text, design and code are owned by {SITE.name}. Product and brand names (for example Quikrete or Sherwin-Williams) belong
        to their owners and are used only to identify the products whose published data we reference; we are not affiliated with
        or endorsed by them.
      </p>
      <h2>Changes and contact</h2>
      <p>
        We may update these terms; the date above shows the latest version. Questions: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>{" "}
        or our <Link href="/contact">contact form</Link>.
      </p>
    </DocPage>
  );
}
