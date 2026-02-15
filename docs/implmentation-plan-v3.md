What you’re describing now is the transition from **MVP ordering system → real restaurant operations dashboard**. I’ll break this down clearly into:

1. Non-technical product view (what the owner experiences)
2. Technical architecture (how to build it)
3. Database changes needed
4. APIs to implement
5. Frontend dashboard structure
6. Implementation order

This will give you a clear blueprint.

---

# 1. Non-Technical Breakdown (Owner Experience)

After onboarding, the owner should land on a **Dashboard Home**.

That dashboard should answer 3 questions instantly:

1. How much did I sell today?
2. What items are selling the most?
3. What orders are happening right now?

So the dashboard should have:

## Section 1 — Today Overview (Top Cards)

Show:

* Orders today
* Revenue today
* Average order value
* Active orders (NEW + PREPARING)

This gives instant value.

---

## Section 2 — Sales Graphs

Owner wants trends, not raw tables.

Show:

* Daily sales (last 7 days)
* Monthly sales (last 12 months)

Simple line graph is enough.

No complex BI needed.

---

## Section 3 — Popular Items

Show:

Top 5 most ordered items today or this week.

Restaurants use this to:

* know what’s working
* plan inventory

---

## Section 4 — Latest Orders

Table view:

* Order ID
* Table
* Amount
* Status
* Time

Owner can monitor operations.

---

## Section 5 — Menu Management

Owner should be able to:

* Edit item
* Disable item
* Change price
* Change category
* Reorder items

This is daily-use functionality.

---

## Section 6 — Variants and Add-ons

Restaurants need flexibility like:

Pizza:

* Small
* Medium
* Large

Pasta:

* Spaghetti
* Penne
* Fusilli

Extras:

* Extra cheese
* Extra sauce

These must be selectable when ordering.

This is essential for real restaurants.

---

# 2. Technical Architecture

You will add a new module:

```
modules/
  analytics/
  menu/
  variants/
```

Dashboard reads aggregated data, not raw tables.

Important principle:
Analytics queries should be optimized.

---

# 3. Database Changes Required

## 3.1 Menu Variants

Add table:

menu_item_variants

Fields:

* id
* menuItemId
* name (Small, Medium, Large)
* priceModifier

This allows sizes.

---

## 3.2 Add-ons

Add table:

menu_item_addons

Fields:

* id
* menuItemId
* name
* price

Examples:
Extra cheese
Extra olives

---

## 3.3 Order Items Update

OrderItem should store:

* variantNameSnapshot
* addonSnapshot

Never rely on live menu data.

---

# 4. Analytics Data Model

You already have orders and order_items.

Analytics is mostly queries, not new tables.

---

# 5. APIs to Implement

## 5.1 Analytics Today

Endpoint:

```
GET /analytics/today?restaurant_id=
```

Return:

```
{
  ordersCount: 42,
  revenue: 12650,
  avgOrderValue: 301,
  activeOrders: 6
}
```

---

## 5.2 Sales Over Time

Endpoint:

```
GET /analytics/sales?range=7d
```

Return:

```
[
 { date: "2026-02-10", revenue: 4200 },
 { date: "2026-02-11", revenue: 5100 }
]
```

---

## 5.3 Popular Items

Endpoint:

```
GET /analytics/popular-items
```

Query:

Group order_items by menu_item_id.

---

# 6. Menu Management APIs

## Edit Item

```
PATCH /menu/items/:id
```

Body:

```
{
  name,
  price,
  category_id,
  isAvailable
}
```

---

## Disable Item

Just:

```
isAvailable = false
```

Never delete menu items.

---

## Reorder Items

Add field:

```
sortOrder
```

API:

```
PATCH /menu/items/reorder
```

---

# 7. Variants APIs

## Create Variant

```
POST /menu/items/:id/variants
```

Body:

```
{
  name: "Large",
  priceModifier: 100
}
```

---

## Fetch Variants

```
GET /menu/items/:id/variants
```

---

# 8. Add-ons APIs

```
POST /menu/items/:id/addons
GET /menu/items/:id/addons
```

---

# 9. Frontend Dashboard Layout

Route:

```
/dashboard
```

Layout:

Top:
Summary cards

Middle:
Sales chart

Right:
Popular items

Bottom:
Latest orders

Left sidebar:
Dashboard
Menu
Orders
Settings

---

# 10. Frontend Menu Editor

Page:

```
/dashboard/menu
```

Features:

* Edit item modal
* Toggle availability
* Drag reorder (later)

Keep simple initially.

---

# 11. Charts Library

Use:
Recharts or Chart.js

Keep graphs simple:
Line chart only.

---

# 12. Query Strategy (Important)

Analytics queries must use:

```
GROUP BY
COUNT
SUM
```

Never fetch raw orders and compute in Node.

Let PostgreSQL do aggregation.

---

# 13. Performance Considerations

Add indexes:

orders.createdAt
orders.restaurantId
orderItems.menuItemId

This keeps analytics fast.

---

# 14. Implementation Order (Recommended)

Build in this order:

1. Analytics Today API
2. Dashboard UI cards
3. Popular items query
4. Sales graph query
5. Edit menu API
6. Disable item
7. Variants system
8. Add-ons

This gives visible progress quickly.

---

# 15. Real-World Advice

Restaurants care more about:

Revenue today
Popular items
Quick menu edits

More than:
Fancy charts
Complex filters

Keep dashboard simple and fast.

---

# 16. The Most Important UX Rule

Owner should open dashboard and in **3 seconds know**:

“How much did I earn today?”

If you achieve that, your dashboard is good.

