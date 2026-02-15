import { prisma } from "../../config/db";
import { invalidateMenuCache } from "./menu.service";
import { userCanAccessRestaurant } from "../restaurants/restaurants.service";
import type { AuthUser } from "../../middleware/auth";

export async function listVariants(user: AuthUser, menuItemId: string) {
  const item = await prisma.menuItem.findUnique({ where: { id: menuItemId }, include: { variants: true } });
  if (!item) throw Object.assign(new Error("Menu item not found"), { statusCode: 404 });
  const can = await userCanAccessRestaurant(user.id, item.restaurantId);
  if (!can) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  return item.variants.map((v) => ({
    id: v.id,
    name: v.name,
    priceModifier: Number(v.priceModifier),
  }));
}

export async function createVariant(
  user: AuthUser,
  menuItemId: string,
  name: string,
  priceModifier: number
) {
  const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!item) throw Object.assign(new Error("Menu item not found"), { statusCode: 404 });
  const can = await userCanAccessRestaurant(user.id, item.restaurantId);
  if (!can) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  const variant = await prisma.menuItemVariant.create({
    data: { menuItemId, name, priceModifier },
  });
  await invalidateMenuCache(item.restaurantId);
  return { id: variant.id, name: variant.name, priceModifier: Number(variant.priceModifier) };
}
