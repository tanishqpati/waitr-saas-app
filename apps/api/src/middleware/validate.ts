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
      (req as Record<SchemaSource, z.infer<T>>)[source] = result.data;
      next();
    } else {
      next(result.error);
    }
  };
}
