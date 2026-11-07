import { captureError, errorFrom } from "./errors";

/**
 * Email the site owner through our Cloudflare Email Worker (send_email binding to the verified
 * owner address). Returns false — and records why — if delivery could not be confirmed.
 */
export async function notifyOwner(subject: string, text: string, replyTo?: string): Promise<boolean> {
  const url = process.env.NOTIFY_URL;
  const secret = process.env.NOTIFY_SECRET;
  if (!url || !secret) {
    await captureError({ source: "server", severity: "warning", name: "NotifyNotConfigured", message: "NOTIFY_URL/NOTIFY_SECRET missing", route: "notify" });
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ subject: `[GableMath] ${subject}`, text, replyTo }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`notify worker HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return true;
  } catch (err) {
    await captureError({ source: "server", route: "notify", ...errorFrom(err) });
    return false;
  }
}
