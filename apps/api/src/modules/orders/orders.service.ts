import { prisma } from "../../config/db";
import { logger } from "../../lib/logger";
import type { AuthUser } from "../../middleware/auth";

export const ORDER_STATUSES = ["NEW", "PREPARING", "READY", "COMPLETED"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

function isOrderStatus(s: string): s is OrderStatus {
  return ORDER_STATUSES.includes(s as OrderStatus);
}

type OrderLineInput = {
  menu_item_id: string;
  quantity: number;
  variant_id?: string;
  addon_ids?: string[];
};

export async function createOrder(
  restaurantId: string,
  tableId: string,
  items: OrderLineInput[]
) {
  if (!items.length) throw Object.assign(new Error("At least one item required"), { statusCode: 400 });
  const menuItemIds = [...new Set(items.map((i) => i.menu_item_id))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurantId, isAvailable: true },
    include: { variants: true, addons: true },
  });
  if (menuItems.length !== menuItemIds.length) {
    throw Object.assign(new Error("Invalid or unavailable menu items"), { statusCode: 400 });
  }
  const map = new Map(menuItems.map((m) => [m.id, m]));
  let total = 0;
  const lineItems: {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    variantNameSnapshot?: string;
    addonSnapshot?: string;
  }[] = [];
  for (const line of items) {
    const item = map.get(line.menu_item_id);
    if (!item || line.quantity < 1) throw Object.assign(new Error("Invalid item or quantity"), { statusCode: 400 });
    let priceNum = Number(item.price);
    let variantName: string | undefined;
    let addonNames: string[] = [];
    if (line.variant_id) {
      const v = item.variants.find((x) => x.id === line.variant_id);
      if (!v) throw Object.assign(new Error("Invalid variant"), { statusCode: 400 });
      priceNum += Number(v.priceModifier);
      variantName = v.name;
    }
    if (line.addon_ids?.length) {
      for (const aid of line.addon_ids) {
        const a = item.addons.find((x) => x.id === aid);
        if (!a) throw Object.assign(new Error("Invalid addon"), { statusCode: 400 });
        priceNum += Number(a.price);
        addonNames.push(a.name);
      }
    }
    total += priceNum * line.quantity;
    const displayName = [item.name, variantName, addonNames.length ? `(${addonNames.join(", ")})` : null]
      .filter(Boolean)
      .join(" ");
    lineItems.push({
      menuItemId: item.id,
      name: displayName,
      price: priceNum,
      quantity: line.quantity,
      variantNameSnapshot: variantName ?? undefined,
      addonSnapshot: addonNames.length ? addonNames.join(", ") : undefined,
    });
  }
  const order = await prisma.order.create({
    data: {
      restaurantId,
      tableId,
      status: "NEW",
      totalAmount: total,
      items: {
        create: lineItems.map((l) => ({
          menuItemId: l.menuItemId,
          nameSnapshot: l.name,
          priceSnapshot: l.price,
          quantity: l.quantity,
          variantNameSnapshot: l.variantNameSnapshot,
          addonSnapshot: l.addonSnapshot,
        })),
      },
    },
    include: { items: true, table: true },
  });
  const orderCount = await prisma.order.count({ where: { restaurantId } });
  if (orderCount === 1) {
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { onboardingStep: "TEST_ORDER_DONE" },
    });
  }
  logger.order("placed", { orderId: order.id, restaurantId, tableId, total });
  return order;
}

export async function listOrders(restaurantId: string) {
  return prisma.order.findMany({
    where: { restaurantId },
    include: {
      table: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  _user?: AuthUser
) {
  if (!isOrderStatus(status)) {
    throw Object.assign(new Error("Invalid status"), { statusCode: 400 });
  }
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
  logger.order("status_change", { orderId, status });
  return updated;
}
