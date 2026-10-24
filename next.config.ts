import type { NextConfig } from "next";

// Indexing is opt-in: every environment ships noindex (meta + X-Robots-Tag)
// until launch flips SITE_INDEXABLE=true on production.
const indexable = process.env.SITE_INDEXABLE === "true";

const gitSha =
  process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";

// Static CSP (no nonces) so every content page stays prerendered and CDN-cached.
// Allows FlowGlance analytics and the Google AdSense stack for when ads go live.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"} https://flowglance.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.gstatic.com https://*.doubleclick.net https://*.googletagservices.com https://*.adtrafficquality.google https://fundingchoicesmessages.google.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://flowglance.com https://*.flowglance.com https://*.google.com https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google https://fundingchoicesmessages.google.com",
  "frame-src 'self' https://*.google.com https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google https://fundingchoicesmessages.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  ...(indexable ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_GIT_SHA: gitSha,
    NEXT_PUBLIC_SITE_INDEXABLE: indexable ? "true" : "false",
    NEXT_PUBLIC_BUILD_YEAR: String(new Date().getFullYear()),
  },
  images: {
    // No remote image proxying: everything we show is our own static asset.
    remotePatterns: [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  async redirects() {
    return [
      // Junk probes never reach a function: answered by the router.
      { source: "/wp-admin/:path*", destination: "/", permanent: true },
      { source: "/wp-login.php", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
