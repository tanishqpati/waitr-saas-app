import { z } from "zod";

const cartItemSchema = z.object({
  menu_item_id: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

export const cartBodySchema = z.object({
  items: z.array(cartItemSchema),
});

export type CartBody = z.infer<typeof cartBodySchema>;
