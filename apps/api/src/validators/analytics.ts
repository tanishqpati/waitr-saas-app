import { z } from "zod";
import { uuidSchema } from "./schemas";

export const analyticsTodayQuery = z.object({
  restaurant_id: uuidSchema.optional(),
  restaurantId: uuidSchema.optional(),
})
  .refine((d) => (d.restaurant_id ?? d.restaurantId) != null, { message: "restaurant_id is required" })
  .transform((data) => ({
    restaurantId: (data.restaurant_id ?? data.restaurantId) as string,
  }));

export const analyticsSalesQuery = z.object({
  restaurant_id: uuidSchema.optional(),
  restaurantId: uuidSchema.optional(),
  range: z.enum(["7d", "12m"]).default("7d"),
})
  .refine((d) => (d.restaurant_id ?? d.restaurantId) != null, { message: "restaurant_id is required" })
  .transform((data) => ({
    restaurantId: (data.restaurant_id ?? data.restaurantId) as string,
    range: data.range as "7d" | "12m",
  }));

export const analyticsPopularItemsQuery = z.object({
  restaurant_id: uuidSchema.optional(),
  restaurantId: uuidSchema.optional(),
})
  .refine((d) => (d.restaurant_id ?? d.restaurantId) != null, { message: "restaurant_id is required" })
  .transform((data) => ({
    restaurantId: (data.restaurant_id ?? data.restaurantId) as string,
  }));
