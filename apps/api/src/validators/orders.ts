import { z } from "zod";

const orderItemSchema = z.object({
  menu_item_id: z.string().min(1, "menu_item_id is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export const createOrderBody = z.object({
  table_id: z.string().min(1).optional(),
  tableId: z.string().min(1).optional(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
}).refine((d) => (d.table_id ?? d.tableId) != null, { message: "table_id is required" })
  .transform((data) => ({
    tableId: (data.table_id ?? data.tableId) as string,
    items: data.items,
  }));

export const listOrdersQuery = z.object({
  restaurant_id: z.string().min(1).optional(),
  restaurantId: z.string().min(1).optional(),
}).refine((d) => (d.restaurant_id ?? d.restaurantId) != null, { message: "restaurant_id is required" })
  .transform((data) => ({
    restaurantId: (data.restaurant_id ?? data.restaurantId) as string,
  }));

export const updateOrderStatusParams = z.object({
  id: z.string().min(1, "Order id is required"),
});

export const updateOrderStatusBody = z.object({
  status: z.enum(["NEW", "PREPARING", "READY", "COMPLETED"], { error: "Invalid status" }),
});

export type CreateOrderBody = z.infer<typeof createOrderBody>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;
export type UpdateOrderStatusParams = z.infer<typeof updateOrderStatusParams>;
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusBody>;
