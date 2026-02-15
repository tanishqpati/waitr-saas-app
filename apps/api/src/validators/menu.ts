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

export const menuEditorQuery = z.object({
  restaurant_id: uuidSchema.optional(),
  restaurantId: uuidSchema.optional(),
}).refine((d) => (d.restaurant_id ?? d.restaurantId) != null, { message: "restaurant_id is required" })
  .transform((data) => ({
    restaurantId: (data.restaurant_id ?? data.restaurantId) as string,
  }));

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

export const menuItemIdParams = z.object({ id: uuidSchema });

export const updateMenuItemBody = z.object({
  name: itemNameSchema.optional(),
  price: priceSchema.optional(),
  category_id: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  isAvailable: z.boolean().optional(),
}).transform((data) => ({
  name: data.name,
  price: data.price,
  categoryId: data.category_id ?? data.categoryId,
  isAvailable: data.isAvailable,
}));

export const reorderMenuItemsBody = z.object({
  restaurant_id: uuidSchema.optional(),
  restaurantId: uuidSchema.optional(),
  item_ids: z.array(uuidSchema).optional(),
  itemIds: z.array(uuidSchema).optional(),
}).refine((d) => (d.restaurant_id ?? d.restaurantId) != null, { message: "restaurant_id is required" })
  .refine((d) => (d.item_ids ?? d.itemIds) != null && (d.item_ids ?? d.itemIds)!.length > 0, {
    message: "item_ids is required and must not be empty",
  })
  .transform((data) => ({
    restaurantId: (data.restaurant_id ?? data.restaurantId) as string,
    itemIds: (data.item_ids ?? data.itemIds) as string[],
  }));

export type MenuSlugParams = z.infer<typeof menuSlugParams>;
export type CreateCategoryBody = z.infer<typeof createCategoryBody>;
export type CreateMenuItemBody = z.infer<typeof createMenuItemBody>;
export type UpdateMenuItemBody = z.infer<typeof updateMenuItemBody>;
export const createVariantBody = z.object({
  name: itemNameSchema,
  priceModifier: z.coerce.number(),
}).transform((d) => ({ name: d.name, priceModifier: d.priceModifier }));

export const createAddonBody = z.object({
  name: itemNameSchema,
  price: priceSchema,
});

export type ReorderMenuItemsBody = z.infer<typeof reorderMenuItemsBody>;
