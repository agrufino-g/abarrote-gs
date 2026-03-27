/**
 * In-memory sliding-window rate limiter.
 *
 * Production note: for multi-instance deployments (e.g. Vercel serverless),
 * replace this with a Redis-backed implementation (e.g. @upstash/ratelimit).
 * This provides per-instance protection which is still valuable.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

/** Evict expired entries every 5 minutes to prevent memory leaks */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let cleanupScheduled = false;

function scheduleCleanup(windowMs: number): void {
  if (cleanupScheduled) return;
  cleanupScheduled = true;

  if (typeof globalThis.setInterval === 'function') {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
        if (entry.timestamps.length === 0) {
          store.delete(key);
        }
      }
    }, CLEANUP_INTERVAL_MS);

    // Allow Node.js to exit even if the timer is active
    if (typeof timer === 'object' && 'unref' in timer) {
      timer.unref();
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Checks whether a given key (e.g. IP or userId) is within the rate limit.
 *
 * @example
 * ```ts
 * const result = checkRateLimit(`api:upload:${ip}`, { maxRequests: 20, windowMs: 60_000 });
 * if (!result.allowed) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 * ```
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  scheduleCleanup(config.windowMs);

  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => now - t < config.windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldestInWindow);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 0),
    };
  }

  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

/**
 * Extracts the client IP from Next.js request headers.
 * Falls back to 'unknown' — never returns an empty string.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; take the first (client)
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}
