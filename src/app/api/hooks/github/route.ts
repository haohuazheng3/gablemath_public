import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { db, hasDb, schema } from '@/lib/db'
import { captureError } from '@/lib/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Deploy fallback. Production is built on GitHub Actions
 * (.github/workflows/deploy.yml) and uploaded to Vercel prebuilt; Vercel's own
 * git builds are off (vercel.json). GitHub sends `workflow_run` webhooks here,
 * and when a Deploy run on main ends without deploying — it failed, couldn't
 * start because the monthly Actions minutes are used up, or timed out — we
 * fire the Vercel Deploy Hook so Vercel builds main itself. Cancelled runs were
 * superseded by a newer push, so they don't fall back. A plain "failure" only falls back when the
 * run died within seconds (no minutes left / runner never started); a run that failed its checks
 * after doing real work must not ship, so it is recorded in the error inbox instead.
 */
const DEPLOY_WORKFLOW = '.github/workflows/deploy.yml'
const ALWAYS_FALLBACK = new Set(['startup_failure', 'timed_out'])
const INSTANT_FAILURE_SECONDS = 25

function hasValidSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature?.startsWith('sha256=')) return false
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`)
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function POST(req: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL
  if (!secret || !hookUrl) {
    return NextResponse.json({ error: 'Deploy fallback not configured.' }, { status: 503 })
  }

  const body = await req.text()
  if (!hasValidSignature(body, req.headers.get('x-hub-signature-256'), secret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  const event = req.headers.get('x-github-event')
  if (event === 'ping') return NextResponse.json({ ok: true })
  if (event !== 'workflow_run') return NextResponse.json({ ignored: event })

  const payload = JSON.parse(body)
  const run = payload.workflow_run ?? {}
  const isDeployOnMain =
    payload.action === 'completed' &&
    typeof run.path === 'string' &&
    run.path.startsWith(DEPLOY_WORKFLOW) &&
    run.head_branch === 'main'
  if (!isDeployOnMain) return NextResponse.json({ ignored: true })
  if (run.conclusion === 'success' && hasDb()) {
    // A green deploy supersedes earlier failed ones: close their inbox entries.
    await db()
      .update(schema.errors)
      .set({ resolvedAt: new Date() })
      .where(and(eq(schema.errors.name, 'DeployRunFailed'), isNull(schema.errors.resolvedAt)))
    return NextResponse.json({ resolved: 'previous deploy failures' })
  }
  const ranSeconds = (Date.parse(run.updated_at) - Date.parse(run.run_started_at ?? run.created_at)) / 1000
  const instantFailure = run.conclusion === 'failure' && Number.isFinite(ranSeconds) && ranSeconds < INSTANT_FAILURE_SECONDS
  if (run.conclusion === 'failure' && !instantFailure) {
    await captureError({
      source: 'cron',
      name: 'DeployRunFailed',
      message: `Deploy run ${run.id} failed its checks after ${Math.round(ranSeconds)}s — not falling back`,
      route: '/api/hooks/github',
      extra: { url: run.html_url, sha: run.head_sha },
    })
    return NextResponse.json({ ignored: 'genuine failure' })
  }
  if (!ALWAYS_FALLBACK.has(run.conclusion) && !instantFailure) return NextResponse.json({ ignored: true })

  const res = await fetch(hookUrl, { method: 'POST' })
  console.log(
    `[deploy-fallback] Deploy run ${run.id} (${run.head_sha}) ended "${run.conclusion}"; Vercel deploy hook → ${res.status}`,
  )
  return NextResponse.json({ fallback: true, hookStatus: res.status }, { status: res.ok ? 202 : 502 })
}
