import { z } from "zod";
import { restaurantNameSchema, slugSchema, tableCountSchema } from "./schemas";

export const createRestaurantBody = z.object({
  name: restaurantNameSchema,
  slug: slugSchema,
  table_count: tableCountSchema.optional(),
  tableCount: tableCountSchema.optional(),
}).transform((data) => ({
  name: data.name,
  slug: data.slug,
  tableCount: data.table_count ?? data.tableCount ?? 10,
}));

export type CreateRestaurantBody = z.infer<typeof createRestaurantBody>;
