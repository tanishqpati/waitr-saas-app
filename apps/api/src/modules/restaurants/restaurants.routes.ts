import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createRestaurantBody } from "../../validators/restaurants";
import { createRestaurant, listRestaurantsForUser } from "./restaurants.service";
import { unauthorized } from "../../lib/errors";

export const restaurantsRouter = Router();
restaurantsRouter.use(authMiddleware);

restaurantsRouter.post("/", validate(createRestaurantBody), async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const { name, slug } = req.body;
    const restaurant = await createRestaurant(req.user, name, slug);
    res.status(201).json(restaurant);
  } catch (e) {
    next(e);
  }
});

restaurantsRouter.get("/", async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const list = await listRestaurantsForUser(req.user);
    res.json(list);
  } catch (e) {
    next(e);
  }
});
