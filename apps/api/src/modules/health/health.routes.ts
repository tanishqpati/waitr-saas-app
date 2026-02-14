import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../../config/db";
import { config } from "../../config/env";
import { sessionStore } from "../../config/sessionStore";
import { getUpstashRedis } from "../../lib/upstash";

export const healthRouter = Router();

type Status = "ok" | "error" | "not_configured";

interface HealthResult {
  status: "ok" | "degraded";
  db: { status: Status; message?: string };
  redis: { status: Status; message?: string };
}

async function checkDb(): Promise<{ status: Status; message?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Database unreachable",
    };
  }
}

async function checkRedis(): Promise<{ status: Status; message?: string }> {
  const hasSessionRedis = !!config.redisUrl;
  const upstash = getUpstashRedis();

  if (!hasSessionRedis && !upstash) {
    return { status: "not_configured" };
  }

  const errors: string[] = [];

  if (hasSessionRedis) {
    try {
      await sessionStore.ping();
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Session Redis unreachable");
    }
  }

  if (upstash) {
    try {
      await upstash.ping();
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Upstash Redis unreachable");
    }
  }

  if (errors.length === 0) return { status: "ok" };
  return { status: "error", message: errors.join("; ") };
}

healthRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [db, redis] = await Promise.all([checkDb(), checkRedis()]);
    const overall: HealthResult["status"] = db.status === "ok" ? "ok" : "degraded";
    const body: HealthResult = { status: overall, db, redis };
    const statusCode = db.status === "ok" ? 200 : 503;
    res.status(statusCode).json(body);
  } catch (e) {
    next(e);
  }
});
