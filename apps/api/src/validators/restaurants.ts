import { z } from "zod";

export const createRestaurantBody = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens only"),
});

export type CreateRestaurantBody = z.infer<typeof createRestaurantBody>;
