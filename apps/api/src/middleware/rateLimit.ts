import { Request, Response, NextFunction } from "express";
import { getRateLimiter } from "../lib/upstash";

/** Identifier for rate limiting: authenticated user id, or IP. */
function getIdentifier(req: Request): string {
  if (req.user?.id) return `user:${req.user.id}`;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  return `ip:${ip}`;
}

/**
 * Rate limit by user id (if authenticated) or IP.
 * When Upstash is not configured, passes through.
 */
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const limiter = getRateLimiter();
  if (!limiter) {
    next();
    return;
  }
  const id = getIdentifier(req);
  const { success, pending } = await limiter.limit(id);
  await pending;
  if (!success) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  next();
}
