import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createCategoryBody, createMenuItemBody, menuSlugParams } from "../../validators/menu";
import { createCategory, createMenuItem, getMenuBySlugCached } from "./menu.service";
import { notFound, unauthorized } from "../../lib/errors";

export const menuPublicRouter = Router();
menuPublicRouter.get("/:slug/menu", validate(menuSlugParams, "params"), async (req, res, next) => {
  try {
    const { slug } = (req.validatedParams ?? req.params) as { slug: string };
    const menu = await getMenuBySlugCached(slug);
    if (!menu) return next(notFound("Restaurant not found"));
    res.json(menu);
  } catch (e) {
    next(e);
  }
});

export const menuProtectedRouter = Router();
menuProtectedRouter.use(authMiddleware);
menuProtectedRouter.post("/categories", validate(createCategoryBody), async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const { restaurantId, name, sortOrder } = req.body;
    const category = await createCategory(req.user, restaurantId, name, sortOrder);
    res.status(201).json(category);
  } catch (e) {
    next(e);
  }
});
menuProtectedRouter.post("/items", validate(createMenuItemBody), async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const { restaurantId, categoryId, name, price } = req.body;
    const item = await createMenuItem(req.user, restaurantId, categoryId, name, price);
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});
