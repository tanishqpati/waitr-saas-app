import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { createCategory, createMenuItem, getMenuBySlug } from "./menu.service";

export const menuPublicRouter = Router();
menuPublicRouter.get("/:slug/menu", async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (!slug) {
      res.status(400).json({ error: "Slug is required" });
      return;
    }
    const menu = await getMenuBySlug(slug);
    if (!menu) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }
    res.json(menu);
  } catch (e) {
    next(e);
  }
});

export const menuProtectedRouter = Router();
menuProtectedRouter.use(authMiddleware);
menuProtectedRouter.post("/categories", async (req, res, next) => {
  try {
    const restaurantId = req.body?.restaurant_id ?? req.body?.restaurantId;
    const name = req.body?.name;
    const sortOrder = req.body?.sort_order ?? req.body?.sortOrder;
    if (!req.user || !restaurantId || !name) {
      res.status(400).json({ error: "restaurant_id and name are required" });
      return;
    }
    const category = await createCategory(req.user, restaurantId, name, sortOrder);
    res.status(201).json(category);
  } catch (e) {
    next(e);
  }
});
menuProtectedRouter.post("/items", async (req, res, next) => {
  try {
    const restaurantId = req.body?.restaurant_id ?? req.body?.restaurantId;
    const categoryId = req.body?.category_id ?? req.body?.categoryId;
    const name = req.body?.name;
    const price = Number(req.body?.price);
    if (!req.user || !restaurantId || !categoryId || !name || Number.isNaN(price) || price < 0) {
      res.status(400).json({ error: "restaurant_id, category_id, name, and price are required" });
      return;
    }
    const item = await createMenuItem(req.user, restaurantId, categoryId, name, price);
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});
