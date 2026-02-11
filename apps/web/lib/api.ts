const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("waitr_token");
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token = getToken(), ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? res.statusText ?? "Request failed");
  return data as T;
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem("waitr_token", token);
}

export function clearToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem("waitr_token");
}

export const authApi = {
  sendOtp: (email: string) => api<{ ok: boolean }>("/auth/send-otp", { method: "POST", body: JSON.stringify({ email }) }),
  verifyOtp: (email: string, otp: string) => api<{ token: string }>("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) }),
};

export const restaurantsApi = {
  list: () => api<{ id: string; name: string; slug: string }[]>("/restaurants"),
  create: (name: string, slug: string) => api<{ id: string }>("/restaurants", { method: "POST", body: JSON.stringify({ name, slug }) }),
};

export const menuApi = {
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
