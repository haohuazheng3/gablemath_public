import type { Metadata } from "next";
import { DocPage } from "@/components/page/DocPage";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = pageMetadata({
  title: "Contact GableMath",
  description: "Questions, data corrections, bug reports or calculator requests — reach the GableMath team. We reply within 2 business days.",
  path: "/contact",
});

export default function Contact() {
  return (
    <DocPage
      title="Contact us"
      path="/contact"
      intro={
        <>
          Found a number that looks off, a bug, or a calculator you wish existed? Tell us. You can also email{" "}
          <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-ink underline underline-offset-4">
            {SITE.contactEmail}
          </a>
          . {SITE.replyWindow}
        </>
      }
    >
      <div className="not-prose">
        <ContactForm />
      </div>
    </DocPage>
  );
}
