import { prisma } from "../../config/db";
import type { AuthUser } from "../../middleware/auth";

const ADMIN_ROLE = "ADMIN";

export async function createRestaurant(user: AuthUser, name: string, slug: string) {
  const slugNorm = slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const restaurant = await prisma.restaurant.create({
    data: { name, slug: slugNorm },
  });
  await prisma.restaurantMember.create({
    data: { userId: user.id, restaurantId: restaurant.id, role: ADMIN_ROLE },
  });
  return prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurant.id },
    include: { members: true },
  });
}

export async function listRestaurantsForUser(user: AuthUser) {
  const members = await prisma.restaurantMember.findMany({
    where: { userId: user.id },
    include: { restaurant: true },
  });
  return members.map((m) => m.restaurant);
}
