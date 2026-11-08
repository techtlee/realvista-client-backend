/**
 * Lets a seed script wait for the revalidate pings its own writes caused.
 *
 * The collection hooks ping the site fire-and-forget (an editor's save must
 * never wait on their website). A seed script that calls `process.exit()` as
 * soon as its last write resolves kills those in-flight requests, so the site
 * keeps serving the old content until its cache expires — the exact symptom
 * on-demand revalidation exists to prevent (F13).
 *
 * The hook resolves `fetch` at call time, so wrapping `globalThis.fetch` sees
 * every ping without changing the hook. The hook first reads the tenant and
 * only then calls `fetch`, so "nothing in flight" is not enough: settling also
 * waits for a short quiet period with no new ping.
 */

export interface PingSummary {
  sent: number
  ok: number
  failed: number
  /** Pings still unresolved when the deadline passed. */
  pending: number
}

export interface PingTracker {
  settle(opts?: { quietMs?: number; timeoutMs?: number }): Promise<PingSummary>
  restore(): void
}

export function trackRevalidatePings(siteUrl: string): PingTracker {
  const target = `${siteUrl.replace(/\/+$/, '')}/api/revalidate`
  const original = globalThis.fetch
  const inFlight = new Set<Promise<unknown>>()
  const summary = { sent: 0, ok: 0, failed: 0 }
  let lastActivity = Date.now()

  const wrapped: typeof fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const call = original(input, init)
    if (url !== target) return call

    summary.sent++
    lastActivity = Date.now()
    const tracked = call.then(
      (res) => {
        if (res.ok) summary.ok++
        else summary.failed++
      },
      () => {
        summary.failed++
      },
    )
    inFlight.add(tracked)
    void tracked.finally(() => {
      inFlight.delete(tracked)
      lastActivity = Date.now()
    })
    return call
  }
  globalThis.fetch = wrapped

  return {
    async settle({ quietMs = 750, timeoutMs = 15_000 } = {}) {
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        if (inFlight.size === 0 && Date.now() - lastActivity >= quietMs) break
        await new Promise((r) => setTimeout(r, 50))
      }
      return { ...summary, pending: inFlight.size }
    },
    restore() {
      if (globalThis.fetch === wrapped) globalThis.fetch = original
    },
  }
}
