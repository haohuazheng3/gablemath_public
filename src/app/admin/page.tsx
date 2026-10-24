import type { Metadata } from "next";
import { desc, isNotNull, isNull, sql } from "drizzle-orm";
import { db, hasDb, schema } from "@/lib/db";
import { MarkOwnerOnMount } from "@/components/layout/OwnerMarker";
import { PageContainer } from "@/components/page/blocks";
import { ClientErrorDrill } from "./ClientErrorDrill";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Owner console", robots: { index: false, follow: false } };

function ago(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 129600) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default async function AdminPage() {
  if (!hasDb()) return <PageContainer className="py-16">DATABASE_URL missing.</PageContainer>;
  const [open, closed, messages, fb] = await Promise.all([
    db().select().from(schema.errors).where(isNull(schema.errors.resolvedAt)).orderBy(desc(schema.errors.lastSeen)).limit(100),
    db().select().from(schema.errors).where(isNotNull(schema.errors.resolvedAt)).orderBy(desc(schema.errors.resolvedAt)).limit(15),
    db().select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.createdAt)).limit(30),
    db()
      .select({
        calcKey: schema.feedback.calcKey,
        up: sql<number>`count(*) filter (where ${schema.feedback.helpful})::int`,
        down: sql<number>`count(*) filter (where not ${schema.feedback.helpful})::int`,
      })
      .from(schema.feedback)
      .groupBy(schema.feedback.calcKey)
      .orderBy(desc(sql`count(*)`))
      .limit(40),
  ]);

  return (
    <PageContainer className="space-y-8 py-10">
      <MarkOwnerOnMount />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-3xl">Owner console</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <a className="rounded-full bg-surface px-3 py-1.5 ring-1 ring-line" href="/api/health" target="_blank">/api/health</a>
          <a className="rounded-full bg-surface px-3 py-1.5 ring-1 ring-line" href="/api/admin/test-error" target="_blank">Trigger server error</a>
          <ClientErrorDrill />
        </div>
      </div>
      <p className="text-sm text-ink-3">This browser is marked as the owner: your visits are excluded from analytics.</p>

      <section className="module p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Open errors ({open.length})</h2>
          {open.length ? (
            <form action="/api/admin/errors/resolve" method="post">
              <input type="hidden" name="all" value="1" />
              <button className="rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-bg">Resolve all</button>
            </form>
          ) : null}
        </div>
        {open.length === 0 ? <p className="text-sm text-ok">No open errors. 🎉</p> : null}
        <ul className="divide-y divide-line">
          {open.map((e) => (
            <li key={e.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    <span className="mr-2 rounded bg-bad-soft px-1.5 py-0.5 text-xs text-bad">{e.source}</span>
                    {e.name}: {e.message}
                  </div>
                  <div className="mt-1 text-xs text-ink-3">
                    ×{e.count} · last {ago(e.lastSeen)} · first {ago(e.firstSeen)} · route {e.route ?? "—"}
                  </div>
                  {e.firstFrame ? <code className="mt-1 block truncate text-xs text-ink-3">{e.firstFrame}</code> : null}
                  {e.lastStack ? (
                    <details className="mt-1 text-xs">
                      <summary className="cursor-pointer text-ink-3">stack</summary>
                      <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-surface-2 p-2">{e.lastStack}</pre>
                    </details>
                  ) : null}
                </div>
                <form action="/api/admin/errors/resolve" method="post">
                  <input type="hidden" name="id" value={e.id} />
                  <button className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold ring-1 ring-line">Resolve</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        {closed.length ? (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-ink-3">Recently resolved ({closed.length})</summary>
            <ul className="mt-2 space-y-1 text-xs text-ink-3">
              {closed.map((e) => (
                <li key={e.id}>
                  {e.source} · {e.name}: {e.message} · ×{e.count} · resolved {e.resolvedAt ? ago(e.resolvedAt) : ""}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section className="module p-5">
        <h2 className="mb-3 text-lg font-semibold">Contact messages</h2>
        {messages.length === 0 ? <p className="text-sm text-ink-3">None yet.</p> : null}
        <ul className="divide-y divide-line">
          {messages.map((m) => (
            <li key={m.id} className="py-3 text-sm">
              <div className="font-semibold">
                #{m.id} · {m.topic} · {m.name} &lt;{m.email}&gt; <span className="font-normal text-ink-3">· {ago(m.createdAt)} · {m.notified ? "emailed ✓" : "email failed ✗"}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-ink-2">{m.message}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="module p-5">
        <h2 className="mb-3 text-lg font-semibold">Calculator feedback</h2>
        {fb.length === 0 ? <p className="text-sm text-ink-3">No votes yet.</p> : null}
        <table className="w-full text-sm">
          <tbody>
            {fb.map((f) => (
              <tr key={f.calcKey} className="border-t border-line">
                <td className="py-1.5">{f.calcKey}</td>
                <td className="py-1.5 text-ok">👍 {f.up}</td>
                <td className="py-1.5 text-bad">👎 {f.down}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageContainer>
  );
}
