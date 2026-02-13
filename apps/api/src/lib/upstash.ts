import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { config } from "../config/env";

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (redis != null) return redis;
  if (!config.upstashRedisRestUrl || !config.upstashRedisRestToken) return null;
  redis = new Redis({
    url: config.upstashRedisRestUrl,
    token: config.upstashRedisRestToken,
  });
  return redis;
}

/** Upstash Redis client. Null if UPSTASH_* env not set. */
export function getUpstashRedis(): Redis | null {
  return getRedis();
}

/** Rate limiter: 60 requests per 60 seconds per identifier. Null if Upstash not configured. */
export function getRateLimiter(): Ratelimit | null {
  if (ratelimit != null) return ratelimit;
  const r = getRedis();
  if (!r) return null;
  ratelimit = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(60, "60 s"),
    analytics: true,
  });
  return ratelimit;
}

export const MENU_CACHE_PREFIX = "menu:";
export const MENU_CACHE_TTL_SEC = 300; // 5 min
export const CART_PREFIX = "cart:";
export const CART_TTL_SEC = 60 * 60; // 1 hour
