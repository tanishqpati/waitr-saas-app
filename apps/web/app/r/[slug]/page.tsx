"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  const [tableId, setTableId] = useState("");
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Loading menu…</p>
      </div>
    );
  }
  if (error && !menu) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); menuApi.getBySlug(slug).then(setMenu).catch((e) => setError(e.message)).finally(() => setLoading(false)); }}
          className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm"
        >
          Retry
        </button>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">Home</Link>
      </div>
    );
  }
  if (!menu) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 pb-24">
      <header className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-800/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-zinc-900 dark:text-zinc-100">{menu.restaurant.name}</h1>
          <Link href="/" className="text-sm text-zinc-500 hover:underline">Home</Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="underline">Dismiss</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm">
            Order placed. Thank you!
          </div>
        )}
        {menu.categories.map((cat) => (
          <section key={cat.id} className="mb-8">
            <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-3">{cat.name}</h2>
            <ul className="space-y-2">
              {cat.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</p>
                    <p className="text-sm text-zinc-500">${item.price.toFixed(2)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {cart.length > 0 && (
            <ul className="max-h-24 overflow-y-auto space-y-1 text-sm">
              {cart.map((c) => (
                <li key={c.menu_item_id} className="flex items-center justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">{c.name} × {c.quantity}</span>
                  <span className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQty(c.menu_item_id, -1)} className="w-6 h-6 rounded border text-zinc-600">−</button>
                    <button type="button" onClick={() => updateQty(c.menu_item_id, 1)} className="w-6 h-6 rounded border text-zinc-600">+</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={placeOrder} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Table</label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Select</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>Table {t.tableNumber}</option>
                ))}
              </select>
            </div>
            <div className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Total: ${total.toFixed(2)}</div>
            <button
              type="submit"
              disabled={cart.length === 0 || !tableId || placing}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 font-medium disabled:opacity-50"
            >
              {placing ? "Placing…" : "Place order"}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
