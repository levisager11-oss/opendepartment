/**
 * A process-local fixed-window rate limiter.
 *
 * Deliberately in-memory, and worth being honest about what that means on
 * Vercel: each serverless instance keeps its own counter, so the real ceiling
 * is the limit multiplied by however many instances are warm. That still turns
 * an endpoint somebody can hammer into one they have to work at, which is the
 * job here -- the alternative is a Redis dependency for a platform whose whole
 * pitch is that it costs nothing to run.
 *
 * Same shape as the slug cache in src/lib/control/cache.ts: a Map with a cheap
 * bound, so a flood of distinct keys cannot grow it without limit.
 */
type Window = { count: number; resets: number };

const MAX_KEYS = 5_000;
const buckets = new Map<string, Window>();

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the window rolls over. For a Retry-After header. */
  retryAfter: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const hit = buckets.get(key);

  if (!hit || hit.resets <= now) {
    if (buckets.size >= MAX_KEYS) {
      // Drop the oldest insertion. Map preserves insertion order, and an
      // expired window is indistinguishable from an absent one anyway.
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    buckets.set(key, { count: 1, resets: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  hit.count += 1;
  return {
    ok: hit.count <= limit,
    retryAfter: Math.max(1, Math.ceil((hit.resets - now) / 1000)),
  };
}

/**
 * Best-effort client address.
 *
 * x-forwarded-for is caller-controlled in general; behind Vercel the leftmost
 * entry is the one Vercel wrote and the rest is whatever the client sent, so
 * this is a throttling key rather than an identity. Nothing is authorised on
 * the strength of it.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}
