import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { config } from "./config/env";
import { errorMiddleware } from "./middleware/error";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { requestLogMiddleware } from "./middleware/requestLog";
import { notFound, unauthorized } from "./lib/errors";
import { authMiddleware } from "./middleware/auth";
import { validate } from "./middleware/validate";
import { analyticsRouter } from "./modules/analytics/analytics.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { cartRouter } from "./modules/cart/cart.routes";
import { healthRouter } from "./modules/health/health.routes";
import { getMenuForEditor } from "./modules/menu/menu.service";
import { menuPublicRouter, menuProtectedRouter } from "./modules/menu/menu.routes";
import { ordersRouter, ordersProtectedRouter } from "./modules/orders/orders.routes";
import { restaurantsRouter } from "./modules/restaurants/restaurants.routes";
import { menuEditorQuery } from "./validators/menu";

const app = express();
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(requestLogMiddleware);

app.get("/", (_req, res) => res.json({ message: "API running" }));
app.use("/health", healthRouter);

app.use(rateLimitMiddleware);

app.use("/auth", authRouter);
app.use("/analytics", analyticsRouter);
app.use("/cart", cartRouter);
app.use("/restaurants", menuPublicRouter);
app.get(
  "/menu/editor",
  authMiddleware,
  validate(menuEditorQuery, "query"),
  async (req, res, next) => {
    try {
      if (!req.user) return next(unauthorized());
      const { restaurantId } = (req.validatedQuery ?? req.query) as { restaurantId: string };
      const menu = await getMenuForEditor(req.user, restaurantId);
      if (!menu) return next(notFound("Restaurant not found"));
      res.json(menu);
    } catch (e) {
      next(e);
    }
  }
);
app.use("/menu", menuProtectedRouter);
app.use("/orders", ordersRouter);
app.use("/orders", ordersProtectedRouter);
app.use("/restaurants", restaurantsRouter);

app.use((_req, _res, next) => next(notFound()));

app.use(errorMiddleware);
export default app;
