import { z } from "zod";

/**
 * Shared Zod schemas and bounds for production hardening.
 * Use at every API boundary so bad data never reaches the DB.
 */

// —— Slug (restaurant / menu URL segment) ——
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LEN = 100;
export const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(SLUG_MAX_LEN, `Slug must be at most ${SLUG_MAX_LEN} characters`)
  .transform((s) => s.toLowerCase().trim())
  .refine((s) => SLUG_REGEX.test(s), "Slug: lowercase letters, numbers, single hyphens between segments");

// —— Names ——
export const RESTAURANT_NAME_MAX = 200;
export const CATEGORY_NAME_MAX = 120;
export const ITEM_NAME_MAX = 200;

export const restaurantNameSchema = z
  .string()
  .min(1, "Name is required")
  .max(RESTAURANT_NAME_MAX, `Name must be at most ${RESTAURANT_NAME_MAX} characters`)
  .transform((s) => s.trim());

export const categoryNameSchema = z
  .string()
  .min(1, "Name is required")
  .max(CATEGORY_NAME_MAX, `Name must be at most ${CATEGORY_NAME_MAX} characters`)
  .transform((s) => s.trim());

export const itemNameSchema = z
  .string()
  .min(1, "Name is required")
  .max(ITEM_NAME_MAX, `Name must be at most ${ITEM_NAME_MAX} characters`)
  .transform((s) => s.trim());

// —— Price (DB: Decimal 10,2) ——
export const PRICE_MIN = 0;
export const PRICE_MAX = 999_999.99;
export const priceSchema = z.coerce
  .number()
  .min(PRICE_MIN, "Price must be >= 0")
  .max(PRICE_MAX, `Price must be at most ${PRICE_MAX}`);

// —— Table count / numbers ——
export const TABLE_COUNT_MIN = 1;
export const TABLE_COUNT_MAX = 50;
export const tableCountSchema = z.coerce
  .number()
  .int("Table count must be an integer")
  .min(TABLE_COUNT_MIN, `Table count must be between ${TABLE_COUNT_MIN} and ${TABLE_COUNT_MAX}`)
  .max(TABLE_COUNT_MAX, `Table count must be between ${TABLE_COUNT_MIN} and ${TABLE_COUNT_MAX}`);

// —— Sort order ——
export const SORT_ORDER_MIN = 0;
export const SORT_ORDER_MAX = 100_000;
export const sortOrderSchema = z.coerce
  .number()
  .int()
  .min(SORT_ORDER_MIN)
  .max(SORT_ORDER_MAX);

// —— UUIDs (Prisma ids) ——
export const uuidSchema = z.string().uuid("Invalid id format");

// —— Order / cart line items ——
export const ORDER_ITEM_QUANTITY_MAX = 99;
export const ORDER_ITEMS_MAX = 50;
export const orderQuantitySchema = z.coerce
  .number()
  .int("Quantity must be an integer")
  .min(1, "Quantity must be at least 1")
  .max(ORDER_ITEM_QUANTITY_MAX, `Quantity must be at most ${ORDER_ITEM_QUANTITY_MAX}`);

export const orderItemSchema = z.object({
  menu_item_id: uuidSchema,
  quantity: orderQuantitySchema,
  variant_id: uuidSchema.optional(),
  addon_ids: z.array(uuidSchema).max(10).optional(),
});

export const orderItemsArraySchema = z
  .array(orderItemSchema)
  .min(1, "At least one item is required")
  .max(ORDER_ITEMS_MAX, `At most ${ORDER_ITEMS_MAX} items per order`);

// —— OTP ——
export const OTP_LENGTH = 6;
export const otpSchema = z
  .string()
  .length(OTP_LENGTH, `OTP must be ${OTP_LENGTH} digits`)
  .regex(/^\d+$/, "OTP must contain only digits");
