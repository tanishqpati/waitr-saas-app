"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  menuApi,
  restaurantsApi,
  type OnboardingRestaurant,
} from "@/lib/api";

const STEPS = [
  "create_restaurant",
  "add_menu",
  "qr",
  "test_order",
  "kitchen",
  "go_live",
] as const;
type Step = (typeof STEPS)[number];

function getStep(
  progress: OnboardingRestaurant[],
  seenKitchen: boolean
): Step {
  if (progress.length === 0) return "create_restaurant";
  const r = progress[0];
  if (r.categoryCount === 0) return "add_menu";
  if (r.orderCount === 0) return "qr";
  if (r.onboardingStep === "TEST_ORDER_DONE" && !seenKitchen) return "kitchen";
  return "go_live";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<OnboardingRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("create_restaurant");
  const [seenKitchen, setSeenKitchen] = useState(false);

  useEffect(() => {
    restaurantsApi
      .getOnboardingProgress()
      .then((p) => {
        setProgress(p);
        setStep(getStep(p, seenKitchen));
      })
      .catch((e) => {
        if (e?.message?.includes("Unauthorized")) router.replace("/login");
        else setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [router, seenKitchen]);

  const restaurant = progress[0];
  const currentIndex = STEPS.indexOf(step);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
        <Link href="/login" className="text-sm text-muted-foreground hover:underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold text-foreground">Get started</h1>
          <Link href="/kitchen" className="text-sm text-muted-foreground hover:underline">
            Skip to Kitchen
          </Link>
        </div>

        <div className="flex gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= currentIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === "create_restaurant" && (
          <CreateRestaurantStep
            onDone={() => {
              restaurantsApi.getOnboardingProgress().then(setProgress);
              setStep("add_menu");
            }}
          />
        )}
        {step === "add_menu" && restaurant && (
          <AddMenuStep
            restaurantId={restaurant.id}
            restaurantSlug={restaurant.slug}
            onDone={() => {
              restaurantsApi.getOnboardingProgress().then((p) => {
                setProgress(p);
                setStep("qr");
              });
            }}
          />
        )}
        {step === "qr" && restaurant && (
          <QRStep
            restaurantSlug={restaurant.slug}
            tableCount={restaurant.tableCount}
            onNext={() => setStep("test_order")}
          />
        )}
        {step === "test_order" && restaurant && (
          <TestOrderStep
            restaurantSlug={restaurant.slug}
            onOrderPlaced={() => {
              restaurantsApi.getOnboardingProgress().then((p) => {
                setProgress(p);
                setStep(getStep(p, seenKitchen));
              });
            }}
          />
        )}
        {step === "kitchen" && (
          <KitchenStep onNext={() => setSeenKitchen(true)} />
        )}
        {step === "go_live" && restaurant && (
          <GoLiveStep restaurantSlug={restaurant.slug} />
        )}
      </div>
    </div>
  );
}

function CreateRestaurantStep({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [tableCount, setTableCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 50) || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr(null);
    setLoading(true);
    try {
      await restaurantsApi.create(name.trim(), slug || "my-restaurant", tableCount);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create restaurant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Create your restaurant</h2>
        <p className="text-sm text-muted-foreground">
          We’ll create tables 1 to N. You can change them later.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {err && (
            <p className="text-sm text-destructive">{err}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Restaurant name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cafe Aroma"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tableCount">Number of tables</Label>
            <Input
              id="tableCount"
              type="number"
              min={1}
              max={50}
              value={tableCount}
              onChange={(e) => setTableCount(Math.min(50, Math.max(1, parseInt(e.target.value, 10) || 1)))}
            />
            <p className="text-xs text-muted-foreground">Tables 1–{tableCount} will be created (1–50).</p>
          </div>
          {slug && (
            <p className="text-xs text-muted-foreground">
              Menu URL: /r/{slug}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create restaurant"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AddMenuStep({
  restaurantId,
  restaurantSlug,
  onDone,
}: {
  restaurantId: string;
  restaurantSlug: string;
  onDone: () => void;
}) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [catName, setCatName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    setErr(null);
    setLoading(true);
    try {
      const res = await menuApi.createCategory(restaurantId, catName.trim(), categories.length);
      setCategories((c) => [...c, { id: res.id, name: catName.trim() }]);
      setSelectedCatId(res.id);
      setCatName("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add category");
    } finally {
      setLoading(false);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(itemPrice);
    if (!itemName.trim() || !selectedCatId || Number.isNaN(price) || price < 0) return;
    setErr(null);
    setLoading(true);
    try {
      await menuApi.createItem(restaurantId, selectedCatId, itemName.trim(), price);
      setItemName("");
      setItemPrice("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Add menu</h2>
        <p className="text-sm text-muted-foreground">
          Add at least one category and one item. You can add more later.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {err && <p className="text-sm text-destructive">{err}</p>}

        <form onSubmit={addCategory} className="space-y-2">
          <Label>New category</Label>
          <div className="flex gap-2">
            <Input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Mains"
            />
            <Button type="submit" disabled={loading || !catName.trim()}>
              Add
            </Button>
          </div>
        </form>

        {categories.length > 0 && (
          <>
            <form onSubmit={addItem} className="space-y-2">
              <Label>New item</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Item name"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="Price"
                />
              </div>
              <Button type="submit" disabled={loading || !itemName.trim() || !itemPrice}>
                Add item
              </Button>
            </form>

            <Button onClick={onDone} className="w-full" variant="secondary">
              Continue to QR codes
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function QRStep({
  restaurantSlug,
  tableCount,
  onNext,
}: {
  restaurantSlug: string;
  tableCount: number;
  onNext: () => void;
}) {
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/r/${restaurantSlug}`
      : "";
  const [QRCodeSVG, setQRCodeSVG] = useState<typeof import("qrcode.react")["QRCodeSVG"] | null>(null);
  const [downloading, setDownloading] = useState(false);
  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  useEffect(() => {
    import("qrcode.react").then((m) => setQRCodeSVG(() => m.QRCodeSVG));
  }, []);

  async function downloadPdf() {
    if (!baseUrl) return;
    setDownloading(true);
    try {
      const [QRCodeToDataURL, jspdfMod] = await Promise.all([
        import("qrcode").then((m) => m.toDataURL),
        import("jspdf"),
      ]);
      const JsPDF = (jspdfMod as { default?: typeof import("jspdf").jsPDF; jsPDF?: typeof import("jspdf").jsPDF }).default
        ?? (jspdfMod as { jsPDF: typeof import("jspdf").jsPDF }).jsPDF;
      const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const qrSize = 50;
      const margin = 20;
      let y = margin;

      for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        if (i > 0) doc.addPage();
        const url = `${baseUrl}?t=${t}`;
        const dataUrl = await QRCodeToDataURL(url, { width: 400, margin: 1 });
        doc.setFontSize(14);
        doc.text(`Table ${t}`, margin, y);
        y += 8;
        doc.addImage(dataUrl, "PNG", margin, y, qrSize, qrSize);
        y += qrSize + 6;
        doc.setFontSize(9);
        doc.text(url, margin, y);
      }

      doc.save(`qr-codes-${restaurantSlug}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">QR codes for tables</h2>
        <p className="text-sm text-muted-foreground">
          Each table has a QR code. Customers scan to open the menu and order. Tables 1–{tableCount} were created.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {tables.map((t) => (
            <div key={t} className="flex flex-col items-center gap-1">
              {QRCodeSVG && baseUrl && (
                <QRCodeSVG
                  value={`${baseUrl}?t=${t}`}
                  size={80}
                  level="M"
                  includeMargin={false}
                />
              )}
              <span className="text-xs text-muted-foreground">Table {t}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Menu link: {baseUrl}
        </p>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={downloadPdf}
            disabled={downloading || !baseUrl}
          >
            {downloading ? "Preparing…" : "Download QR codes as PDF"}
          </Button>
          <Button onClick={onNext} className="w-full">
            Next: Place a test order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TestOrderStep({
  restaurantSlug,
  onOrderPlaced,
}: {
  restaurantSlug: string;
  onOrderPlaced: () => void;
}) {
  const menuUrl = `/r/${restaurantSlug}`;
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Place a test order</h2>
        <p className="text-sm text-muted-foreground">
          Open the menu, add items, choose a table, and place an order. This is how your customers will use it.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild className="w-full">
          <Link href={menuUrl} target="_blank" rel="noopener noreferrer">
            Open menu and place order
          </Link>
        </Button>
        <Button variant="secondary" className="w-full" onClick={onOrderPlaced}>
          I’ve placed my test order
        </Button>
      </CardContent>
    </Card>
  );
}

function KitchenStep({ onNext }: { onNext: () => void }) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Kitchen dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Your staff will use the kitchen view to see new orders and update status: Mark Preparing → Mark Ready → Completed.
        </p>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={() => {
            onNext();
            router.push("/kitchen");
          }}
        >
          Open kitchen dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

function GoLiveStep({ restaurantSlug }: { restaurantSlug: string }) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">You’re live</h2>
        <p className="text-sm text-muted-foreground">
          Your restaurant is ready. Share the menu link and QR codes with customers.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>✔ Menu added</li>
          <li>✔ QR codes generated</li>
          <li>✔ Test order completed</li>
        </ul>
        <Button
          className="w-full"
          onClick={() => router.push("/kitchen")}
        >
          Go to kitchen dashboard
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/r/${restaurantSlug}`} target="_blank">
            View menu
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
