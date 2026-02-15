import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createAddonBody,
  createCategoryBody,
  createMenuItemBody,
  createVariantBody,
  menuEditorQuery,
  menuItemIdParams,
  menuSlugParams,
  reorderMenuItemsBody,
  updateMenuItemBody,
} from "../../validators/menu";
import { createAddon, listAddons } from "./addons.service";
import {
  createCategory,
  createMenuItem,
  getMenuBySlugCached,
  getMenuForEditor,
  reorderMenuItems,
  updateMenuItem,
} from "./menu.service";
import { createVariant, listVariants } from "./variants.service";
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
menuProtectedRouter.get("/", validate(menuEditorQuery, "query"), async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const { restaurantId } = (req.validatedQuery ?? req.query) as { restaurantId: string };
    const menu = await getMenuForEditor(req.user, restaurantId);
    if (!menu) return next(notFound("Restaurant not found"));
    res.json(menu);
  } catch (e) {
    next(e);
  }
});
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
menuProtectedRouter.patch("/items/reorder", validate(reorderMenuItemsBody), async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const { restaurantId, itemIds } = req.body;
    await reorderMenuItems(req.user, restaurantId, itemIds);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
menuProtectedRouter.get("/items/:id/variants", validate(menuItemIdParams, "params"), async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await listVariants(req.user, id);
    res.json(data);
  } catch (e) {
    next(e);
  }
});
menuProtectedRouter.post(
  "/items/:id/variants",
  validate(menuItemIdParams, "params"),
  validate(createVariantBody),
  async (req, res, next) => {
    try {
      if (!req.user) return next(unauthorized());
      const { id } = (req.validatedParams ?? req.params) as { id: string };
      const { name, priceModifier } = req.body;
      const data = await createVariant(req.user, id, name, priceModifier);
      res.status(201).json(data);
    } catch (e) {
      next(e);
    }
  }
);
menuProtectedRouter.get("/items/:id/addons", validate(menuItemIdParams, "params"), async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await listAddons(req.user, id);
    res.json(data);
  } catch (e) {
    next(e);
  }
});
menuProtectedRouter.post(
  "/items/:id/addons",
  validate(menuItemIdParams, "params"),
  validate(createAddonBody),
  async (req, res, next) => {
    try {
      if (!req.user) return next(unauthorized());
      const { id } = (req.validatedParams ?? req.params) as { id: string };
      const { name, price } = req.body;
      const data = await createAddon(req.user, id, name, price);
      res.status(201).json(data);
    } catch (e) {
      next(e);
    }
  }
);
menuProtectedRouter.patch(
  "/items/:id",
  validate(menuItemIdParams, "params"),
  validate(updateMenuItemBody),
  async (req, res, next) => {
    try {
      if (!req.user) return next(unauthorized());
      const { id } = (req.validatedParams ?? req.params) as { id: string };
      const body = req.body;
      const data: { name?: string; price?: number; categoryId?: string; isAvailable?: boolean } = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.price !== undefined) data.price = body.price;
      if (body.categoryId !== undefined) data.categoryId = body.categoryId;
      if (body.isAvailable !== undefined) data.isAvailable = body.isAvailable;
      const item = await updateMenuItem(req.user, id, data);
      res.json(item);
    } catch (e) {
      next(e);
    }
  }
);
