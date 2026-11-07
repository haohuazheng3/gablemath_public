import type { ReactNode } from "react";
import { Breadcrumbs, JsonLd, PageContainer } from "./blocks";
import { breadcrumbLd } from "@/lib/seo";

/** Shared shell for trust & policy pages: title on the void, body as calm prose. */
export function DocPage({ title, intro, path, updated, children, aside }: { title: string; intro?: ReactNode; path: string; updated?: string; children: ReactNode; aside?: ReactNode }) {
  const crumbs = [
    { name: "Home", href: "/" },
    { name: title, href: path },
  ];
  return (
    <PageContainer className="pt-6 sm:pt-10">
      <Breadcrumbs items={crumbs} />
      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <h1 className="display text-[2.3rem] leading-[1.1] text-ink sm:text-[2.9rem]">{title}</h1>
          {intro ? <div className="mt-4 max-w-[68ch] text-[1.06rem] leading-relaxed text-ink-2">{intro}</div> : null}
          {updated ? <p className="mt-3 text-[0.84rem] text-ink-3">Last updated {new Date(`${updated}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</p> : null}
          <div className="prose-gm mt-8 max-w-[70ch]">{children}</div>
        </div>
        {aside ? <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">{aside}</aside> : null}
      </div>
      <JsonLd data={breadcrumbLd(crumbs)} />
    </PageContainer>
  );
}
