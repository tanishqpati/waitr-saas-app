import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  analyticsTodayQuery,
  analyticsPopularItemsQuery,
  analyticsSalesQuery,
} from "../../validators/analytics";
import { getAnalyticsToday, getPopularItems, getSalesOverTime } from "./analytics.service";
import { unauthorized } from "../../lib/errors";

export const analyticsRouter = Router();
analyticsRouter.use(authMiddleware);

analyticsRouter.get("/today", validate(analyticsTodayQuery, "query"), async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const { restaurantId } = (req.validatedQuery ?? req.query) as { restaurantId: string };
    const data = await getAnalyticsToday(req.user, restaurantId);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

analyticsRouter.get("/popular-items", validate(analyticsPopularItemsQuery, "query"), async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const { restaurantId } = (req.validatedQuery ?? req.query) as { restaurantId: string };
    const data = await getPopularItems(req.user, restaurantId);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

analyticsRouter.get("/sales", validate(analyticsSalesQuery, "query"), async (req, res, next) => {
  try {
    if (!req.user) return next(unauthorized());
    const { restaurantId, range } = (req.validatedQuery ?? req.query) as {
      restaurantId: string;
      range: "7d" | "12m";
    };
    const data = await getSalesOverTime(req.user, restaurantId, range);
    res.json(data);
  } catch (e) {
    next(e);
  }
});
