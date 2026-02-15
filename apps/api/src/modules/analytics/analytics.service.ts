import { prisma } from "../../config/db";
import { userCanAccessRestaurant } from "../restaurants/restaurants.service";
import type { AuthUser } from "../../middleware/auth";

const activeStatuses = ["NEW", "PREPARING"] as const;

export async function getAnalyticsToday(user: AuthUser, restaurantId: string) {
  const can = await userCanAccessRestaurant(user.id, restaurantId);
  if (!can) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [ordersAgg, activeCount] = await Promise.all([
    prisma.order.aggregate({
      where: {
        restaurantId,
        createdAt: { gte: startOfToday },
        status: { in: ["NEW", "PREPARING", "READY", "COMPLETED"] },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({
      where: {
        restaurantId,
        status: { in: activeStatuses },
      },
    }),
  ]);

  const ordersCount = ordersAgg._count.id;
  const revenue = Number(ordersAgg._sum.totalAmount ?? 0);
  const avgOrderValue = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

  return {
    ordersCount,
    revenue,
    avgOrderValue,
    activeOrders: activeCount,
  };
}

export async function getPopularItems(user: AuthUser, restaurantId: string, period: "today" | "week" = "today") {
  const can = await userCanAccessRestaurant(user.id, restaurantId);
  if (!can) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });

  const since = new Date();
  if (period === "today") {
    since.setHours(0, 0, 0, 0);
  } else {
    since.setDate(since.getDate() - 7);
  }

  const rows = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: {
      order: {
        restaurantId,
        createdAt: { gte: since },
      },
    },
    _sum: { quantity: true },
    orderBy: [{ _sum: { quantity: "desc" } }],
    take: 5,
  });

  const menuItemIds = rows.map((r) => r.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(menuItems.map((m) => [m.id, m.name]));

  return rows.map((r) => ({
    menuItemId: r.menuItemId,
    name: nameMap.get(r.menuItemId) ?? "Unknown",
    quantity: r._sum.quantity ?? 0,
  }));
}

export async function getSalesOverTime(
  user: AuthUser,
  restaurantId: string,
  range: "7d" | "12m"
): Promise<{ date: string; revenue: number }[]> {
  const can = await userCanAccessRestaurant(user.id, restaurantId);
  if (!can) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });

  const since = new Date();
  if (range === "7d") {
    since.setDate(since.getDate() - 7);
  } else {
    since.setMonth(since.getMonth() - 12);
  }

  type Row = { dt: Date | string; revenue: unknown };
  const rows =
    range === "7d"
      ? await prisma.$queryRaw<Row[]>`
          SELECT DATE(o.created_at) AS dt, COALESCE(SUM(o.total_amount), 0)::decimal AS revenue
          FROM orders o
          WHERE o.restaurant_id = ${restaurantId}
            AND o.created_at >= ${since}
            AND o.status IN ('NEW', 'PREPARING', 'READY', 'COMPLETED')
          GROUP BY DATE(o.created_at)
          ORDER BY dt ASC
        `
      : await prisma.$queryRaw<Row[]>`
          SELECT DATE_TRUNC('month', o.created_at)::date AS dt, COALESCE(SUM(o.total_amount), 0)::decimal AS revenue
          FROM orders o
          WHERE o.restaurant_id = ${restaurantId}
            AND o.created_at >= ${since}
            AND o.status IN ('NEW', 'PREPARING', 'READY', 'COMPLETED')
          GROUP BY DATE_TRUNC('month', o.created_at)
          ORDER BY dt ASC
        `;

  return rows.map((r) => ({
    date: (typeof r.dt === "string" ? r.dt : r.dt.toISOString()).slice(0, 10),
    revenue: Number(r.revenue),
  }));
}
