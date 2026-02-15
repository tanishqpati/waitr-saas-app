import { prisma } from "../../config/db";
import type { AuthUser } from "../../middleware/auth";

const ADMIN_ROLE = "ADMIN";

export async function userCanAccessRestaurant(userId: string, restaurantId: string): Promise<boolean> {
  const member = await prisma.restaurantMember.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  return !!member;
}

export async function createRestaurant(user: AuthUser, name: string, slug: string, tableCount: number = 10) {
  const slugNorm = slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const restaurant = await prisma.restaurant.create({
    data: { name, slug: slugNorm, onboardingStep: "CREATED" },
  });
  await prisma.restaurantMember.create({
    data: { userId: user.id, restaurantId: restaurant.id, role: ADMIN_ROLE },
  });
  const count = Math.min(50, Math.max(1, Math.floor(tableCount)));
  for (let t = 1; t <= count; t++) {
    await prisma.table.create({
      data: { restaurantId: restaurant.id, tableNumber: t },
    });
  }
  return prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurant.id },
    include: { members: true, tables: true },
  });
}

export async function listRestaurantsForUser(user: AuthUser) {
  const members = await prisma.restaurantMember.findMany({
    where: { userId: user.id },
    include: { restaurant: true },
  });
  return members.map((m) => m.restaurant);
}

export async function getOnboardingProgress(user: AuthUser) {
  const members = await prisma.restaurantMember.findMany({
    where: { userId: user.id },
    include: {
      restaurant: {
        include: {
          tables: true,
          menuCategories: true,
          _count: { select: { orders: true } },
        },
      },
    },
  });
  return members.map((m) => {
    const r = m.restaurant;
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      onboardingStep: r.onboardingStep ?? "CREATED",
      tableCount: r.tables.length,
      categoryCount: r.menuCategories.length,
      orderCount: r._count.orders,
    };
  });
}
