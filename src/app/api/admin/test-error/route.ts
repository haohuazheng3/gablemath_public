export const dynamic = "force-dynamic";

/**
 * Owner-only drill: throws on purpose so the server-side capture path (instrumentation
 * onRequestError → error inbox → /api/health red → alert email) can be verified end to end.
 */
export async function GET() {
  throw new Error(`GableMath test server error (drill) — safe to resolve`);
}
