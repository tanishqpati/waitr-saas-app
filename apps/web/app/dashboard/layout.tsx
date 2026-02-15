"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { RestaurantProvider } from "@/components/RestaurantContext";
import { restaurantsApi } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/menu", label: "Menu" },
  { href: "/kitchen", label: "Orders" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restaurantsApi
      .list()
      .then((list) => {
        setRestaurants(list);
        if (list.length > 0 && !restaurantId) setRestaurantId(list[0].id);
      })
      .catch((e) => {
        if (e?.message?.includes("Unauthorized")) router.replace("/login");
        else setRestaurants([]);
      })
      .finally(() => setLoading(false));
  }, [router]);

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
        <p className="text-muted-foreground">No restaurants. Create one first.</p>
        <Link href="/onboarding" className="text-sm text-primary hover:underline">
          Go to onboarding
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 border-r border-border bg-card/50 shrink-0">
        <div className="sticky top-0 flex flex-col h-screen py-4">
          <div className="px-4 pb-4 border-b border-border mb-4">
            <Link href="/" className="text-lg font-semibold text-foreground hover:opacity-80">
              Waitr
            </Link>
          </div>
          <nav className="flex-1 px-2 space-y-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                  pathname === item.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="px-6 py-3 flex items-center justify-between gap-4">
            <select
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              className="min-w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              Home
            </Link>
          </div>
        </header>
        <div className="p-6">
          <RestaurantProvider
            restaurants={restaurants}
            restaurantId={restaurantId}
            setRestaurantId={setRestaurantId}
          >
            {children}
          </RestaurantProvider>
        </div>
      </main>
    </div>
  );
}
