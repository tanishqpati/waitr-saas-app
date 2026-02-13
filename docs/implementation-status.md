# Waitr – Implementation Status

This document describes **what has been implemented** in the Waitr restaurant ordering SaaS, consolidating the original MVP plan and onboarding (v2) plan. Use it as the single source of truth for current features and architecture.

---

## Overview

**MVP goal (achieved):**

1. Restaurant owner can log in (email OTP).
2. Menu can be created and fetched.
3. Customer can view menu and place order.
4. Kitchen dashboard can see and update orders.
5. Data is stored in PostgreSQL.
6. System works for multiple restaurants and tables.

**Onboarding goal (achieved):** Owner goes from sign-up → first order in a guided wizard (Create Restaurant → Add Menu → QR → Test Order → Kitchen → Go Live).

**Not in scope (per plan):** Payments, OCR, voice ordering, analytics, loyalty, SMS OTP.

---

# 1. Project Structure

```
apps/
  api/          # Express backend (Bun)
  web/          # Next.js frontend (App Router, Tailwind, shadcn)
docs/
  implementation-plan.md      # Original MVP plan
  implmentation-plan-v2.md     # Onboarding flow (v2)
  implementation-status.md    # This file – current state
```

---

# 2. Database (Prisma 7 + PostgreSQL)

**ORM:** Prisma 7 with `@prisma/adapter-pg`. Config: `prisma.config.ts` (datasource URL); `schema.prisma` (no `url` in datasource). Generate/migrate/seed via Node: `npx prisma generate --config ./prisma.config.ts`, etc.

**Tables:**

| Table              | Purpose |
|--------------------|--------|
| User               | id, email, name, createdAt |
| Restaurant         | id, name, slug, onboardingStep, createdAt |
| RestaurantMember   | userId, restaurantId, role (ADMIN) |
| Table              | id, restaurantId, tableNumber |
| MenuCategory       | id, restaurantId, name, sortOrder |
| MenuItem           | id, restaurantId, categoryId, name, price, isAvailable |
| Order              | id, restaurantId, tableId, status, totalAmount, createdAt |
| OrderItem          | id, orderId, menuItemId, nameSnapshot, priceSnapshot, quantity |
| OtpCode            | id, identifier, otp, expiresAt |

**Restaurant.onboardingStep:** `CREATED` | `MENU_ADDED` | `TEST_ORDER_DONE` (used for progress and UI).

**Seed:** Demo restaurant + “Tanishq’s Restaurant” (slug `tanishq`) with owner, tables, menu, and sample data. Run: `npx prisma db seed --config ./prisma.config.ts` (after `npx prisma generate --config ./prisma.config.ts`).

---

# 3. Auth

## 3.1 Flow

- **Login:** Email → OTP (Resend) → verify OTP → receive **access token** (body) and **refresh token** (httpOnly cookie).
- **Access token:** JWT, 15 min (configurable). Stored **in memory only** on the frontend (no localStorage/cookies).
- **Refresh token:** JWT with `jti`, 14 days. Stored in **httpOnly cookie** only; `jti` stored in session store (Redis or in-memory) for validation and revocation.
- **Silent refresh:** On 401 or on app load, frontend calls `POST /auth/refresh` (cookie sent automatically); receives new access token; retries request or sets in-memory token.
- **Token rotation:** Each refresh issues a new refresh token and invalidates the previous one.

## 3.2 Endpoints

| Method | Path           | Description |
|--------|----------------|-------------|
| POST   | /auth/send-otp | Send OTP to email (Resend). |
| POST   | /auth/verify-otp | Verify OTP; create user if needed; set refresh cookie; return `{ token }` (access token). |
| POST   | /auth/refresh  | Read refresh from cookie; validate; rotate; set new cookie; return `{ token }`. |
| POST   | /auth/logout   | Clear refresh cookie and remove session from store. |

## 3.3 Backend

- **Config:** `ACCESS_TOKEN_EXPIRY` (default `15m`), `REFRESH_TOKEN_EXPIRY` (default `14d`), `REFRESH_COOKIE_NAME` (default `waitr_rt`), `REDIS_URL` (optional; if unset, in-memory session store).
- **Session store:** `apps/api/src/config/sessionStore.ts` – Redis (ioredis) if `REDIS_URL` set, else in-memory Map. Keys: `waitr:refresh:{jti}`, TTL 14 days.
- **Middleware:** `authMiddleware` validates `Authorization: Bearer <access_token>` and attaches `req.user`. Refresh token is never read in normal API routes.

## 3.4 Frontend

- **In-memory token:** `lib/api.ts` – `getToken()` / `setToken()` / `clearToken()` use a module-level variable (no localStorage).
- **All API calls:** `credentials: "include"` so the refresh cookie is sent.
- **401 handling:** Try `POST /auth/refresh` once; on success, retry request; on failure, clear token (caller can redirect to login).
- **AuthHydration:** Root layout runs `authApi.refresh()` on mount to restore access token after full page reload.
- **Login page:** `/login` – email → OTP → verify → `setToken(accessToken)` → redirect to onboarding (or home).

---

# 4. Restaurants

| Method | Path                      | Auth | Description |
|--------|---------------------------|------|-------------|
| POST   | /restaurants              | Yes  | Create restaurant. Body: `name`, `slug`, optional `table_count` (1–50, default 10). Creates that many tables (1..N). |
| GET    | /restaurants              | Yes  | List restaurants for current user. |
| GET    | /restaurants/onboarding-progress | Yes  | List progress per restaurant: id, name, slug, onboardingStep, tableCount, categoryCount, orderCount. |

---

# 5. Menu

## 5.1 Public (no auth)

| Method | Path                     | Description |
|--------|--------------------------|-------------|
| GET    | /restaurants/:slug/menu   | Menu by slug. **Cached in Upstash Redis:** key `menu:{slug}`, TTL 5 min. On miss: DB → set cache → return. Cache invalidated when a category or item is created for that restaurant. |

## 5.2 Protected (owner auth)

| Method | Path            | Description |
|--------|-----------------|-------------|
| POST   | /menu/categories | Body: restaurant_id, name, sort_order. Invalidates menu cache for that restaurant. |
| POST   | /menu/items     | Body: restaurant_id, category_id, name, price. Invalidates menu cache. |

**Menu cache:** Implemented in `menu.service.ts` (`getMenuBySlugCached`, `invalidateMenuCache`). Requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; if unset, cache is skipped and DB is used every time.

---

# 6. Cart (Upstash Redis)

Cart is stored in Redis only; no cart table in DB. Persisted to DB only when order is placed.

| Method | Path   | Description |
|--------|--------|-------------|
| GET    | /cart  | Return `{ items }` from Redis. Session from cookie `cart_session`; if missing, set new UUID cookie. Key: `cart:{sessionId}`, TTL 1 hour. |
| PUT    | /cart  | Body: `{ items: [ { menu_item_id, quantity } ] }`. Save to Redis, TTL 1 hour. |

**Order from cart:** `POST /orders` accepts optional `cart_session_id`. If provided (and no `items` in body), items are read from Redis, order is created, then cart key is cleared.

Requires Upstash Redis env; if unset, cart get/set are no-op / empty.

---

# 7. Orders

| Method | Path              | Auth | Description |
|--------|-------------------|------|-------------|
| POST   | /orders           | No   | Create order. Body: `table_id`/`tableId`, `items` **or** `cart_session_id`. If `cart_session_id`, items from Redis and cart cleared after. |
| GET    | /orders           | Yes  | List orders. Query: `restaurant_id`. |
| PATCH  | /orders/:id/status| Yes  | Update status. Body: `status` (NEW, PREPARING, READY, COMPLETED). |

**Realtime:** Socket.io. On order create and status update, server emits `order_created` / `order_status_updated` to room per restaurant. Kitchen uses socket; no polling.

---

# 8. Rate Limiting (Upstash)

- **Library:** `@upstash/ratelimit` with `@upstash/redis`.
- **Middleware:** Applied globally (per request). Identifier: `user:{userId}` if authenticated, else `ip:{IP}` (with `X-Forwarded-For` support).
- **Limit:** 60 requests per 60 seconds (sliding window) per identifier. Returns **429 Too Many Requests** when exceeded.
- **Config:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. If unset, middleware does nothing.

---

# 9. Frontend

## 9.1 Stack

- Next.js (App Router), TypeScript, Tailwind, shadcn (Button, Card, Input, Label, Select).
- API base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).

## 9.2 Routes

| Route         | Purpose |
|---------------|--------|
| /             | Home; link to login / “Continue setup” when onboarding incomplete. |
| /login        | Owner login: email → OTP → verify; access token in memory, refresh in cookie. |
| /onboarding   | Wizard: Create Restaurant (name, slug, **number of tables**) → Add Menu → QR codes (with **Download as PDF**) → Test Order → Kitchen intro → Go Live. |
| /r/[slug]     | Public menu; query `?t=N` pre-selects table N. |
| /kitchen      | Kitchen dashboard; Socket.io for order list and status updates. |

## 9.3 Onboarding Wizard Details

- **Create Restaurant:** Name, slug (auto from name), **number of tables** (1–50, default 10). POST /restaurants with `table_count`.
- **Add Menu:** Add categories and items (POST /menu/categories, POST /menu/items). Continue to QR step when at least one category and one item.
- **QR step:** One QR per table (1..tableCount). Each QR links to `/r/{slug}?t={n}`. Button: **Download QR codes as PDF** (jspdf + qrcode; one page per table).
- **Test Order:** Link to open menu in new tab; place order; then mark step done.
- **Kitchen:** Link to /kitchen; “Next” to mark seen.
- **Go Live:** Checklist and “Your restaurant is ready.”

Progress is derived from `GET /restaurants/onboarding-progress` (tableCount, categoryCount, orderCount, onboardingStep).

---

# 10. Error Handling & Logging

- **Backend:** Global error middleware; responses `{ success: false, error, code? }`; Zod validation on body/query/params; `AppError` and 404 handler.
- **Logging:** Pino (pino-pretty in dev). Logger methods: info, error, auth, order. Request log middleware; error middleware logs 4xx/5xx.

---

# 11. Environment Variables

**API (`apps/api/.env`):**

| Variable                    | Purpose |
|----------------------------|---------|
| DATABASE_URL               | PostgreSQL connection. |
| JWT_SECRET                 | JWT signing. |
| OTP_EXPIRY_MINUTES         | OTP validity (default 10). |
| RESEND_API_KEY             | Resend for OTP emails (optional in dev; OTP logged if send fails). |
| MAIL_FROM                  | From address for email. |
| ACCESS_TOKEN_EXPIRY        | Access JWT expiry (default `15m`). |
| REFRESH_TOKEN_EXPIRY       | Refresh JWT expiry (default `14d`). |
| REFRESH_COOKIE_NAME        | Cookie name for refresh token (default `waitr_rt`). |
| REDIS_URL                  | Optional; Redis for refresh token session store (ioredis). |
| CORS_ORIGIN                | Allowed origin for credentials (default `http://localhost:3000`). |
| UPSTASH_REDIS_REST_URL     | Upstash Redis REST URL (menu cache, cart, rate limit). |
| UPSTASH_REDIS_REST_TOKEN   | Upstash Redis REST token. |

**Web:** `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).

See `apps/api/.env.example` for a full template.

---

# 12. How to Run

1. **API:** `bun run dev:api` (from repo root or `apps/api`).
2. **Web:** `bun run dev:web` (from repo root or `apps/web`).
3. **DB:** Migrate with `npx prisma migrate deploy` (or `migrate dev`); seed with `npx prisma db seed --config ./prisma.config.ts` from `apps/api`.
4. **Env:** Copy `.env.example` to `.env` in `apps/api` and set variables (especially DATABASE_URL, JWT_SECRET; optional: Resend, Redis, Upstash).

---

# 13. Summary Checklist

| Area              | Status | Notes |
|-------------------|--------|--------|
| DB (Prisma 7)     | Done   | PostgreSQL, adapter, migrations, seed. |
| Auth (OTP)        | Done   | Resend, OTP storage, verify. |
| Auth (tokens)     | Done   | Access (memory) + refresh (httpOnly cookie), rotation, silent refresh, logout. |
| Restaurants       | Done   | Create with table count, list, onboarding progress. |
| Menu              | Done   | Get by slug (cached), create category/item, cache invalidation. |
| Cart              | Done   | GET/PUT /cart, Redis, TTL 1h, order from cart_session_id. |
| Orders            | Done   | Create, list, status update; Socket.io realtime. |
| Rate limiting     | Done   | Upstash, 60/60s per identifier. |
| Onboarding wizard | Done   | All steps including table count and QR PDF download. |
| Frontend auth     | Done   | In-memory token, credentials, 401 refresh, AuthHydration. |
| Error & logging   | Done   | Global middleware, Zod, Pino. |

This document supersedes the prior plans for **implementation status**; the original docs remain as design and flow references.
