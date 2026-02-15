import { prisma } from "../../config/db";
import { invalidateMenuCache } from "./menu.service";
import { userCanAccessRestaurant } from "../restaurants/restaurants.service";
import type { AuthUser } from "../../middleware/auth";

export async function listAddons(user: AuthUser, menuItemId: string) {
  const item = await prisma.menuItem.findUnique({ where: { id: menuItemId }, include: { addons: true } });
  if (!item) throw Object.assign(new Error("Menu item not found"), { statusCode: 404 });
  const can = await userCanAccessRestaurant(user.id, item.restaurantId);
  if (!can) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  return item.addons.map((a) => ({
    id: a.id,
    name: a.name,
    price: Number(a.price),
  }));
}

export async function createAddon(user: AuthUser, menuItemId: string, name: string, price: number) {
  const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!item) throw Object.assign(new Error("Menu item not found"), { statusCode: 404 });
  const can = await userCanAccessRestaurant(user.id, item.restaurantId);
  if (!can) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  const addon = await prisma.menuItemAddon.create({
    data: { menuItemId, name, price },
  });
  await invalidateMenuCache(item.restaurantId);
  return { id: addon.id, name: addon.name, price: Number(addon.price) };
}
