export const dynamic = "force-static";

/** ads.txt — authorises Google AdSense once NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…) is configured. */
export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return new Response("# No advertising partners configured yet.\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const pub = client.replace(/^ca-/, "");
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
