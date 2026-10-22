/**
 * In-memory sliding-window rate limiter.
 * Suitable for single-instance deployments (e.g., Vercel serverless with edge caching).
 * For multi-instance production, swap with Redis-based implementation.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean expired entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate-limited.
 *
 * @param identifier - Unique key (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed + remaining quota
 *
 * @example
 * const result = checkRateLimit(ip, { maxRequests: 10, windowMs: 60000 });
 * if (!result.allowed) {
 *   return apiError("RATE_LIMITED", "Too many requests", 429);
 * }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No existing entry or window expired — start fresh
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  // Within window — check count
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment and allow
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// ---- Preset Configs ----

/** Auth endpoints: 10 requests per 15 minutes */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
};

/** API endpoints: 100 requests per 15 minutes */
export const API_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 15 * 60 * 1000,
};
