const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Access token kept in memory only (not localStorage or cookies). */
let memoryAccessToken: string | null = null;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return memoryAccessToken;
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") memoryAccessToken = token;
}

export function clearToken(): void {
  if (typeof window !== "undefined") memoryAccessToken = null;
}

/** Call refresh endpoint (sends httpOnly cookie). Returns new access token or null. */
async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { token?: string };
  const token = data?.token ?? null;
  if (token) setToken(token);
  return token;
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null; _retried?: boolean } = {}
): Promise<T> {
  const { token = getToken(), _retried, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !_retried) {
    const newToken = await refreshAccessToken();
    if (newToken) return api<T>(path, { ...options, token: newToken, _retried: true });
    clearToken();
  }

  if (!res.ok) throw new Error((data as { error?: string })?.error ?? res.statusText ?? "Request failed");
  return data as T;
}

export const authApi = {
  sendOtp: (email: string) =>
    api<{ ok: boolean }>("/auth/send-otp", { method: "POST", body: JSON.stringify({ email }) }),
  verifyOtp: (email: string, otp: string) =>
    api<{ token: string }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),
  /** Silent refresh: get new access token using refresh cookie. Use on app load. */
  refresh: (): Promise<string | null> => refreshAccessToken(),
  logout: async () => {
    await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
    clearToken();
  },
};

export type OnboardingRestaurant = {
  id: string;
  name: string;
  slug: string;
  onboardingStep: string;
  tableCount: number;
  categoryCount: number;
  orderCount: number;
};

export const restaurantsApi = {
  list: () => api<{ id: string; name: string; slug: string }[]>("/restaurants"),
  create: (name: string, slug: string, tableCount?: number) =>
    api<{ id: string; name: string; slug: string }>("/restaurants", {
      method: "POST",
      body: JSON.stringify({ name, slug, table_count: tableCount ?? 10 }),
    }),
  getOnboardingProgress: () => api<OnboardingRestaurant[]>("/restaurants/onboarding-progress"),
};

export const menuApi = {
  createCategory: (restaurantId: string, name: string, sortOrder?: number) =>
    api<{ id: string }>("/menu/categories", {
      method: "POST",
      body: JSON.stringify({ restaurant_id: restaurantId, name, sort_order: sortOrder ?? 0 }),
    }),
  createItem: (restaurantId: string, categoryId: string, name: string, price: number) =>
    api<{ id: string }>("/menu/items", {
      method: "POST",
      body: JSON.stringify({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name,
        price,
      }),
    }),
  getBySlug: (slug: string) =>
    api<{
      restaurant: { id: string; name: string; slug: string };
      tables: { id: string; tableNumber: number }[];
      categories: { id: string; name: string; items: { id: string; name: string; price: number }[] }[];
    }>(`/restaurants/${slug}/menu`),
};

export const ordersApi = {
  create: (tableId: string, items: { menu_item_id: string; quantity: number }[]) =>
    api<{ id: string }>("/orders", { method: "POST", body: JSON.stringify({ table_id: tableId, items }) }),
  list: (restaurantId: string) =>
    api<
      {
        id: string;
        status: string;
        totalAmount: number;
        createdAt: string;
        table: { id: string; tableNumber: number } | null;
        items: { nameSnapshot: string; priceSnapshot: number; quantity: number }[];
      }[]
    >(`/orders?restaurant_id=${encodeURIComponent(restaurantId)}`),
  updateStatus: (orderId: string, status: string) =>
    api<{ id: string; status: string }>(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
