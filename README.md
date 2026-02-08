# Restaurant Ordering SaaS

A modern SaaS platform that allows restaurants and cafés to create digital menus, generate QR codes for tables, and let customers place orders directly from their phones. Orders are sent to the kitchen in real time, reducing wait times and improving service efficiency.

---

## Features (Planned)

### Restaurant Owner

* OTP-based login
* Create and manage menu
* Upload menu via:

  * Manual entry
  * CSV/Excel
  * Image/PDF (OCR processing)
* Generate QR codes for tables
* View orders and analytics (later)

### Customer

* Scan QR code
* View digital menu
* Add items to cart
* Place order without login
* (Future) Pay online

### Kitchen / Staff

* View orders in real time
* Update order status (Preparing / Ready)

---

## Tech Stack

### Frontend

* Next.js
* Tailwind CSS
* PWA support (planned)

### Backend

* Bun / Node.js
* Express or NestJS (TBD)
* PostgreSQL

### Infrastructure

* AWS S3 (menu uploads)
* Redis (cache & sessions)
* SQS (OCR and async jobs)
* AWS ECS (deployment)

### Realtime

* WebSockets / Socket.io

---

## Monorepo Structure

/apps
/web        → Customer menu & dashboard
/api        → Backend API

/packages
/types      → Shared TypeScript types

---

## Getting Started

### Install dependencies

```bash
bun install
```

### Run development environment

```bash
bun run dev
```

---

## Development Roadmap

### Phase 1 (MVP)

* Menu display
* Place order
* Kitchen dashboard

### Phase 2

* Restaurant onboarding
* Menu management UI
* QR generation

### Phase 3

* Payments
* OCR menu import
* Voice ordering

---

## Vision

To simplify restaurant operations by enabling fast, reliable, and modern ordering experiences that work smoothly even on low-end mobile devices.

---
