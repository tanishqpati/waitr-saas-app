import { prisma } from "../../config/db";
import type { AuthUser } from "../../middleware/auth";

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

async function userCanAccessRestaurant(userId: string, restaurantId: string): Promise<boolean> {
  const member = await prisma.restaurantMember.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  return !!member;
}

export async function createCategory(user: AuthUser, restaurantId: string, name: string, sortOrder?: number) {
  const can = await userCanAccessRestaurant(user.id, restaurantId);
  if (!can) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  return prisma.menuCategory.create({
    data: { restaurantId, name, sortOrder: sortOrder ?? 0 },
  });
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
  return prisma.menuItem.create({
    data: { restaurantId, categoryId, name, price, isAvailable: true },
  });
}
