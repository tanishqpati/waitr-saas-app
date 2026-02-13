import { Request, Response, NextFunction } from "express";
import type { z } from "zod";

type SchemaSource = "body" | "query" | "params";

/**
 * Validates req[source] with the given Zod schema and assigns the result to req[source].
 * On failure, passes ZodError to next() for the global error middleware to handle.
 */
export function validate<T extends z.ZodTypeAny>(schema: T, source: SchemaSource = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (result.success) {
      if (source === "query") req.validatedQuery = result.data as Record<string, unknown>;
      else if (source === "params") req.validatedParams = result.data as Record<string, unknown>;
      else (req as { body: z.infer<T> }).body = result.data;
      next();
    } else {
      next(result.error);
    }
  };
}
