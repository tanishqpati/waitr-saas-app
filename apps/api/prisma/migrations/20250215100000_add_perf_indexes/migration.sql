-- Add performance indexes for restaurant-scoped and time-ordered queries.

-- Tables: lookup by restaurant
CREATE INDEX "tables_restaurant_id_idx" ON "tables"("restaurant_id");

-- MenuItem: lookup by restaurant (menu fetch, item validation)
CREATE INDEX "menu_items_restaurant_id_idx" ON "menu_items"("restaurant_id");

-- Order: list by restaurant, sort by time, and combined (kitchen dashboard)
CREATE INDEX "orders_restaurant_id_idx" ON "orders"("restaurant_id");
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");
CREATE INDEX "orders_restaurant_id_created_at_idx" ON "orders"("restaurant_id", "created_at");
