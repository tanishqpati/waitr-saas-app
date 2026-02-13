import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function requestLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    logger.info("Request", {
      method: req.method,
      url: req.originalUrl ?? req.url,
      statusCode: res.statusCode,
      durationMs,
    });
  });
  next();
}
