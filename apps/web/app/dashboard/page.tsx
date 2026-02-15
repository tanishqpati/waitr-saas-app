"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRestaurant } from "@/components/RestaurantContext";
import { analyticsApi, ordersApi, type PopularItem, type SalesDataPoint } from "@/lib/api";

type Order = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  table: { id: string; tableNumber: number } | null;
  items: { nameSnapshot: string; priceSnapshot: number; quantity: number }[];
};

export default function DashboardPage() {
  const { restaurantId } = useRestaurant();
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [sales, setSales] = useState<SalesDataPoint[]>([]);
  const [salesRange, setSalesRange] = useState<"7d" | "12m">("7d");
  const [today, setToday] = useState<{
    ordersCount: number;
    revenue: number;
    avgOrderValue: number;
    activeOrders: number;
  } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    analyticsApi.sales(restaurantId, salesRange).then(setSales);
  }, [restaurantId, salesRange]);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      analyticsApi.today(restaurantId),
      analyticsApi.popularItems(restaurantId),
      ordersApi.list(restaurantId),
    ])
      .then(([todayData, popularData, ordersData]) => {
        setToday(todayData);
        setPopularItems(popularData);
        setOrders(ordersData.slice(0, 10));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
        {error}
      </div>
    );
  }

  const cards = today
    ? [
        { label: "Orders today", value: today.ordersCount },
        { label: "Revenue today", value: `$${today.revenue.toLocaleString()}` },
        { label: "Avg order value", value: `$${today.avgOrderValue}` },
        { label: "Active orders", value: today.activeOrders },
      ]
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Latest orders</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/kitchen">View all</Link>
          </Button>
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Order</th>
                <th className="text-left px-4 py-3 font-medium">Table</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">{o.table?.tableNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-right">${o.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        o.status === "NEW" || o.status === "PREPARING"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(o.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No orders yet.</p>
        )}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Sales</h2>
              <p className="text-sm text-muted-foreground">
                {salesRange === "7d" ? "Last 7 days" : "Last 12 months"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant={salesRange === "7d" ? "default" : "outline"}
                size="sm"
                onClick={() => setSalesRange("7d")}
              >
                7d
              </Button>
              <Button
                variant={salesRange === "12m" ? "default" : "outline"}
                size="sm"
                onClick={() => setSalesRange("12m")}
              >
                12m
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No sales data yet.</p>
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sales}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        salesRange === "7d"
                          ? new Date(v).toLocaleDateString(undefined, { weekday: "short" })
                          : new Date(v).toLocaleDateString(undefined, { month: "short", year: "2-digit" })
                      }
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]}
                      labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Popular items</h2>
            <p className="text-sm text-muted-foreground">Top 5 today</p>
          </CardHeader>
          <CardContent>
            {popularItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="space-y-2">
                {popularItems.map((item, i) => (
                  <li key={item.menuItemId} className="flex justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">{item.quantity} ordered</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
