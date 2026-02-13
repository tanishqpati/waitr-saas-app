Restaurant onboarding is one of the most critical parts of your product. If onboarding is slow or confusing, cafés will drop off before they even try the system. A good onboarding flow should let a restaurant go from **sign-up → first order placed** in under 10 minutes.

I’ll explain this in two parts:

1. **Non-technical flow (what the user experiences)**
2. **Technical flow (what your system should do behind the scenes)**

---

# 1. Non-Technical Restaurant Onboarding Flow (User Experience)

Think of onboarding as a guided wizard, not a dashboard full of options.

## Step 1 — Sign Up / Login

Restaurant owner:

* Enters email
* Receives OTP
* Logs in

UX tips:

* Only ask for email initially
* No long forms
* Fast login is critical

Goal:
Get user inside product quickly.

---

## Step 2 — Create Restaurant

Ask only essential fields:

* Restaurant name
* City (optional initially)

System should automatically:

* Generate slug
* Create default tables (1–10)

UX tip:
Do not ask for:

* GST number
* address
* logo
* complex details

Those can come later.

Goal:
Restaurant created in <1 minute.

---

## Step 3 — Add Menu

Give three options:

1. Upload PDF or image (later AI)
2. Upload CSV/Excel
3. Add manually

For MVP:
Manual entry is enough.

Ask only:

* Category
* Item name
* Price

Images optional.

UX tip:
Show example menu to guide users.

Goal:
Menu added in 5 minutes.

---

## Step 4 — Generate QR Codes

Automatically show:

* QR for Table 1
* QR for Table 2

Buttons:

* Download QR
* Print QR

UX tip:
Also show a “Test Order” button.

Goal:
Restaurant understands system instantly.

---

## Step 5 — Test Order

Prompt:
“Scan this QR and place a test order.”

This is extremely powerful because:
The owner experiences the product themselves.

Goal:
First order placed successfully.

---

## Step 6 — Kitchen Dashboard Introduction

Show:

* Order appears
* Button: Mark Preparing
* Button: Mark Ready

UX tip:
Highlight buttons with tooltip:
“This is how your staff will use it.”

Goal:
Owner understands workflow.

---

## Step 7 — Go Live

Show checklist:

✔ Menu added
✔ QR generated
✔ Test order completed

Button:
“Your restaurant is ready”

This gives psychological completion.

---

# 2. Technical Flow (Backend Perspective)

Now let’s map what happens technically.

---

## Step 1 — User Login

API:

```
POST /auth/send-otp
POST /auth/verify-otp
```

Backend:

1. Generate OTP
2. Store OTP
3. Verify OTP
4. Create user if not exists
5. Issue JWT

Database:

* users
* otp_codes

---

## Step 2 — Create Restaurant

API:

```
POST /restaurants
```

Backend should:

1. Create restaurant
2. Create restaurant_member with role ADMIN
3. Create default tables (1–10)

Database writes:

* restaurants
* restaurant_members
* tables

---

## Step 3 — Menu Creation

APIs:

```
POST /menu/categories
POST /menu/items
```

Backend:

* Insert categories
* Insert items

Tables:

* menu_categories
* menu_items

---

## Step 4 — QR Generation

Technically:
QR contains URL like:

```
https://yourapp.com/r/cafe-aroma?t=5
```

Implementation:

* Generate QR on frontend or backend
* Store table_id mapping

No database change needed unless storing QR metadata.

---

## Step 5 — Test Order

API:

```
POST /orders
```

Backend:

1. Validate items
2. Fetch prices from DB
3. Calculate total
4. Insert order
5. Insert order_items

Tables:

* orders
* order_items

---

## Step 6 — Kitchen Dashboard

API:

```
GET /orders?restaurant_id=xxx
PATCH /orders/:id/status
```

Frontend:
Polling or WebSockets.

---

# 3. Data Flow Summary

During onboarding, system creates:

User
Restaurant
RestaurantMember
Tables
MenuCategories
MenuItems

Then first Order.

That’s the full lifecycle.

---

# 4. Backend Sequence Diagram (Conceptual)

Owner logs in
→ Create restaurant
→ Add menu
→ Generate QR
→ Place order
→ Kitchen dashboard

Each step builds on previous.

---

# 5. Important UX Principles

### Reduce Friction

Only ask necessary fields.

---

### Give Immediate Feedback

Show success messages after each step.

---

### Guide the User

Use:

* tooltips
* progress steps
* checklist

---

### Let Them Experience Value Early

The first test order is the key moment.

---

# 6. Recommended Onboarding Screen Flow

```
Login
↓
Create Restaurant
↓
Add Menu
↓
Generate QR
↓
Place Test Order
↓
Kitchen Dashboard
↓
You're Live
```

---

# 7. Edge Cases to Handle (Technical)

Handle cases:

User refreshes onboarding
Restaurant created but menu empty
Menu created but no tables
Tables exist but no orders

Always allow user to resume onboarding.

---

# 8. Backend State Tracking (Optional but Powerful)

You can track onboarding progress:

```
restaurant.onboarding_step
```

Example values:

* CREATED
* MENU_ADDED
* TEST_ORDER_DONE

This allows smart UI prompts.

---

# 9. What Not to Build in Onboarding

Avoid:

* analytics
* payments
* staff management
* loyalty

Focus only on:
First order success.

---

# 10. Real-World Benchmark

A good onboarding time target:

Restaurant sign-up → first order
Under 10 minutes.

If longer, drop-off increases sharply.

---

# 11. What Makes Great Onboarding

The best onboarding makes the user feel:

“This is easy.”
“This saves time.”
“I can use this today.”

That’s the goal.



