import { z } from "zod";

export const menuSlugParams = z.object({
  slug: z.string().min(1, "Slug is required"),
});

export const createCategoryBody = z.object({
  restaurant_id: z.string().min(1).optional(),
  restaurantId: z.string().min(1).optional(),
  name: z.string().min(1, "Name is required"),
  sort_order: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).optional(),
}).refine((d) => (d.restaurant_id ?? d.restaurantId) != null, { message: "restaurant_id is required" })
  .transform((data) => ({
    restaurantId: (data.restaurant_id ?? data.restaurantId) as string,
    name: data.name,
    sortOrder: data.sort_order ?? data.sortOrder ?? 0,
  }));

export const createMenuItemBody = z.object({
  restaurant_id: z.string().min(1).optional(),
  restaurantId: z.string().min(1).optional(),
  category_id: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().min(0, "Price must be >= 0"),
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
