// Lightweight in-process rate limiting + a concurrency gate for the judge.
//
// Scope: this is per-server-instance (a Map in memory), which matches the
// current single long-lived Node deployment (see CLAUDE.md deploy note). If the
// app is ever scaled horizontally, move these to a shared store (Redis). It is
// a compute-abuse backstop, not an auth boundary.

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()
let lastSweep = 0

function sweep(now: number) {
  // Amortized cleanup so the Map can't grow without bound from one-off keys.
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key)
  }
}

export type RateResult = { ok: boolean; retryAfterMs: number }

/** Fixed-window limiter: at most `limit` hits per `windowMs` for `key`. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateResult {
  const now = Date.now()
  sweep(now)
  const existing = windows.get(key)
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterMs: 0 }
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfterMs: Math.max(0, existing.resetAt - now) }
  }
  existing.count += 1
  return { ok: true, retryAfterMs: 0 }
}

/** Best-effort client IP from proxy headers, for limiting unauthenticated or
 * per-origin traffic. Falls back to a constant bucket when no header is set. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  )
}

// Global cap on concurrent server-side judge runs (compile + execute is the
// expensive part). Excess callers are rejected rather than queued, so a flood
// can't pile up unbounded work on the host.
let inFlight = 0
const MAX_CONCURRENT_JUDGE = Number(
  process.env.ALGOLOUNGE_MAX_CONCURRENT_JUDGE || 4
)

export function acquireJudgeSlot(): boolean {
  if (inFlight >= MAX_CONCURRENT_JUDGE) return false
  inFlight += 1
  return true
}

export function releaseJudgeSlot(): void {
  if (inFlight > 0) inFlight -= 1
}
