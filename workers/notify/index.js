// GableMath owner notifications without a mail provider: Cloudflare Email Routing's send_email
// binding delivers to the verified owner address.
//  - fetch:     the website calls POST / with a shared secret (contact form, deploy alerts)
//  - scheduled: every 10 minutes, probe https://gablemath.com/api/health and email the owner when
//               it turns unhealthy (repeat at most every 3 hours) and again when it recovers.
import { EmailMessage } from "cloudflare:email";

const HEALTH_URL = "https://gablemath.com/api/health";
const REPEAT_MS = 3 * 60 * 60 * 1000;

function header(v) {
  // RFC 2047 encoded-word for non-ASCII subjects/names; strip CR/LF to prevent header injection.
  const clean = String(v ?? "").replace(/[\r\n]+/g, " ").slice(0, 300);
  return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(clean)))}?=`;
}

function b64Body(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/.{1,76}/g, "$&\r\n");
}

async function sendOwner(env, subject, text, replyTo) {
  const domain = env.FROM_ADDRESS.split("@")[1];
  const raw = [
    `From: ${header(env.FROM_NAME || "Site")} <${env.FROM_ADDRESS}>`,
    `To: <${env.OWNER_ADDRESS}>`,
    `Subject: ${header(subject)}`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64Body(text),
  ]
    .filter((l) => l !== null)
    .join("\r\n");
  await env.OWNER.send(new EmailMessage(env.FROM_ADDRESS, env.OWNER_ADDRESS, raw));
}

async function probe(env) {
  let status = 0;
  let body = "";
  try {
    const res = await fetch(HEALTH_URL, { headers: { "user-agent": "GableMath-health-alarm" }, cf: { cacheTtl: 0 } });
    status = res.status;
    body = (await res.text()).slice(0, 4000);
  } catch (e) {
    body = `fetch failed: ${e && e.message ? e.message : e}`;
  }
  const healthy = status === 200;
  const prev = JSON.parse((await env.ALERTS.get("state")) || '{"healthy":true,"lastAlert":0}');
  const now = Date.now();
  if (!healthy && (prev.healthy || now - prev.lastAlert > REPEAT_MS)) {
    await sendOwner(env, `[GableMath] ALERT: /api/health returned ${status || "no response"}`, `GableMath health check failed at ${new Date(now).toISOString()}.\n\nHTTP ${status}\n\n${body}\n\nOwner console: https://gablemath.com/admin`);
    await env.ALERTS.put("state", JSON.stringify({ healthy: false, lastAlert: now }));
  } else if (healthy && !prev.healthy) {
    await sendOwner(env, "[GableMath] Recovered: /api/health is OK again", `GableMath health check is passing again as of ${new Date(now).toISOString()}.\n\n${body}`);
    await env.ALERTS.put("state", JSON.stringify({ healthy: true, lastAlert: prev.lastAlert }));
  }
  return { healthy, status };
}

export default {
  async fetch(req, env) {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const auth = req.headers.get("authorization") || "";
    if (!env.NOTIFY_SECRET || auth !== `Bearer ${env.NOTIFY_SECRET}`) return new Response("Unauthorized", { status: 401 });
    const url = new URL(req.url);
    if (url.pathname === "/probe") return Response.json(await probe(env));
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }
    const replyTo = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(body.replyTo || "") ? body.replyTo : null;
    try {
      await sendOwner(env, body.subject || "Notification", String(body.text || "").slice(0, 20000), replyTo);
      return Response.json({ ok: true });
    } catch (e) {
      return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 502 });
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(probe(env));
  },
};
