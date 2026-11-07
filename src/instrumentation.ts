import type { Instrumentation } from "next";

export function register() {
  // nothing to initialise eagerly; errors are recorded lazily in onRequestError
}

/** Every server-side render/route/proxy error lands in the error inbox (grouped by fingerprint). */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    console.error("[edge-error]", context.routePath, err);
    return;
  }
  const { captureError, errorFrom } = await import("./lib/errors");
  const e = errorFrom(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  const ua = request.headers["user-agent"];
  await captureError({
    source: context.routeType === "proxy" ? "edge" : "server",
    ...e,
    route: context.routePath,
    url: request.path,
    userAgent: Array.isArray(ua) ? ua[0] : ua,
    extra: { method: request.method, routeType: context.routeType, renderSource: context.renderSource, digest },
  });
};
