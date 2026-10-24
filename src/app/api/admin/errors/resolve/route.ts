import { eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { captureError, errorFrom } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** Owner-only (Basic auth in proxy). Form post: id=<n> or all=1. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const all = form.get("all") === "1";
    const id = Number(form.get("id"));
    if (all) {
      await db().update(schema.errors).set({ resolvedAt: new Date() }).where(isNull(schema.errors.resolvedAt));
    } else if (Number.isInteger(id) && id > 0) {
      await db().update(schema.errors).set({ resolvedAt: new Date() }).where(eq(schema.errors.id, id));
    } else {
      return new Response("Bad request", { status: 400 });
    }
    return Response.redirect(new URL("/admin", req.url), 303);
  } catch (err) {
    await captureError({ source: "server", route: "/api/admin/errors/resolve", ...errorFrom(err) });
    return new Response("Failed", { status: 500 });
  }
}
