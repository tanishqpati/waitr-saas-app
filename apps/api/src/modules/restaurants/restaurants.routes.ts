import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createRestaurantBody } from "../../validators/restaurants";
import { createRestaurant, getOnboardingProgress, listRestaurantsForUser } from "./restaurants.service";
import { unauthorized } from "../../lib/errors";

export const restaurantsRouter = Router();
restaurantsRouter.use(authMiddleware);

restaurantsRouter.post("/", validate(createRestaurantBody), async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const { name, slug, tableCount } = req.body;
    const restaurant = await createRestaurant(req.user, name, slug, tableCount);
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

restaurantsRouter.get("/onboarding-progress", async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const progress = await getOnboardingProgress(req.user);
    res.json(progress);
  } catch (e) {
    next(e);
  }
});
