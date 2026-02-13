import { prisma } from "../../config/db";
import {
  getUpstashRedis,
  MENU_CACHE_PREFIX,
  MENU_CACHE_TTL_SEC,
} from "../../lib/upstash";
import type { AuthUser } from "../../middleware/auth";

export type MenuBySlugResult = Awaited<ReturnType<typeof getMenuBySlug>>;

export async function getMenuBySlug(slug: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: slug.toLowerCase() },
    include: {
      menuCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: { name: "asc" },
          },
        },
      },
      tables: { orderBy: { tableNumber: "asc" } },
    },
  });
  if (!restaurant) return null;
  return {
    restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
    tables: restaurant.tables.map((t) => ({ id: t.id, tableNumber: t.tableNumber })),
    categories: restaurant.menuCategories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      items: c.items.map((i) => ({
        id: i.id,
        name: i.name,
        price: Number(i.price),
        isAvailable: i.isAvailable,
      })),
    })),
  };
}

/** Get menu by slug with Upstash cache. On miss: DB → save to Redis → return. */
export async function getMenuBySlugCached(slug: string): Promise<MenuBySlugResult | null> {
  const redis = getUpstashRedis();
  const key = `${MENU_CACHE_PREFIX}${slug.toLowerCase()}`;
  if (redis) {
    const cached = await redis.get(key);
    if (typeof cached === "string") return JSON.parse(cached) as MenuBySlugResult;
  }
  const menu = await getMenuBySlug(slug);
  if (menu && redis) await redis.setex(key, MENU_CACHE_TTL_SEC, JSON.stringify(menu));
  return menu;
}

/** Invalidate menu cache for a restaurant (call after menu mutations). */
export async function invalidateMenuCache(restaurantId: string): Promise<void> {
  const redis = getUpstashRedis();
  if (!redis) return;
  const r = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { slug: true } });
  if (r) await redis.del(`${MENU_CACHE_PREFIX}${r.slug}`);
}

async function userCanAccessRestaurant(userId: string, restaurantId: string): Promise<boolean> {
  const member = await prisma.restaurantMember.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  return !!member;
}

export async function createCategory(user: AuthUser, restaurantId: string, name: string, sortOrder?: number) {
  const can = await userCanAccessRestaurant(user.id, restaurantId);
  if (!can) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  const category = await prisma.menuCategory.create({
    data: { restaurantId, name, sortOrder: sortOrder ?? 0 },
  });
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { onboardingStep: "MENU_ADDED" } as { onboardingStep: string },
  });
  await invalidateMenuCache(restaurantId);
  return category;
}

export async function createMenuItem(
  user: AuthUser,
  restaurantId: string,
  categoryId: string,
  name: string,
  price: number
) {
  const can = await userCanAccessRestaurant(user.id, restaurantId);
  if (!can) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  const item = await prisma.menuItem.create({
    data: { restaurantId, categoryId, name, price, isAvailable: true },
  });
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { onboardingStep: "MENU_ADDED" } as { onboardingStep: string },
  });
  await invalidateMenuCache(restaurantId);
  return item;
}
