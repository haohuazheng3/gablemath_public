import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy runs ONLY for the owner area (see matcher) — never for content pages, so it adds no cost
 * to public traffic. HTTP Basic auth against ADMIN_PASSWORD (user: "owner").
 */
export function proxy(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return new NextResponse("Admin is not configured.", { status: 503 });
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const [user, pass] = atob(header.slice(6)).split(":");
      if (user === "owner" && timingSafeEqual(pass ?? "", expected)) {
        const res = NextResponse.next();
        res.headers.set("X-Robots-Tag", "noindex, nofollow");
        res.headers.set("Cache-Control", "no-store");
        return res;
      }
    } catch {
      // malformed header → fall through to the 401 challenge
    }
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="GableMath owner", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
