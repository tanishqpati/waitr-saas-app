# Restaurant Ordering SaaS

A modern SaaS platform that allows restaurants and cafés to create digital menus, generate QR codes for tables, and let customers place orders directly from their phones. Orders are sent to the kitchen in real time, reducing wait times and improving service efficiency.

---

## Features

### Restaurant Owner

* OTP-based login (email → Resend)
* Create and manage menu (categories, items)
* Onboarding wizard: Create restaurant → Add menu → QR codes → Test order → Go live
* Generate QR codes for tables (with PDF download)
* Dashboard with orders, revenue, and popular items
* Settings and restaurant management

### Customer

* Scan QR code to open menu (no app required)
* View digital menu by restaurant slug
* Add items to cart
* Place order without login
* (Future) Pay online

### Kitchen / Staff

* View orders in real time (Socket.io)
* Update order status (Preparing / Ready / Completed)

### Planned

* Menu upload via CSV/Excel or Image/PDF (OCR)
* PWA support
* Payments

---

## Tech Stack

### Frontend

* Next.js 16 (App Router)
* Tailwind CSS v4
* shadcn/ui components
* Socket.io client

### Backend

* Bun + Express
* Prisma 7 + PostgreSQL
* JWT auth (access + refresh tokens)
* Resend for OTP emails

### Infrastructure

* Upstash Redis (menu cache, cart, rate limiting)
* Redis (optional; refresh token session store)
* Socket.io (realtime orders)

---

## Monorepo Structure

```
apps/
  web/   → Next.js (customer menu, owner dashboard, kitchen)
  api/   → Express backend (Bun)
docs/
  implementation-status.md   → Detailed feature and API reference
```

---

## Getting Started

### Install dependencies

```bash
bun install
```

### Set up the API

1. Copy `apps/api/.env.example` to `apps/api/.env`
2. Set `DATABASE_URL` to your PostgreSQL connection string
3. Set `JWT_SECRET` and optionally `RESEND_API_KEY` (OTP)
4. Run migrations: `bun --cwd apps/api run db:generate` then `bun --cwd apps/api run db:migrate`
5. Seed demo data: `bun --cwd apps/api run db:seed`

### Run development

Start both apps (in separate terminals):

```bash
bun run dev:api    # API on http://localhost:4000
bun run dev:web    # Web on http://localhost:3000
```

---

## Development Roadmap

### Phase 1 (MVP) – Done

* Menu display
* Place order
* Kitchen dashboard
* OTP login and onboarding

### Phase 2 – Done

* Restaurant onboarding wizard
* Menu management UI
* QR generation with PDF export

### Phase 3 – Planned

* Payments
* OCR menu import
* Voice ordering

---

## Vision

To simplify restaurant operations by enabling fast, reliable, and modern ordering experiences that work smoothly even on low-end mobile devices.

---
