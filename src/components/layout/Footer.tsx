import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { CATEGORIES } from "@/calculators/categories";
import { BUILD_YEAR, SITE } from "@/lib/site";
import { ConsentLink } from "./ConsentBanner";

export function Footer() {
  return (
    <footer className="no-print mt-24 px-5 pb-10 pt-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-ink" aria-label="GableMath home">
              <LogoMark className="size-6" />
              <span className="display text-[1.15rem]">GableMath</span>
            </Link>
            <p className="mt-3 max-w-xs text-[0.86rem] leading-relaxed text-ink-3">
              Free calculators for home projects and energy costs, built on numbers we check against manufacturers and
              government data — not recycled blog figures.
            </p>
            <p className="mt-4 text-[0.82rem] text-ink-3">
              <a href={`mailto:${SITE.contactEmail}`} className="text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                {SITE.contactEmail}
              </a>
            </p>
          </div>
          <FooterCol
            title="Calculators"
            links={CATEGORIES.slice(0, 5).map((c) => ({ href: `/${c.slug}`, label: c.name }))}
          />
          <FooterCol
            title="More"
            links={[
              ...CATEGORIES.slice(5).map((c) => ({ href: `/${c.slug}`, label: c.name })),
              { href: "/blog", label: "Guides" },
            ]}
          />
          <FooterCol
            title="GableMath"
            links={[
              { href: "/about", label: "About" },
              { href: "/how-we-calculate", label: "How we calculate" },
              { href: "/changelog", label: "Data updates" },
              { href: "/faq", label: "FAQ" },
              { href: "/contact", label: "Contact" },
            ]}
          />
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-[0.8rem] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {BUILD_YEAR} {SITE.name}. Estimates only — always confirm quantities with your supplier and local code.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/cookies" className="hover:text-ink">
              Cookies
            </Link>
            <ConsentLink />
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="eyebrow">{title}</h2>
      <ul className="mt-3 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[0.88rem] text-ink-2 transition hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
