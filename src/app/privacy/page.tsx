import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/page/DocPage";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "What GableMath collects, why, who processes it, how long we keep it and the choices you have — written plainly.",
  path: "/privacy",
});

const UPDATED = "2026-10-23";

export default function Privacy() {
  return (
    <DocPage title="Privacy policy" path="/privacy" updated={UPDATED} intro="GableMath has no accounts and sells nothing to you, so we collect very little. This page lists exactly what we do collect, in plain language.">
      <h2>Who we are</h2>
      <p>
        {SITE.name} ({SITE.domain}) is a free calculator website. Contact us about privacy at{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>

      <h2>What stays on your device</h2>
      <p>These are stored only in your browser&apos;s local storage. We never receive them:</p>
      <ul>
        <li>Saved projects and calculations (<code>gm-projects-v1</code>), and prices you type in (<code>gm-prices-v1</code>).</li>
        <li>Preferences: light/dark theme (<code>gm-theme</code>), units (<code>gm-units</code>) and your privacy choice (<code>gm-consent</code>).</li>
      </ul>
      <p>Clearing your browser&apos;s site data removes all of it.</p>

      <h2>Analytics (FlowGlance)</h2>
      <p>
        We use FlowGlance, a privacy-focused analytics service, to learn which calculators help and where people get confused.
        It is our only analytics tool. When analytics is on, FlowGlance records:
      </p>
      <ul>
        <li>pages you visit, how you arrived (referrer), time on page, scrolling, clicks and the buttons or sections you use;</li>
        <li>approximate location derived from your IP address, browser and device type;</li>
        <li>
          <strong>the text you submit in forms</strong> (for example the contact form) and <strong>images you upload</strong> to
          any upload field — FlowGlance&apos;s &ldquo;deep capture&rdquo; features, which we have switched on to diagnose
          problems. GableMath currently has no image upload fields;
        </li>
        <li>named events such as &ldquo;calculator used&rdquo;, &ldquo;saved to project&rdquo; or &ldquo;shopping list copied&rdquo;, and JavaScript errors.</li>
      </ul>
      <p>
        FlowGlance identifies a browser with random IDs kept in local and session storage (<code>_fw_vid</code>, <code>_fw_sid</code>).
        We do not use these data to identify you personally, and we do not sell or share them for advertising.
      </p>
      <p>
        <strong>Your choice:</strong> visitors in the EU, EEA, UK and Switzerland are asked first and analytics loads only if you
        allow it. Elsewhere analytics runs by default and you can opt out at any time with &ldquo;Privacy choices&rdquo; in the
        footer. Browsers that send a Global Privacy Control (GPC) signal are treated as having opted out.
      </p>

      <h2>Messages you send us</h2>
      <p>
        If you use the contact form we store your name, email address, topic and message, the page you came from, your browser
        type and a one-way hashed version of your IP address (used only to stop spam). A copy is emailed to our team through
        Cloudflare&apos;s email service so we can reply. We keep messages for up to 24 months, then delete them.
      </p>
      <p>
        &ldquo;Did this answer your question?&rdquo; votes store the page, your vote, any comment you add and a hashed IP address.
      </p>

      <h2>Technical logs and security</h2>
      <p>
        Our hosting provider (Vercel) processes standard request data such as IP address and user agent to deliver pages and
        protect the service. We record application errors (the error message, page and browser type) to fix bugs, and use hashed
        IP addresses for rate limiting. Error records are kept for up to 12 months.
      </p>

      <h2>Advertising</h2>
      <p>
        We may show ads served by Google AdSense to keep GableMath free. When ads are enabled, Google and its partners may use
        cookies or similar technologies to serve and measure ads, including personalized ads based on your visits to this and
        other websites. Visitors in the EEA, UK and Switzerland will be asked for consent through a Google-certified consent tool
        before personalized ads are shown. You can learn how Google uses data at{" "}
        <a href="https://policies.google.com/technologies/partner-sites" rel="noopener nofollow" target="_blank">
          policies.google.com/technologies/partner-sites
        </a>{" "}
        and manage ad personalization at{" "}
        <a href="https://adssettings.google.com" rel="noopener nofollow" target="_blank">
          adssettings.google.com
        </a>
        .
      </p>

      <h2>Who processes data for us</h2>
      <ul>
        <li>Vercel Inc. — website hosting (United States).</li>
        <li>Neon — database for contact messages, feedback votes and error records (United States).</li>
        <li>Cloudflare, Inc. — domain DNS and email delivery for contact messages.</li>
        <li>FlowGlance — website analytics.</li>
        <li>Google — Search Console (search performance reports) and, when enabled, AdSense advertising.</li>
      </ul>
      <p>We do not sell personal information, and we do not share it for cross-context behavioral advertising outside of Google ads as described above.</p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live (including under the GDPR, UK GDPR, and U.S. state laws such as the CCPA/CPRA), you can ask
        to access, correct or delete personal information we hold about you, or object to its use. Email{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> and we will respond within 30 days. You can also lodge a
        complaint with your local data-protection authority.
      </p>

      <h2>Children</h2>
      <p>GableMath is not directed at children under 13 and we do not knowingly collect their personal information.</p>

      <h2>Changes</h2>
      <p>
        If we change what we collect, we will update this page and its date. See also our <Link href="/cookies">cookie policy</Link> and{" "}
        <Link href="/terms">terms of use</Link>.
      </p>
    </DocPage>
  );
}
