import { logger } from './logger';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitInfo {
  remaining: number;
  reset: Date;
  isRateLimited: boolean;
}

const memoryCache = new Map<string, { count: number; expiresAt: number }>();

/**
 * Basic in-memory rate limiter using a sliding window algorithm.
 * For true distributed multi-node clusters, replace this with Upstash Redis or standard Redis logic.
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 10, windowMs: 60 * 1000 }
): Promise<RateLimitInfo> {
  const now = Date.now();
  const record = memoryCache.get(identifier);

  if (record) {
    if (now > record.expiresAt) {
      // Setup new window
      memoryCache.set(identifier, { count: 1, expiresAt: now + options.windowMs });
      return { remaining: options.limit - 1, reset: new Date(now + options.windowMs), isRateLimited: false };
    } else {
      // Accumulate in current window
      const count = record.count + 1;
      memoryCache.set(identifier, { count, expiresAt: record.expiresAt });
      
      const isRateLimited = count > options.limit;
      if (isRateLimited) {
        logger.warn('Rate limit exceeded', { identifier, count, limit: options.limit });
      }

      return {
        remaining: Math.max(0, options.limit - count),
        reset: new Date(record.expiresAt),
        isRateLimited,
      };
    }
  }

  // Setup initial window
  memoryCache.set(identifier, { count: 1, expiresAt: now + options.windowMs });
  return {
    remaining: options.limit - 1,
    reset: new Date(now + options.windowMs),
    isRateLimited: false,
  };
}
