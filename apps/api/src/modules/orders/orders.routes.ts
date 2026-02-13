import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getIO, roomForRestaurant } from "../../lib/socket";
import { validate } from "../../middleware/validate";
import {
  createOrderBody,
  listOrdersQuery,
  updateOrderStatusBody,
  updateOrderStatusParams,
} from "../../validators/orders";
import { createOrder, listOrders, updateOrderStatus } from "./orders.service";
import { prisma } from "../../config/db";
import { notFound } from "../../lib/errors";

function serializeOrder(order: {
  id: string;
  status: string;
  totalAmount: unknown;
  createdAt: Date;
  table: { id: string; tableNumber: number } | null;
  items: { id: string; nameSnapshot: string; priceSnapshot: unknown; quantity: number }[];
}) {
  return {
    id: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt,
    table: order.table ? { id: order.table.id, tableNumber: order.table.tableNumber } : null,
    items: order.items.map((i) => ({
      id: i.id,
      nameSnapshot: i.nameSnapshot,
      priceSnapshot: Number(i.priceSnapshot),
      quantity: i.quantity,
    })),
  };
}

export const ordersRouter = Router();

ordersRouter.post("/", validate(createOrderBody), async (req, res, next) => {
  try {
    const { tableId, items } = req.body;
    const table = await prisma.table.findUnique({ where: { id: tableId }, include: { restaurant: true } });
    if (!table) return next(notFound("Table not found"));
    const order = await createOrder(table.restaurantId, tableId, items);
    try {
      getIO().to(roomForRestaurant(table.restaurantId)).emit("order_created", serializeOrder(order));
    } catch {
      // Socket not critical for API response
    }
    res.status(201).json(order);
  } catch (e) {
    next(e);
  }
});

const ordersProtected = Router();
ordersProtected.use(authMiddleware);

ordersProtected.get("/", validate(listOrdersQuery, "query"), async (req, res, next) => {
  try {
    const { restaurantId } = (req.validatedQuery ?? req.query) as { restaurantId: string };
    const orders = await listOrders(restaurantId);
    res.json(
      orders.map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt,
        table: o.table ? { id: o.table.id, tableNumber: o.table.tableNumber } : null,
        items: o.items.map((i) => ({
          id: i.id,
          nameSnapshot: i.nameSnapshot,
          priceSnapshot: Number(i.priceSnapshot),
          quantity: i.quantity,
        })),
      }))
    );
  } catch (e) {
    next(e);
  }
});

ordersProtected.patch(
  "/:id/status",
  validate(updateOrderStatusParams, "params"),
  validate(updateOrderStatusBody),
  async (req, res, next) => {
    try {
      const { id } = (req.validatedParams ?? req.params) as { id: string };
      const { status } = req.body;
      const order = await updateOrderStatus(id, status, req.user);
      try {
        getIO().to(roomForRestaurant(order.restaurantId)).emit("order_status_updated", {
          orderId: order.id,
          status: order.status,
        });
      } catch {
        // Socket not critical for API response
      }
      res.json(order);
    } catch (e) {
      next(e);
    }
  }
);

export const ordersProtectedRouter = ordersProtected;
