// Restaurant Management System

colorMode pastel
styleMode shadow
typeface clean
notation crows-foot
title Restaurant Management System

// Users and Authentication
users [icon: user, color: purple] {
  id string pk
  name string
  phone string
  email string
  is_active boolean
  created_at datetime
}

// Restaurants
restaurants [icon: store, color: blue] {
  id string pk
  name string
  slug string
  phone string
  created_at datetime
}

// Restaurant team members
restaurant_members [icon: users, color: indigo] {
  id string pk
  user_id string fk
  restaurant_id string fk
  role string
  created_at datetime
}

// Customer records
customers [icon: user-check, color: green] {
  id string pk
  name string
  phone string
  created_at datetime
}

// Restaurant tables
tables [icon: grid, color: cyan] {
  id string pk
  restaurant_id string fk
  table_number int
  label string
  is_active boolean
}

// Menu organization
menu_categories [icon: folder, color: yellow] {
  id string pk
  restaurant_id string fk
  name string
  sort_order int
  is_active boolean
}

// Menu items
menu_items [icon: coffee, color: orange] {
  id string pk
  restaurant_id string fk
  category_id string fk
  name string
  description string
  base_price decimal
  image_url string
  is_available boolean
  created_at datetime
}

// Item variants (sizes, options)
menu_item_variants [icon: list, color: amber] {
  id string pk
  menu_item_id string fk
  name string
  price decimal
}

// Orders
orders [icon: shopping-cart, color: red] {
  id string pk
  restaurant_id string fk
  table_id string fk
  customer_id string fk
  created_by_user_id string fk
  status string
  source string
  total_amount decimal
  created_at datetime
}

// Order line items
order_items [icon: list-checks, color: pink] {
  id string pk
  order_id string fk
  menu_item_id string fk
  variant_id string fk
  name_snapshot string
  price_snapshot decimal
  quantity int
}

// Payments
payments [icon: credit-card, color: emerald] {
  id string pk
  order_id string fk
  method string
  status string
  amount decimal
  provider_payment_id string
  created_at datetime
}

// User relationships
users.id < restaurant_members.user_id
users.id < orders.created_by_user_id

// Restaurant relationships
restaurants.id < restaurant_members.restaurant_id
restaurants.id < tables.restaurant_id
restaurants.id < menu_categories.restaurant_id
restaurants.id < menu_items.restaurant_id
restaurants.id < orders.restaurant_id

// Menu relationships
menu_categories.id < menu_items.category_id
menu_items.id < menu_item_variants.menu_item_id
menu_items.id < order_items.menu_item_id

// Order relationships
tables.id < orders.table_id
customers.id < orders.customer_id
orders.id < order_items.order_id
orders.id < payments.order_id

// Variant relationships
menu_item_variants.id < order_items.variant_id