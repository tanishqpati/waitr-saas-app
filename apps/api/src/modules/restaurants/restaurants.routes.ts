import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { createRestaurant, listRestaurantsForUser } from "./restaurants.service";

export const restaurantsRouter = Router();
restaurantsRouter.use(authMiddleware);

restaurantsRouter.post("/", async (req, res, next) => {
  try {
    const name = req.body?.name;
    const slug = req.body?.slug;
    if (!req.user || !name || typeof name !== "string" || !slug || typeof slug !== "string") {
      res.status(400).json({ error: "Name and slug are required" });
      return;
    }
    const restaurant = await createRestaurant(req.user, name, slug);
    res.status(201).json(restaurant);
  } catch (e) {
    next(e);
  }
});

restaurantsRouter.get("/", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const list = await listRestaurantsForUser(req.user);
    res.json(list);
  } catch (e) {
    next(e);
  }
});
