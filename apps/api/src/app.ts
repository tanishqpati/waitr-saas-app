import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { config } from "./config/env";
import { errorMiddleware } from "./middleware/error";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { requestLogMiddleware } from "./middleware/requestLog";
import { notFound } from "./lib/errors";
import { authRouter } from "./modules/auth/auth.routes";
import { menuPublicRouter, menuProtectedRouter } from "./modules/menu/menu.routes";
import { ordersRouter, ordersProtectedRouter } from "./modules/orders/orders.routes";
import { restaurantsRouter } from "./modules/restaurants/restaurants.routes";

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
app.use(rateLimitMiddleware);

app.get("/", (_req, res) => res.json({ message: "API running" }));

app.use("/auth", authRouter);
app.use("/restaurants", menuPublicRouter);
app.use("/menu", menuProtectedRouter);
app.use("/orders", ordersRouter);
app.use("/orders", ordersProtectedRouter);
app.use("/restaurants", restaurantsRouter);

app.use((_req, _res, next) => next(notFound()));

app.use(errorMiddleware);
export default app;
