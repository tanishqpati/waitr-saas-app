"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [restaurantId, setRestaurantId] = useState<string>("");
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
        .then((data) => {
          if (!cancelled) setOrders(data);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load orders");
        });
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (restaurants.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-muted-foreground">No restaurants. Create one after logging in.</p>
        <Button asChild variant="link">
          <Link href="/login">Log in</Link>
        </Button>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          Home
        </Link>
      </div>
    );
  }
  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Select value={restaurantId} onValueChange={setRestaurantId}>
            <SelectTrigger className="min-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {restaurants.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            Home
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">
                    Table {order.table?.tableNumber ?? "?"} · ${order.totalAmount.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <ul className="text-sm text-muted-foreground mb-3">
                  {order.items.map((i, idx) => (
                    <li key={idx}>
                      {i.nameSnapshot} × {i.quantity} — ${(i.priceSnapshot * i.quantity).toFixed(2)}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={order.status === s ? "default" : "outline"}
                      onClick={() => setStatus(order.id, s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {orders.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No orders yet.</p>
        )}
      </main>
    </div>
  );
}
