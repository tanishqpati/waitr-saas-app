import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { AppError } from "../lib/errors";

/** Standard error response shape (frontend expects `error` string) */
export type ErrorResponse = {
  success: false;
  error: string;
  code?: string;
};

function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

function isZodError(
  err: unknown
): err is { errors?: { path: (string | number)[]; message: string }[]; issues?: { path: (string | number)[]; message: string }[] } {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { errors?: unknown; issues?: unknown };
  return Array.isArray(e.errors) || Array.isArray(e.issues);
}

/** Format Zod errors into a single message (supports .errors and .issues) */
function zodMessage(err: {
  errors?: { path: (string | number)[]; message: string }[];
  issues?: { path: (string | number)[]; message: string }[];
}): string {
  const list = err.errors ?? err.issues ?? [];
  const first = list[0];
  if (!first) return "Validation failed";
  const path = first.path?.length ? ` (${first.path.join(".")})` : "";
  return `${(first as { message?: string }).message ?? "Invalid input"}${path}`;
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let status = 500;
  let message = "Internal server error";
  let code: string | undefined;

  if (isAppError(err)) {
    status = err.statusCode;
    message = err.message;
    code = err.code;
  } else if (isZodError(err)) {
    status = 400;
    message = zodMessage(err);
    code = "VALIDATION_ERROR";
  } else if (err instanceof Error) {
    message = err.message;
    const statusCode = (err as Error & { statusCode?: number }).statusCode;
    if (typeof statusCode === "number") status = statusCode;
  }

  if (status >= 500) {
    logger.error("Unhandled error", err);
  }

  const body: ErrorResponse = { success: false, error: message };
  if (code) body.code = code;

  if (!res.headersSent) {
    res.status(status).json(body);
  }
}
