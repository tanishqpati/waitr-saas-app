# Restaurant SaaS – MVP Completion Technical Guide

This document describes the **step-by-step technical tasks required to complete the MVP** of the restaurant ordering SaaS.

The MVP goal is:

1. Restaurant owner can log in (email OTP)
2. Menu can be created and fetched
3. Customer can view menu and place order
4. Kitchen dashboard can see and update orders
5. Data is stored in PostgreSQL
6. System works for multiple restaurants and tables

Do NOT implement in MVP:

* Payments
* OCR
* Voice ordering
* Analytics
* Loyalty
* SMS OTP

---

# 1. Project Setup

## 1.1 Monorepo Structure

Ensure project structure:

```
apps/
  web/
  api/
packages/
  types/
docs/
```

---

## 1.2 Backend Setup

Inside `apps/api`:

Install dependencies:

```
bun add express cors dotenv jsonwebtoken bcrypt
bun add -d typescript @types/node @types/express
```

Install ORM (choose one):

* Prisma (recommended for MVP)

```
bun add @prisma/client
bun add -d prisma
```

Initialize Prisma:

```
npx prisma init
```

---

## 1.3 Frontend Setup

Inside `apps/web`:

Create Next.js app:

```
bunx create-next-app@latest
```

Select:

* TypeScript
* Tailwind
* App Router

---

# 2. Database Implementation

## 2.1 Create Tables

Implement schema for:

### users

* id (uuid)
* email
* name
* created_at

### restaurants

* id
* name
* slug
* created_at

### restaurant_members

* id
* user_id
* restaurant_id
* role

### tables

* id
* restaurant_id
* table_number

### menu_categories

* id
* restaurant_id
* name
* sort_order

### menu_items

* id
* restaurant_id
* category_id
* name
* price
* is_available

### orders

* id
* restaurant_id
* table_id
* status
* total_amount
* created_at

### order_items

* id
* order_id
* menu_item_id
* name_snapshot
* price_snapshot
* quantity

### otp_codes

* id
* identifier
* otp
* expires_at

Run migration:

```
npx prisma migrate dev
```

---

# 3. Backend Core Architecture

Folder structure:

```
src/
  modules/
    auth/
    menu/
    orders/
    restaurants/
  config/
  middleware/
  app.ts
  server.ts
```

---

# 4. Auth Module (Email OTP)

## 4.1 Endpoints

POST /auth/send-otp
POST /auth/verify-otp

---

## 4.2 send-otp Flow

Steps:

1. Generate OTP
2. Store in otp_codes
3. Send email via Nodemailer

---

## 4.3 verify-otp Flow

Steps:

1. Validate OTP
2. Create user if not exists
3. Issue JWT
4. Return token

---

## 4.4 Middleware

Create:

```
middleware/auth.ts
```

Responsibilities:

* Verify JWT
* Attach user to request

---

# 5. Restaurant Module

Endpoints:

POST /restaurants
GET /restaurants

Steps:

1. Create restaurant
2. Link user as ADMIN in restaurant_members

---

# 6. Menu Module

## 6.1 Endpoints

GET /restaurants/:slug/menu
POST /menu/items
POST /menu/categories

---

## 6.2 Implementation Steps

1. Create repository to fetch categories and items
2. Group items by category in service layer
3. Return structured response

Response format:

```
{
  categories: [
    {
      name: "",
      items: []
    }
  ]
}
```

---

# 7. Orders Module

## 7.1 Endpoints

POST /orders
GET /orders
PATCH /orders/:id/status

---

## 7.2 Order Creation Logic

Steps:

1. Validate items
2. Fetch prices from DB
3. Calculate total
4. Insert order
5. Insert order_items with snapshots

---

## 7.3 Order Status Flow

Allowed statuses:

NEW
PREPARING
READY
COMPLETED

---

# 8. Kitchen Dashboard Backend

GET /orders?restaurant_id=xxx

Should return:

* table number
* items
* status

---

# 9. Frontend Implementation

## 9.1 Owner Login

Page:

```
/login
```

Flow:

1. Enter email
2. Enter OTP
3. Store JWT

---

## 9.2 Menu Page

Route:

```
/r/[slug]
```

Responsibilities:

* Fetch menu
* Display items
* Add to cart
* Show total

---

## 9.3 Place Order

Call:

POST /orders

Send:

* items
* table_id

Clear cart after success.

---

## 9.4 Kitchen Dashboard

Route:

```
/kitchen
```

Responsibilities:

* Fetch orders
* Display orders
* Update status

---

# 10. Polling for Updates

Implement:

* Refresh orders every 5 seconds

Realtime can be added later.

---

# 11. Error Handling

Backend must include:

* try/catch in controllers
* global error middleware

Frontend:

* show error toast
* retry option

---

# 12. Logging

Log:

* order placed
* order status change
* auth events

Use:

* pino or console for MVP

---

# 13. Seed Data

Insert:

* 1 restaurant
* 3 categories
* 10 items
* 10 tables

This allows full testing.

---

# 14. Testing Checklist

Verify:

Owner login works
Menu loads
Cart works
Order stored in DB
Kitchen sees order
Status updates work

---

# 15. Definition of MVP Completion

MVP is complete when:

Restaurant owner can log in
Restaurant has menu
Customer can place order
Kitchen can process order
System works for multiple tables
No crashes in basic usage

---

# 16. Next Steps After MVP

After completion begin:

QR generation
Menu management UI improvements
Payments integration
Realtime updates
AI features

---

# 17. Final Development Rule

Always build in this order:

Database → API → UI → polish

Never the reverse.
