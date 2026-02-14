import { z } from "zod";
import { orderItemSchema, ORDER_ITEMS_MAX } from "./schemas";

const cartItemsArraySchema = z
  .array(orderItemSchema)
  .max(ORDER_ITEMS_MAX, `At most ${ORDER_ITEMS_MAX} items in cart`);

export const cartBodySchema = z.object({
  items: cartItemsArraySchema,
});

export type CartBody = z.infer<typeof cartBodySchema>;
