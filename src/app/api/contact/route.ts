import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, hasDb, schema } from "@/lib/db";
import { captureError, errorFrom } from "@/lib/errors";
import { notifyOwner } from "@/lib/notify";
import { ipHash, rateLimit, sameOrigin, tooMany } from "@/lib/request";

export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  topic: z.enum(["question", "data", "bug", "suggestion", "business", "other"]),
  message: z.string().trim().min(10).max(5000),
  page: z.string().max(500).optional(),
  // spam traps: hidden field must stay empty; form must not be submitted faster than a human can type
  website: z.string().max(500).optional(),
  elapsedMs: z.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const rl = await rateLimit(req, "contact", 5, 600);
  if (!rl.ok) return tooMany(rl);

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return Response.json({ error: "bad_json", message: "Could not read the form." }, { status: 400 });
  }
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return Response.json(
      { error: "invalid", field, message: field === "email" ? "Please enter a valid email address." : field === "message" ? "Please write at least a sentence so we can help." : "Please check the form and try again." },
      { status: 400 },
    );
  }
  const b = parsed.data;
  const isBot = (b.website ?? "") !== "" || (b.elapsedMs != null && b.elapsedMs < 2500);
  if (isBot) return Response.json({ ok: true }); // silently accept, store nothing

  if (!hasDb()) {
    await captureError({ source: "server", name: "ContactNoDb", message: "Contact form received but DATABASE_URL missing", route: "/api/contact" });
    return Response.json({ error: "unavailable", message: `Our form is down — please email us directly.` }, { status: 503 });
  }

  try {
    const [row] = await db()
      .insert(schema.contactMessages)
      .values({
        name: b.name,
        email: b.email,
        topic: b.topic,
        message: b.message,
        page: b.page ?? null,
        ipHash: ipHash(req),
        userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      })
      .returning({ id: schema.contactMessages.id });

    const sent = await notifyOwner(
      `Contact #${row.id}: ${b.topic} from ${b.name}`,
      `New message via gablemath.com/contact\n\nFrom: ${b.name} <${b.email}>\nTopic: ${b.topic}\nPage: ${b.page ?? "-"}\n\n${b.message}\n\n— Reply directly to this email to answer ${b.name}.`,
      b.email,
    );
    if (sent) await db().update(schema.contactMessages).set({ notified: true }).where(eq(schema.contactMessages.id, row.id));
    return Response.json({ ok: true, id: row.id });
  } catch (err) {
    await captureError({ source: "server", route: "/api/contact", ...errorFrom(err) });
    return Response.json({ error: "server", message: "Something went wrong on our side — please email us directly." }, { status: 500 });
  }
}
