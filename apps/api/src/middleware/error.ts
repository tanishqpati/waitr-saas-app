import { Request, Response, NextFunction } from "express";

export function errorMiddleware(
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.statusCode ?? 500;
  const message = err.message ?? "Internal server error";
  res.status(status).json({ error: message });
}
