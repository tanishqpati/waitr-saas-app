import express from "express";
import cors from "cors";
import { authRouter } from "./modules/auth/auth.routes";
import { menuPublicRouter, menuProtectedRouter } from "./modules/menu/menu.routes";
import { ordersRouter, ordersProtectedRouter } from "./modules/orders/orders.routes";
import { restaurantsRouter } from "./modules/restaurants/restaurants.routes";
import { errorMiddleware } from "./middleware/error";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => res.json({ message: "API running" }));

app.use("/auth", authRouter);
app.use("/restaurants", menuPublicRouter);
app.use("/menu", menuProtectedRouter);
app.use("/orders", ordersRouter);
app.use("/orders", ordersProtectedRouter);
app.use("/restaurants", restaurantsRouter);

app.use(errorMiddleware);
export default app;
