"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ordersApi, restaurantsApi } from "@/lib/api";

const STATUSES = ["NEW", "PREPARING", "READY", "COMPLETED"] as const;

type Order = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  table: { id: string; tableNumber: number } | null;
  items: { nameSnapshot: string; priceSnapshot: number; quantity: number }[];
};

export default function KitchenPage() {
  const [restaurants, setRestaurants] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    restaurantsApi
      .list()
      .then((list) => {
        setRestaurants(list);
        if (list.length > 0 && !restaurantId) setRestaurantId(list[0].id);
      })
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!restaurantId) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    function fetchOrders() {
      ordersApi
        .list(restaurantId)
        .then((data) => { if (!cancelled) setOrders(data); })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load orders"); });
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [restaurantId]);

  async function setStatus(orderId: string, status: string) {
    setError(null);
    try {
      await ordersApi.updateStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }
  if (restaurants.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-zinc-600 dark:text-zinc-400">No restaurants. Create one after logging in.</p>
        <Link href="/login" className="text-zinc-900 dark:text-zinc-100 font-medium underline">Log in</Link>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">Home</Link>
      </div>
    );
  }
  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-800/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <select
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <Link href="/" className="text-sm text-zinc-500 hover:underline">Home</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="underline">Dismiss</button>
          </div>
        )}
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  Table {order.table?.tableNumber ?? "?"} · ${order.totalAmount.toFixed(2)}
                </span>
                <span className="text-sm text-zinc-500">{new Date(order.createdAt).toLocaleTimeString()}</span>
              </div>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                {order.items.map((i, idx) => (
                  <li key={idx}>{i.nameSnapshot} × {i.quantity} — ${(i.priceSnapshot * i.quantity).toFixed(2)}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(order.id, s)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      order.status === s
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                        : "border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {orders.length === 0 && (
          <p className="text-center text-zinc-500 py-8">No orders yet.</p>
        )}
      </main>
    </div>
  );
}
