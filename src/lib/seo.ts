import type { Metadata } from "next";
import type { FAQ } from "@/calculators/types";
import { absoluteUrl, INDEXABLE, SITE } from "./site";

export function pageMetadata({
  title,
  description,
  path,
  ogImage,
  noindex,
  type = "website",
  publishedTime,
  modifiedTime,
}: {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  noindex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const url = absoluteUrl(path);
  const image = ogImage ?? "/opengraph-image";
  const robotsIndex = INDEXABLE && !noindex;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: robotsIndex
      ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
      : { index: false, follow: INDEXABLE },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      type,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      ...(type === "article" ? { publishedTime, modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/* ───────── JSON-LD builders ───────── */

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: { "@type": "ImageObject", url: absoluteUrl("/icon-512.png"), width: 512, height: 512 },
    email: SITE.contactEmail,
    foundingDate: String(SITE.foundingYear),
    description: SITE.description,
    contactPoint: { "@type": "ContactPoint", email: SITE.contactEmail, contactType: "customer support", availableLanguage: "English" },
    sameAs: [] as string[],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    publisher: { "@id": `${SITE.url}/#organization` },
    inLanguage: "en-US",
  };
}

export function breadcrumbLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.href) })),
  };
}

export function faqLd(faq: FAQ[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function calculatorLd({ name, description, path, updated }: { name: string; description: string; path: string; updated: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: absoluteUrl(path),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    dateModified: updated,
    publisher: { "@id": `${SITE.url}/#organization` },
  };
}

export function articleLd({
  headline,
  description,
  path,
  published,
  modified,
  image,
}: {
  headline: string;
  description: string;
  path: string;
  published: string;
  modified: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    mainEntityOfPage: absoluteUrl(path),
    datePublished: published,
    dateModified: modified,
    image: image ? absoluteUrl(image) : absoluteUrl("/opengraph-image"),
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: { "@id": `${SITE.url}/#organization` },
  };
}
