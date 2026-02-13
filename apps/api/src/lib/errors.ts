/**
 * Application error with HTTP status and optional code for clients.
 * Services throw this; global error middleware formats the response.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** 400 Bad Request */
export function badRequest(message: string, code?: string) {
  return new AppError(message, 400, code ?? "BAD_REQUEST");
}

/** 401 Unauthorized */
export function unauthorized(message: string = "Unauthorized") {
  return new AppError(message, 401, "UNAUTHORIZED");
}

/** 403 Forbidden */
export function forbidden(message: string = "Forbidden") {
  return new AppError(message, 403, "FORBIDDEN");
}

/** 404 Not Found */
export function notFound(message: string = "Not found") {
  return new AppError(message, 404, "NOT_FOUND");
}
