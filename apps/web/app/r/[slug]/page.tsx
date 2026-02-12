"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { menuApi, ordersApi } from "@/lib/api";

type CartItem = { menu_item_id: string; name: string; price: number; quantity: number };

export default function MenuPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [menu, setMenu] = useState<{
    restaurant: { id: string; name: string; slug: string };
    tables: { id: string; tableNumber: number }[];
    categories: { id: string; name: string; items: { id: string; name: string; price: number }[] }[];
  } | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setError(null);
    setLoading(true);
    menuApi
      .getBySlug(slug)
      .then((data) => setMenu(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load menu"))
      .finally(() => setLoading(false));
  }, [slug]);

  const tables = menu?.tables ?? [];

  function addToCart(item: { id: string; name: string; price: number }) {
    setCart((prev) => {
      const i = prev.findIndex((c) => c.menu_item_id === item.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) => {
      const i = prev.findIndex((c) => c.menu_item_id === menuItemId);
      if (i < 0) return prev;
      const next = [...prev];
      const q = next[i].quantity + delta;
      if (q <= 0) return next.filter((_, idx) => idx !== i);
      next[i] = { ...next[i], quantity: q };
      return next;
    });
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!tableId || cart.length === 0) return;
    setError(null);
    setPlacing(true);
    try {
      await ordersApi.create(tableId, cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })));
      setCart([]);
      setTableId("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading menu…</p>
      </div>
    );
  }
  if (error && !menu) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-destructive">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            setLoading(true);
            menuApi.getBySlug(slug).then(setMenu).catch((e) => setError(e.message)).finally(() => setLoading(false));
          }}
        >
          Retry
        </Button>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          Home
        </Link>
      </div>
    );
  }
  if (!menu) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-foreground">{menu.restaurant.name}</h1>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            Home
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
            Order placed. Thank you!
          </div>
        )}
        {menu.categories.map((cat) => (
          <section key={cat.id} className="mb-8">
            <h2 className="text-lg font-medium text-foreground mb-3">{cat.name}</h2>
            <ul className="space-y-2">
              {cat.items.map((item) => (
                <li key={item.id}>
                  <Card>
                    <CardContent className="flex flex-row items-center justify-between gap-3 py-4">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                      </div>
                      <Button type="button" size="sm" onClick={() => addToCart(item)}>
                        Add
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {cart.length > 0 && (
            <ul className="max-h-24 overflow-y-auto space-y-1 text-sm text-muted-foreground">
              {cart.map((c) => (
                <li key={c.menu_item_id} className="flex items-center justify-between">
                  <span>{c.name} × {c.quantity}</span>
                  <span className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      onClick={() => updateQty(c.menu_item_id, -1)}
                    >
                      −
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      onClick={() => updateQty(c.menu_item_id, 1)}
                    >
                      +
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={placeOrder} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[120px] space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Table</label>
              <Select value={tableId || undefined} onValueChange={(v) => setTableId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      Table {t.tableNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-lg font-medium text-foreground">Total: ${total.toFixed(2)}</div>
            <Button type="submit" disabled={cart.length === 0 || !tableId || placing}>
              {placing ? "Placing…" : "Place order"}
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}
