import { z } from "zod";
import {
  categoryNameSchema,
  itemNameSchema,
  priceSchema,
  sortOrderSchema,
  slugSchema,
  uuidSchema,
} from "./schemas";

export const menuSlugParams = z.object({
  slug: slugSchema,
});

export const createCategoryBody = z.object({
  restaurant_id: uuidSchema.optional(),
  restaurantId: uuidSchema.optional(),
  name: categoryNameSchema,
  sort_order: sortOrderSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
}).refine((d) => (d.restaurant_id ?? d.restaurantId) != null, { message: "restaurant_id is required" })
  .transform((data) => ({
    restaurantId: (data.restaurant_id ?? data.restaurantId) as string,
    name: data.name,
    sortOrder: data.sort_order ?? data.sortOrder ?? 0,
  }));

export const createMenuItemBody = z.object({
  restaurant_id: uuidSchema.optional(),
  restaurantId: uuidSchema.optional(),
  category_id: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  name: itemNameSchema,
  price: priceSchema,
}).refine((d) => (d.restaurant_id ?? d.restaurantId) != null, { message: "restaurant_id is required" })
  .refine((d) => (d.category_id ?? d.categoryId) != null, { message: "category_id is required" })
  .transform((data) => ({
    restaurantId: (data.restaurant_id ?? data.restaurantId) as string,
    categoryId: (data.category_id ?? data.categoryId) as string,
    name: data.name,
    price: data.price,
  }));

export type MenuSlugParams = z.infer<typeof menuSlugParams>;
export type CreateCategoryBody = z.infer<typeof createCategoryBody>;
export type CreateMenuItemBody = z.infer<typeof createMenuItemBody>;
