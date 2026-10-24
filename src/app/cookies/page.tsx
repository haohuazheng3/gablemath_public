import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/page/DocPage";
import { ConsentLink } from "@/components/layout/ConsentBanner";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cookie Policy",
  description: "The cookies and browser storage GableMath uses, what each one is for, and how to change your choice.",
  path: "/cookies",
});

const ROWS = [
  ["gm-consent", "Local storage", "Remembers your privacy choice", "Until you change it", "Necessary"],
  ["gm-theme, gm-units", "Local storage", "Theme and unit preferences", "Until cleared", "Preference"],
  ["gm-projects-v1, gm-prices-v1", "Local storage", "Your saved projects and prices — never sent to us", "Until cleared", "Functional"],
  ["_fw_vid", "Local storage", "FlowGlance analytics: random browser ID", "Until cleared", "Analytics"],
  ["_fw_sid, _fw_la", "Session storage", "FlowGlance analytics: current visit", "End of visit / 30 min idle", "Analytics"],
  ["Google ad cookies (e.g. __gads, __gpi, IDE)", "Cookies", "Serving and measuring ads, when ads are enabled", "Up to 13 months", "Advertising"],
];

export default function Cookies() {
  return (
    <DocPage title="Cookie policy" path="/cookies" updated="2026-10-23" intro="GableMath mostly uses your browser's local storage rather than cookies, and nothing it stores identifies you by name.">
      <div className="not-prose overflow-x-auto">
        <table className="w-full min-w-[640px] text-[0.88rem]">
          <thead>
            <tr className="text-left text-[0.72rem] uppercase tracking-[0.06em] text-ink-3">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Purpose</th>
              <th className="py-2 pr-3">Kept</th>
              <th className="py-2">Category</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r[0]} className="border-t border-line align-top">
                {r.map((c, i) => (
                  <td key={i} className={i === 0 ? "py-2.5 pr-3 font-mono text-[0.8rem] text-ink" : "py-2.5 pr-3 text-ink-2"}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Changing your choice</h2>
      <p>
        Open <ConsentLink /> at any time (also in the footer). Declining analytics stops FlowGlance from loading on your next page
        view. You can also clear site data in your browser settings.
      </p>
      <p>
        More detail is in our <Link href="/privacy">privacy policy</Link>.
      </p>
    </DocPage>
  );
}
