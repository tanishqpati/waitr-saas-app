import { z } from "zod";

export const createRestaurantBody = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens only"),
  table_count: z.coerce.number().int().min(1).max(50).optional(),
  tableCount: z.coerce.number().int().min(1).max(50).optional(),
}).transform((data) => ({
  name: data.name,
  slug: data.slug,
  tableCount: data.table_count ?? data.tableCount ?? 10,
}));

export type CreateRestaurantBody = z.infer<typeof createRestaurantBody>;
