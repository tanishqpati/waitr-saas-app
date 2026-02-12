import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const CATEGORY_NAMES = ["Starters", "Mains", "Desserts"];
const ITEM_NAMES = ["Soup", "Salad", "Wings", "Burger", "Pasta", "Steak", "Fish", "Pizza", "Ice Cream", "Cake"];
const ITEM_PRICES = [5.99, 6.99, 8.99, 12.99, 11.99, 18.99, 14.99, 10.99, 4.99, 5.49];
const TABLE_COUNT = 10;

async function seedRestaurant(name: string, slug: string, ownerEmail?: string) {
  let restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: { name, slug },
    });
  }

  if (ownerEmail) {
    const email = ownerEmail.toLowerCase().trim();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name: null },
      });
    }
    await prisma.restaurantMember.upsert({
      where: {
        userId_restaurantId: { userId: user.id, restaurantId: restaurant.id },
      },
      create: { userId: user.id, restaurantId: restaurant.id, role: "ADMIN" },
      update: { role: "ADMIN" },
    });
  }

  const existingCats = await prisma.menuCategory.findMany({ where: { restaurantId: restaurant.id } });
  if (existingCats.length === 0) {
    for (let i = 0; i < CATEGORY_NAMES.length; i++) {
      await prisma.menuCategory.create({
        data: { restaurantId: restaurant.id, name: CATEGORY_NAMES[i], sortOrder: i },
      });
    }
  }

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: "asc" },
  });
  const itemCount = await prisma.menuItem.count({ where: { restaurantId: restaurant.id } });
  if (itemCount === 0) {
    for (let i = 0; i < ITEM_NAMES.length; i++) {
      const cat = categories[i % categories.length];
      await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: cat.id,
          name: ITEM_NAMES[i],
          price: ITEM_PRICES[i],
          isAvailable: true,
        },
      });
    }
  }

  const tableCount = await prisma.table.count({ where: { restaurantId: restaurant.id } });
  if (tableCount === 0) {
    for (let t = 1; t <= TABLE_COUNT; t++) {
      await prisma.table.create({
        data: { restaurantId: restaurant.id, tableNumber: t },
      });
    }
  }

  const items = await prisma.menuItem.count({ where: { restaurantId: restaurant.id } });
  const tables = await prisma.table.count({ where: { restaurantId: restaurant.id } });
  return { slug: restaurant.slug, categories: categories.length, items, tables };
}

async function main() {
  const ownerEmail = "tanishq.patidar@kalvium.community";

  const demo = await seedRestaurant("Demo Restaurant", "demo");
  console.log("Demo:", demo);

  const tanishq = await seedRestaurant("Tanishq baba ka dhaba", "tanishq", ownerEmail);
  console.log("Tanishq's Restaurant (owner: " + ownerEmail + "):", tanishq);

  console.log("Seed done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
