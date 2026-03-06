# Implementation Plan v4: Payments, Invoices, Waiter Call, Staff Accounts & Voice AI

**Target Market: Indian Cafés and Restaurants**

This document outlines the next major phase of Waitr development, adding:

1. **Payments** – Cash or online (Razorpay + UPI), with toggle in restaurant settings
2. **Invoices** – GST-compliant invoices, shown to customer, downloadable PDF
3. **Call Waiter** – Button on customer menu to alert staff (realtime)
4. **Staff Accounts** – Worker roles (Waiter, Kitchen, Manager) with limited access
5. **Voice AI Ordering** – Conversational AI waiter with Hindi/English support using RAG

---

# 1. Payment System (India-Focused)

## 1.1 Product Experience

**Customer flow:**

1. Customer views cart → clicks "Place Order"
2. Sees payment method selection: **Cash** or **Pay Online** (if enabled)
3. If Cash: Order placed → Invoice shown → "Pay at counter"
4. If Online: Razorpay checkout opens → UPI/Card/Wallet → On success → Invoice shown

**Owner config:**

- Settings page toggle: "Enable online payments"
- If disabled, only Cash option shows to customer
- Simple Razorpay setup (just API keys, no complex onboarding)

---

## 1.2 Payment Provider: Razorpay

**Why Razorpay for India:**

| Feature | Razorpay | Stripe |
|---------|----------|--------|
| UPI Support | ✅ Native (GPay, PhonePe, Paytm) | ❌ Limited |
| Transaction Fee | 2% | 2.9% + currency conversion |
| Settlement | T+2 days to Indian bank | Complex for INR |
| Documentation | Excellent (Hindi support) | English only |
| KYC | Aadhaar/PAN based | International docs |
| Minimum payout | ₹100 | $100 equivalent |

**Supported payment methods:**
- UPI (most popular in India - 80%+ of digital payments)
- Credit/Debit Cards (Visa, Mastercard, RuPay)
- Wallets (Paytm, PhonePe, Amazon Pay)
- Net Banking
- EMI (for high-value orders)

---

## 1.3 Database Changes

```prisma
model Restaurant {
  // ... existing fields
  
  // Payment config
  paymentsEnabled      Boolean  @default(false) @map("payments_enabled")
  razorpayKeyId        String?  @map("razorpay_key_id")
  razorpayKeySecret    String?  @map("razorpay_key_secret")  // encrypted
  
  // GST config (India-specific)
  gstNumber            String?  @map("gst_number")  // e.g., "27AABCU9603R1ZM"
  gstRate              Decimal  @default(5) @map("gst_rate") @db.Decimal(5, 2)  // 5% for restaurants
  legalName            String?  @map("legal_name")  // For GST invoice
  address              String?  @db.Text
  
  // Invoice config
  invoicePrefix        String   @default("INV") @map("invoice_prefix")
  nextInvoiceNum       Int      @default(1) @map("next_invoice_num")
  
  payments Payment[]
  invoices Invoice[]
}

model Payment {
  id                  String    @id @default(uuid())
  orderId             String    @unique @map("order_id")
  restaurantId        String    @map("restaurant_id")
  amount              Decimal   @db.Decimal(10, 2)  // In paise for Razorpay
  currency            String    @default("INR")
  method              String    // "cash" | "upi" | "card" | "wallet" | "netbanking"
  status              String    // "pending" | "completed" | "failed" | "refunded"
  
  // Razorpay fields
  razorpayOrderId     String?   @map("razorpay_order_id")
  razorpayPaymentId   String?   @map("razorpay_payment_id")
  razorpaySignature   String?   @map("razorpay_signature")
  
  createdAt           DateTime  @default(now()) @map("created_at")
  completedAt         DateTime? @map("completed_at")

  order      Order      @relation(fields: [orderId], references: [id])
  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@index([restaurantId])
  @@index([status])
  @@map("payments")
}

model Order {
  // ... existing fields
  paymentMethod  String?  @map("payment_method")  // "cash" | "online"
  paymentStatus  String   @default("pending") @map("payment_status")
  
  payment Payment?
}
```

---

## 1.4 APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /restaurants/:id/payment-config | Yes (owner) | Get payment settings |
| PATCH | /restaurants/:id/payment-config | Yes (owner) | Update Razorpay keys, GST info |
| POST | /payments/create-order | No | Create Razorpay order |
| POST | /payments/verify | No | Verify payment signature |
| POST | /payments/webhook | No | Razorpay webhook handler |
| GET | /payments/:orderId | No | Get payment status |

---

## 1.5 Razorpay Integration Flow

```
Customer                    Frontend                    API                     Razorpay
   |                           |                         |                        |
   |-- Select "Pay Online" --> |                         |                        |
   |                           |-- POST /payments/create-order -->                |
   |                           |                         |-- Orders API --------->|
   |                           |                         |<-- { order_id } -------|
   |                           |<-- { orderId, key } ----|                        |
   |                           |                         |                        |
   |<-- Open Razorpay Checkout |                         |                        |
   |-- Select UPI/Card/Wallet ->                         |                        |
   |-- Complete payment ------>|                         |                        |
   |                           |                         |                        |
   |<-- Payment success -------|                         |                        |
   |                           |-- POST /payments/verify (signature) -->          |
   |                           |                         |-- Verify signature     |
   |                           |                         |-- Update order status  |
   |                           |                         |-- Create invoice       |
   |                           |<-- { success, invoice } |                        |
   |<-- Show invoice ----------|                         |                        |
```

---

## 1.6 Razorpay Implementation

```typescript
// apps/api/src/modules/payments/razorpay.service.ts
import Razorpay from 'razorpay';
import crypto from 'crypto';

export async function createRazorpayOrder(
  restaurantId: string,
  amount: number,  // in rupees
  orderId: string
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { razorpayKeyId: true, razorpayKeySecret: true }
  });
  
  if (!restaurant?.razorpayKeyId || !restaurant?.razorpayKeySecret) {
    throw new AppError('Payment not configured', 400);
  }

  const razorpay = new Razorpay({
    key_id: restaurant.razorpayKeyId,
    key_secret: decrypt(restaurant.razorpayKeySecret),
  });

  const razorpayOrder = await razorpay.orders.create({
    amount: amount * 100,  // Convert to paise
    currency: 'INR',
    receipt: orderId,
    notes: { orderId, restaurantId },
  });

  await prisma.payment.create({
    data: {
      orderId,
      restaurantId,
      amount,
      currency: 'INR',
      method: 'online',
      status: 'pending',
      razorpayOrderId: razorpayOrder.id,
    },
  });

  return {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: restaurant.razorpayKeyId,  // Public key for frontend
  };
}

export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  keySecret: string
): boolean {
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');
  return expectedSignature === razorpaySignature;
}
```

---

## 1.7 Frontend Razorpay Checkout

```typescript
// apps/web/lib/razorpay.ts
export async function openRazorpayCheckout(
  orderData: { orderId: string; amount: number; key: string },
  onSuccess: (response: RazorpayResponse) => void,
  onFailure: (error: any) => void
) {
  const options: RazorpayOptions = {
    key: orderData.key,
    amount: orderData.amount,
    currency: 'INR',
    name: 'Restaurant Name',
    description: 'Food Order Payment',
    order_id: orderData.orderId,
    handler: onSuccess,
    prefill: {
      // Can be empty - Razorpay handles UPI app selection
    },
    theme: {
      color: '#F97316',  // Your brand color
    },
    modal: {
      ondismiss: () => onFailure({ reason: 'Payment cancelled' }),
    },
  };

  const razorpay = new (window as any).Razorpay(options);
  razorpay.open();
}

// Load Razorpay script
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
```

---

## 1.8 Environment Variables

```env
# Razorpay (get from https://dashboard.razorpay.com/app/keys)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Encryption key for storing restaurant secrets
ENCRYPTION_KEY=32-char-secret-key-for-aes-256
```

Frontend (for fallback/platform key):
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```

---

## 1.9 Razorpay Pricing

| Transaction Type | Fee |
|------------------|-----|
| UPI | 2% |
| Debit Card (RuPay) | 2% |
| Debit Card (Visa/MC) | 2% |
| Credit Card | 2% |
| Wallets | 2% |
| Net Banking | 2% |

**Settlement:** T+2 working days to linked bank account.

**No setup fee, no monthly fee.**

---

# 2. Invoice System (GST-Compliant for India)

## 2.1 Product Experience

After order is placed:

1. Invoice generated automatically (GST-compliant if restaurant has GSTIN)
2. Shown to customer on confirmation screen
3. Can be downloaded as PDF
4. Kitchen/staff can view invoice for any order
5. Owner can see all invoices in dashboard
6. WhatsApp share option (popular in India)

---

## 2.2 GST Compliance for Restaurants

**GST Rates for Restaurants in India:**

| Restaurant Type | GST Rate | ITC |
|-----------------|----------|-----|
| Non-AC restaurant | 5% | No |
| AC restaurant | 5% | No |
| Restaurant in hotel (tariff < ₹7500) | 5% | No |
| Restaurant in hotel (tariff ≥ ₹7500) | 18% | Yes |
| Outdoor catering | 5% | No |

**Most cafés = 5% GST (no input tax credit)**

**Required on invoice:**
- Restaurant name and address
- GSTIN (if registered)
- Invoice number (sequential)
- Date and time
- HSN/SAC code: 996331 (Restaurant services)
- Taxable value + GST breakdown (CGST + SGST or IGST)

---

## 2.3 Database Changes

```prisma
model Invoice {
  id              String   @id @default(uuid())
  invoiceNumber   String   @unique @map("invoice_number")  // "INV-2026-00001"
  orderId         String   @unique @map("order_id")
  restaurantId    String   @map("restaurant_id")
  
  // Restaurant snapshot (for GST compliance)
  restaurantName  String   @map("restaurant_name")
  restaurantAddress String? @map("restaurant_address")
  gstNumber       String?  @map("gst_number")
  legalName       String?  @map("legal_name")
  
  // Order details
  tableNumber     Int      @map("table_number")
  items           Json     // [{ name, quantity, price, hsn?, variant?, addons? }]
  
  // GST breakdown
  subtotal        Decimal  @db.Decimal(10, 2)
  cgst            Decimal  @default(0) @db.Decimal(10, 2)  // Central GST
  sgst            Decimal  @default(0) @db.Decimal(10, 2)  // State GST
  gstRate         Decimal  @default(5) @map("gst_rate") @db.Decimal(5, 2)
  total           Decimal  @db.Decimal(10, 2)
  
  paymentMethod   String   @map("payment_method")
  paymentStatus   String   @map("payment_status")
  
  // Razorpay transaction ID (for reconciliation)
  transactionId   String?  @map("transaction_id")
  
  createdAt       DateTime @default(now()) @map("created_at")

  order      Order      @relation(fields: [orderId], references: [id])
  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@index([restaurantId])
  @@index([createdAt])
  @@map("invoices")
}
```

---

## 2.4 Invoice Number Format

GST-compliant sequential numbering:

```typescript
async function generateInvoiceNumber(restaurantId: string): Promise<string> {
  const restaurant = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { nextInvoiceNum: { increment: 1 } },
    select: { invoicePrefix: true, nextInvoiceNum: true }
  });
  
  // Format: PREFIX/YEAR-YEAR/NUMBER
  // Example: INV/2026-27/00001 (Indian financial year)
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const nextYear = (year + 1) % 100;
  const num = String(restaurant.nextInvoiceNum - 1).padStart(5, '0');
  
  return `${restaurant.invoicePrefix}/${year}-${nextYear}/${num}`;
}
```

---

## 2.5 APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /invoices/:orderId | No | Get invoice for order |
| GET | /invoices/:orderId/pdf | No | Download invoice as PDF |
| GET | /invoices | Yes (owner) | List invoices for restaurant |
| POST | /invoices/:orderId/whatsapp | No | Get WhatsApp share link |

---

## 2.6 GST Calculation

```typescript
interface GstBreakdown {
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
}

function calculateGst(itemsTotal: number, gstRate: number): GstBreakdown {
  // GST is split equally between CGST and SGST (for intra-state)
  const gstAmount = (itemsTotal * gstRate) / 100;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  
  return {
    subtotal: itemsTotal,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    total: Math.round((itemsTotal + gstAmount) * 100) / 100,
  };
}

// For most restaurants: 5% GST = 2.5% CGST + 2.5% SGST
// Example: ₹100 food = ₹2.50 CGST + ₹2.50 SGST = ₹105 total
```

---

## 2.7 PDF Invoice (GST Format)

```typescript
import { jsPDF } from 'jspdf';

function generateGstInvoicePDF(invoice: Invoice): Buffer {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(16);
  doc.text(invoice.restaurantName, 20, 20);
  doc.setFontSize(10);
  if (invoice.restaurantAddress) {
    doc.text(invoice.restaurantAddress, 20, 28);
  }
  if (invoice.gstNumber) {
    doc.text(`GSTIN: ${invoice.gstNumber}`, 20, 36);
  }
  
  // Invoice details
  doc.setFontSize(12);
  doc.text('TAX INVOICE', 150, 20);
  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 150, 28);
  doc.text(`Date: ${formatDate(invoice.createdAt)}`, 150, 36);
  doc.text(`Table: ${invoice.tableNumber}`, 150, 44);
  
  // Items table
  let y = 60;
  doc.setFontSize(10);
  doc.text('Item', 20, y);
  doc.text('HSN', 80, y);
  doc.text('Qty', 100, y);
  doc.text('Rate', 120, y);
  doc.text('Amount', 150, y);
  
  y += 8;
  for (const item of invoice.items as any[]) {
    doc.text(item.name, 20, y);
    doc.text('996331', 80, y);  // HSN for restaurant services
    doc.text(String(item.quantity), 100, y);
    doc.text(`₹${item.price}`, 120, y);
    doc.text(`₹${item.price * item.quantity}`, 150, y);
    y += 6;
  }
  
  // GST breakdown
  y += 10;
  doc.text(`Subtotal: ₹${invoice.subtotal}`, 120, y);
  y += 6;
  doc.text(`CGST (${invoice.gstRate / 2}%): ₹${invoice.cgst}`, 120, y);
  y += 6;
  doc.text(`SGST (${invoice.gstRate / 2}%): ₹${invoice.sgst}`, 120, y);
  y += 8;
  doc.setFontSize(12);
  doc.text(`Total: ₹${invoice.total}`, 120, y);
  
  // Payment info
  y += 15;
  doc.setFontSize(10);
  doc.text(`Payment: ${invoice.paymentMethod === 'cash' ? 'Cash' : 'Online (UPI/Card)'}`, 20, y);
  if (invoice.transactionId) {
    doc.text(`Transaction ID: ${invoice.transactionId}`, 20, y + 6);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.text('Thank you for dining with us!', 20, 280);
  
  return Buffer.from(doc.output('arraybuffer'));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

---

## 2.8 WhatsApp Invoice Sharing

Popular in India for sharing bills:

```typescript
function getWhatsAppShareUrl(invoice: Invoice, pdfUrl: string): string {
  const message = encodeURIComponent(
    `🧾 Invoice from ${invoice.restaurantName}\n` +
    `Invoice No: ${invoice.invoiceNumber}\n` +
    `Amount: ₹${invoice.total}\n` +
    `Date: ${formatDate(invoice.createdAt)}\n\n` +
    `Download PDF: ${pdfUrl}`
  );
  return `https://wa.me/?text=${message}`;
}
```

---

# 3. Call Waiter Feature

## 3.1 Product Experience

**Customer:**

- Button on menu page: "Call Waiter" 🔔
- On click: confirmation → request sent
- Shows "Waiter notified" message
- Cooldown (30s) to prevent spam

**Staff:**

- Realtime notification: "Table 5 needs assistance"
- Can acknowledge/dismiss
- Sound alert

---

## 3.2 Database Changes

```prisma
model WaiterCall {
  id             String    @id @default(uuid())
  restaurantId   String    @map("restaurant_id")
  tableId        String    @map("table_id")
  tableNumber    Int       @map("table_number")
  status         String    @default("pending")  // "pending" | "acknowledged" | "resolved"
  acknowledgedBy String?   @map("acknowledged_by")
  createdAt      DateTime  @default(now()) @map("created_at")
  acknowledgedAt DateTime? @map("acknowledged_at")

  restaurant Restaurant @relation(fields: [restaurantId], references: [id])
  table      Table      @relation(fields: [tableId], references: [id])

  @@index([restaurantId, status])
  @@map("waiter_calls")
}
```

---

## 3.3 APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /waiter-calls | No | Create call (rate limited per table) |
| GET | /waiter-calls | Yes (staff) | List pending calls |
| PATCH | /waiter-calls/:id/acknowledge | Yes (staff) | Acknowledge call |
| PATCH | /waiter-calls/:id/resolve | Yes (staff) | Resolve call |

---

## 3.4 Realtime (Socket.io)

```typescript
// New waiter call
io.to(`restaurant:${restaurantId}:staff`).emit('waiter_call', {
  id: call.id,
  tableNumber: call.tableNumber,
  createdAt: call.createdAt
});

// Acknowledged
io.to(`restaurant:${restaurantId}:staff`).emit('waiter_call_acknowledged', {
  id: call.id,
  acknowledgedBy: staffName
});
```

---

# 4. Staff Accounts (Worker Roles)

## 4.1 Product Experience

**Owner:**

- Settings → Team Management
- Add staff: email, role
- Staff receives invite email with OTP login
- Can remove or change roles

---

## 4.2 Roles & Permissions

| Role | Dashboard | Menu | Settings | Team | Kitchen | Waiter Calls | Analytics |
|------|-----------|------|----------|------|---------|--------------|-----------|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MANAGER | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| KITCHEN | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| WAITER | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## 4.3 Database Changes

```prisma
enum MemberRole {
  ADMIN
  MANAGER
  KITCHEN
  WAITER
}

model RestaurantMember {
  id           String     @id @default(uuid())
  userId       String     @map("user_id")
  restaurantId String     @map("restaurant_id")
  role         MemberRole
  invitedAt    DateTime   @default(now()) @map("invited_at")
  acceptedAt   DateTime?  @map("accepted_at")

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)

  @@unique([userId, restaurantId])
  @@map("restaurant_members")
}

model StaffInvite {
  id           String     @id @default(uuid())
  restaurantId String     @map("restaurant_id")
  email        String
  role         MemberRole
  token        String     @unique
  expiresAt    DateTime   @map("expires_at")
  acceptedAt   DateTime?  @map("accepted_at")

  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@index([token])
  @@map("staff_invites")
}
```

---

## 4.4 APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /restaurants/:id/staff | Yes (admin) | List staff |
| POST | /restaurants/:id/staff/invite | Yes (admin) | Send invite |
| DELETE | /restaurants/:id/staff/:userId | Yes (admin) | Remove staff |
| PATCH | /restaurants/:id/staff/:userId/role | Yes (admin) | Change role |
| POST | /staff/accept-invite | No | Accept invite (with token) |

---

## 4.5 Authorization Middleware

```typescript
function requireRole(...allowedRoles: MemberRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { restaurantId } = req.params;
    const userId = req.user.id;
    
    const member = await prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } }
    });
    
    if (!member || !allowedRoles.includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    req.memberRole = member.role;
    next();
  };
}
```

---

## 4.6 Frontend Routes by Role

| Route | ADMIN | MANAGER | KITCHEN | WAITER |
|-------|-------|---------|---------|--------|
| /dashboard | ✅ | ✅ | ❌ | ❌ |
| /dashboard/menu | ✅ | ✅ | ❌ | ❌ |
| /dashboard/settings | ✅ | ❌ | ❌ | ❌ |
| /dashboard/team | ✅ | ❌ | ❌ | ❌ |
| /dashboard/payments | ✅ | ❌ | ❌ | ❌ |
| /kitchen | ✅ | ✅ | ✅ | ✅ |
| /waiter | ✅ | ✅ | ❌ | ✅ |

---

# 5. Voice AI Ordering (RAG System) - Hindi/English

## 5.1 Product Experience

**Customer:**

1. On menu page, sees "Voice Order" button 🎤
2. Clicks → microphone permission → starts listening
3. Customer speaks (Hindi or English): "Mujhe ek large pepperoni pizza chahiye extra cheese ke saath"
4. AI responds (same language): "Bahut badhiya choice! Maine Large Pepperoni Pizza with extra cheese aapke cart mein add kar diya. Total ₹450. Kuch aur chahiye?"
5. Customer: "Sabse popular item kya hai?"
6. AI: "Hamare yahan Margherita Pizza sabse zyada bikta hai! Try karenge?"
7. Conversation continues until "Bas itna hi" → shows cart → confirm

**Language support:**
- Automatic language detection (Hindi/English/Hinglish)
- Responds in the same language customer uses
- Understands code-switching ("Ek coffee dena with extra sugar")

**Per-restaurant customization:**
- AI knows this restaurant's menu, prices, variants
- AI knows restaurant's story, specialties, recommendations
- AI can answer "Vegetarian mein kya hai?", "Spicy kya hai?", "Chef ki recommendation?"

---

## 5.2 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │────▶│  Frontend   │────▶│  Your API   │────▶│   OpenAI    │
│  (Speech)   │     │  (Web Audio)│     │  (Context)  │     │   GPT-4o    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│  Browser    │     │  Browser    │     │  Restaurant │            │
│  STT (Web   │     │  TTS (Web   │     │  Context +  │            │
│  Speech API)│     │  Speech API)│     │  Menu (RAG) │            │
└─────────────┘     └─────────────┘     └─────────────┘            │
                                               │                   │
                                               ▼                   │
                                        ┌─────────────┐            │
                                        │ Upstash     │◀───────────┘
                                        │ Vector DB   │  (Embeddings)
                                        └─────────────┘
```

**Key components:**

1. **Browser Speech API** – Free STT/TTS, no extra API costs
2. **OpenAI GPT-4o** – Conversation, function calling for cart
3. **Upstash Vector** – Menu embeddings per restaurant for semantic search

---

## 5.3 Database Changes

```prisma
model RestaurantContext {
  id              String   @id @default(uuid())
  restaurantId    String   @unique @map("restaurant_id")
  
  description     String?  @db.Text  // "Family-owned Italian restaurant..."
  specialties     String?  @db.Text  // "Known for wood-fired pizzas"
  recommendations String?  @db.Text  // "Chef recommends: Truffle Risotto"
  dietaryInfo     String?  @db.Text  // "Vegetarian options: ..."
  customPrompt    String?  @db.Text  // Owner's custom AI personality
  
  updatedAt       DateTime @updatedAt @map("updated_at")

  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@map("restaurant_contexts")
}

model VoiceSession {
  id           String   @id @default(uuid())
  restaurantId String   @map("restaurant_id")
  tableId      String?  @map("table_id")
  sessionId    String   @unique
  messages     Json     // Conversation history
  cartItems    Json     // Current cart state
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@index([restaurantId])
  @@map("voice_sessions")
}
```

---

## 5.4 Menu Embedding Pipeline

When menu is updated, embed items for semantic search:

```typescript
import { Index } from '@upstash/vector';
import OpenAI from 'openai';

const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

const openai = new OpenAI();

async function embedMenuItem(item: MenuItem, restaurant: Restaurant) {
  const text = `
    ${item.name}
    Category: ${item.category.name}
    Price: ${item.price}
    ${item.variants?.map(v => `Size: ${v.name}`).join(', ')}
  `.trim();

  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  await vectorIndex.upsert({
    id: `menu:${restaurant.id}:${item.id}`,
    vector: embedding.data[0].embedding,
    metadata: {
      restaurantId: restaurant.id,
      itemId: item.id,
      name: item.name,
      price: Number(item.price),
      category: item.category.name,
    },
  });
}
```

---

## 5.5 Voice API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /voice/message | No | Send message, get AI response |
| GET | /voice/session/:sessionId | No | Get session state |
| DELETE | /voice/session/:sessionId | No | End session |

```typescript
// POST /voice/message
interface VoiceMessageRequest {
  sessionId: string;
  restaurantSlug: string;
  tableId?: string;
  message: string;
}

interface VoiceMessageResponse {
  reply: string;
  cartUpdate?: {
    action: 'add' | 'remove' | 'clear';
    item?: CartItem;
  };
  suggestedItems?: MenuItem[];
}
```

---

## 5.6 OpenAI Function Calling

```typescript
const functions = [
  {
    name: 'add_to_cart',
    description: 'Add an item to the customer cart',
    parameters: {
      type: 'object',
      properties: {
        itemName: { type: 'string' },
        quantity: { type: 'number' },
        variant: { type: 'string' },
        addons: { type: 'array', items: { type: 'string' } },
      },
      required: ['itemName', 'quantity'],
    },
  },
  {
    name: 'remove_from_cart',
    description: 'Remove an item from the cart',
    parameters: {
      type: 'object',
      properties: { itemName: { type: 'string' } },
      required: ['itemName'],
    },
  },
  {
    name: 'search_menu',
    description: 'Search menu for items',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'complete_order',
    description: 'Customer is done, proceed to checkout',
    parameters: { type: 'object', properties: {} },
  },
];
```

---

## 5.7 System Prompt Template (Hindi/English)

```typescript
function buildSystemPrompt(restaurant: Restaurant, context: RestaurantContext, menu: Menu) {
  return `
You are a friendly waiter at ${restaurant.name}, a café/restaurant in India.

${context.description || ''}

LANGUAGE RULES (CRITICAL):
- Detect the customer's language (Hindi, English, or Hinglish)
- ALWAYS respond in the SAME language the customer uses
- If customer speaks Hindi, respond in Hindi (Devanagari or Roman script based on their input)
- If customer mixes Hindi-English (Hinglish), respond in Hinglish
- Use casual, friendly Indian restaurant language
- Use "aap" (respectful) not "tum"
- Common phrases: "Ji", "Zaroor", "Bilkul", "Aur kuch?"

MENU:
${menu.categories.map(cat => `
## ${cat.name}
${cat.items.map(item => `- ${item.name}: ₹${item.price}`).join('\n')}
`).join('\n')}

${context.specialties ? `SPECIALTIES: ${context.specialties}` : ''}
${context.recommendations ? `CHEF RECOMMENDS: ${context.recommendations}` : ''}

INDIAN CONTEXT:
- Prices are in Rupees (₹)
- Understand terms like "veg", "non-veg", "Jain" (no onion/garlic)
- Know common requests: "thoda kam mirchi", "extra cheese", "bina pyaaz"
- Suggest popular combos naturally

RULES:
- Confirm what you're adding: "Maine [item] add kar diya, ₹[price]"
- If unsure, ask politely: "Aap [option A] ya [option B] lenge?"
- Keep responses concise (1-3 sentences)
- When done: "Aapka total ₹[amount] hua. Order confirm karein?"
- Be warm and hospitable (Indian hospitality style)
${context.customPrompt || ''}
`.trim();
}
```

---

## 5.8 Frontend Voice Hook (Hindi/English Support)

```typescript
export function useVoiceOrder(restaurantSlug: string) {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [language, setLanguage] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      // Support both Hindi and English (India)
      // Browser will auto-detect based on speech
      recognitionRef.current.lang = language;
      
      recognitionRef.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        await sendMessage(transcript);
      };
    }
  }, [language]);

  async function sendMessage(text: string) {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    
    const response = await voiceApi.sendMessage({
      sessionId: getSessionId(),
      restaurantSlug,
      message: text,
    });
    
    setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
    speak(response.reply, response.detectedLanguage);
  }

  function speak(text: string, detectedLang?: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Use Indian voice if available
    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find(v => 
      v.lang === 'hi-IN' || v.lang === 'en-IN'
    );
    if (indianVoice) {
      utterance.voice = indianVoice;
    }
    
    // Set language based on detected language
    utterance.lang = detectedLang === 'hindi' ? 'hi-IN' : 'en-IN';
    
    window.speechSynthesis.speak(utterance);
  }

  function toggleLanguage() {
    setLanguage(prev => prev === 'hi-IN' ? 'en-IN' : 'hi-IN');
  }

  return { 
    isListening, 
    messages, 
    language,
    toggleLanguage,
    startListening, 
    stopListening 
  };
}
```

**Language Toggle UI:**
```tsx
<button onClick={toggleLanguage} className="text-sm">
  {language === 'hi-IN' ? '🇮🇳 हिंदी' : '🇮🇳 English'}
</button>
```

---

## 5.9 Environment Variables

```env
OPENAI_API_KEY=sk-...
UPSTASH_VECTOR_REST_URL=https://...
UPSTASH_VECTOR_REST_TOKEN=...
```

---

## 5.10 Cost Estimation

| Component | Cost per order |
|-----------|----------------|
| OpenAI GPT-4o (5 messages) | ~$0.02 |
| OpenAI Embeddings (menu update) | ~$0.0001/item |
| Upstash Vector queries | ~$0.001 |
| Browser STT/TTS | Free |
| **Total per voice order** | **~$0.02-0.03** |

---

# 6. File Structure

```
apps/api/src/
  modules/
    payments/
      payments.routes.ts
      payments.service.ts
      razorpay.service.ts
    invoices/
      invoices.routes.ts
      invoices.service.ts
      gst.service.ts
      pdf.service.ts
    waiter-calls/
      waiter-calls.routes.ts
      waiter-calls.service.ts
    staff/
      staff.routes.ts
      staff.service.ts
    voice/
      voice.routes.ts
      voice.service.ts
      openai.service.ts
      vector.service.ts
  middleware/
    requireRole.ts
  validators/
    payments.ts
    invoices.ts
    waiter-calls.ts
    staff.ts
    voice.ts
  lib/
    encryption.ts  # For storing Razorpay secrets

apps/web/app/
  dashboard/
    team/
      page.tsx
    payments/
      page.tsx
  waiter/
    page.tsx
  r/[slug]/
    voice/
      page.tsx
    checkout/
      page.tsx  # Payment selection
```

---

# 7. Implementation Order

| Phase | Feature | Effort | Dependencies |
|-------|---------|--------|--------------|
| 4.1 | Staff accounts & roles | 3-4 days | None |
| 4.2 | Call waiter | 1-2 days | Staff accounts |
| 4.3 | Invoice system (GST) | 2-3 days | None |
| 4.4 | Payment config (cash) | 1 day | Invoices |
| 4.5 | Razorpay integration | 3-4 days | Payment config |
| 4.6 | Voice AI (basic) | 4-5 days | None |
| 4.7 | Voice AI (RAG + Hindi) | 3-4 days | Voice AI basic |

**Total estimate:** ~3-4 weeks

**Recommended build order:**

1. Staff accounts (foundation for permissions)
2. Call waiter (quick win, uses existing Socket.io)
3. Invoices with GST (needed for payments)
4. Payments (cash first, then Razorpay)
5. Voice AI (can be parallel with payments)

---

# 8. Environment Variables Summary

```env
# Razorpay (India payments)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Encryption for storing restaurant secrets
ENCRYPTION_KEY=32-character-secret-key-here

# Voice AI
OPENAI_API_KEY=sk-...
UPSTASH_VECTOR_REST_URL=https://...
UPSTASH_VECTOR_REST_TOKEN=...
```

Frontend:
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```

---

# 9. Summary (India-Focused Stack)

| Feature | Tech Stack |
|---------|------------|
| Payments | Razorpay (UPI, Cards, Wallets) |
| PDF Invoices | jspdf (GST-compliant format) |
| GST Calculation | CGST + SGST (5% for restaurants) |
| Call Waiter | Socket.io (existing) |
| Staff Auth | OTP via Resend + role middleware |
| Voice STT | Browser Web Speech API (hi-IN, en-IN) |
| Voice TTS | Browser SpeechSynthesis (Indian voices) |
| Voice AI | OpenAI GPT-4o (Hindi/English/Hinglish) |
| Menu Search | Upstash Vector + OpenAI embeddings |

---

# 10. India-Specific Considerations

## 10.1 Payment Preferences (2024 data)

| Method | Usage | Support |
|--------|-------|---------|
| UPI | 80%+ | ✅ Primary |
| Debit Card | 10% | ✅ Supported |
| Credit Card | 5% | ✅ Supported |
| Wallets | 5% | ✅ Supported |
| Cash | Common | ✅ Default option |

## 10.2 GST Registration Threshold

- **₹20 lakh turnover** (₹10 lakh for special category states): GST registration required
- Below threshold: Can show prices as inclusive, no GSTIN on invoice
- Restaurant setting: `gstRegistered: boolean` to toggle GST display

## 10.3 Language Distribution

| Language | Region | Support Level |
|----------|--------|---------------|
| Hindi | North/Central India | Full voice + text |
| English | Metro cities, South | Full voice + text |
| Hinglish | Urban youth | Full (mixed) |

## 10.4 Mobile-First Design

- 95%+ orders will be from mobile
- Optimize for low-end Android devices
- Razorpay checkout is mobile-optimized
- Voice works on Chrome Android (most popular browser in India)

## 10.5 Network Considerations

- Support for 3G/4G connections
- Lightweight API responses
- Progressive loading for menu
- Offline cart (sync when online)

---

# 11. Razorpay Setup Guide (for Owners)

1. Go to https://dashboard.razorpay.com
2. Sign up with PAN card and bank details
3. Complete KYC (takes 1-2 days)
4. Get API keys from Settings → API Keys
5. Enter Key ID and Key Secret in Waitr dashboard
6. Test with test mode keys first
7. Switch to live keys after testing

**Documents needed for Razorpay:**
- PAN card
- Business registration (if applicable)
- Bank account details
- GST certificate (if registered)

---

This plan is optimized for Indian cafés and restaurants, using Razorpay for payments (with UPI as primary), GST-compliant invoicing, and Hindi/English voice support.
