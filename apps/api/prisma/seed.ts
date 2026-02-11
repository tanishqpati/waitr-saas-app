import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  let restaurant = await prisma.restaurant.findUnique({ where: { slug: "demo" } });
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: { name: "Demo Restaurant", slug: "demo" },
    });
  }

  const existingCats = await prisma.menuCategory.findMany({ where: { restaurantId: restaurant.id } });
  if (existingCats.length === 0) {
    const catNames = ["Starters", "Mains", "Desserts"];
    for (let i = 0; i < catNames.length; i++) {
      await prisma.menuCategory.create({
        data: { restaurantId: restaurant.id, name: catNames[i], sortOrder: i },
      });
    }
  }

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: "asc" },
  });
  const itemCount = await prisma.menuItem.count({ where: { restaurantId: restaurant.id } });
  if (itemCount === 0) {
    const itemNames = ["Soup", "Salad", "Wings", "Burger", "Pasta", "Steak", "Fish", "Pizza", "Ice Cream", "Cake"];
    const prices = [5.99, 6.99, 8.99, 12.99, 11.99, 18.99, 14.99, 10.99, 4.99, 5.49];
    for (let i = 0; i < itemNames.length; i++) {
      const cat = categories[i % categories.length];
      await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: cat.id,
          name: itemNames[i],
          price: prices[i],
          isAvailable: true,
        },
      });
    }
  }

  const tableCount = await prisma.table.count({ where: { restaurantId: restaurant.id } });
  if (tableCount === 0) {
    for (let t = 1; t <= 10; t++) {
      await prisma.table.create({
        data: { restaurantId: restaurant.id, tableNumber: t },
      });
    }
  }

  const items = await prisma.menuItem.count({ where: { restaurantId: restaurant.id } });
  const tables = await prisma.table.count({ where: { restaurantId: restaurant.id } });
  console.log("Seed done:", { restaurant: restaurant.slug, categories: categories.length, items, tables });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
