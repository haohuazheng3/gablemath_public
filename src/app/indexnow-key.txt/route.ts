export const dynamic = "force-static";

/** IndexNow key file (submissions pass keyLocation=https://gablemath.com/indexnow-key.txt). */
export function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return new Response("Not configured", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
