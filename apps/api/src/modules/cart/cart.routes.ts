import { Router, type Request, type Response, type NextFunction } from "express";
import { validate } from "../../middleware/validate";
import { getOrCreateCartSessionId, getCart, setCart } from "./cart.service";
import { cartBodySchema } from "../../validators/cart";

export const cartRouter = Router();

cartRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getOrCreateCartSessionId(req, res);
    const items = await getCart(sessionId);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

cartRouter.put("/", validate(cartBodySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getOrCreateCartSessionId(req, res);
    const items = req.body.items as { menu_item_id: string; quantity: number }[];
    await setCart(sessionId, items);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});
