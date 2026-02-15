"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRestaurant } from "@/components/RestaurantContext";
import { menuApi, type EditorCategory } from "@/lib/api";

type MenuItem = EditorCategory["items"][number];

export default function DashboardMenuPage() {
  const { restaurantId } = useRestaurant();
  const [categories, setCategories] = useState<EditorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  function loadMenu() {
    if (!restaurantId) return;
    setLoading(true);
    setError(null);
    menuApi
      .getForEditor(restaurantId)
      .then((data) => {
        setCategories(data.categories);
        if (data.categories.length > 0 && !selectedCatId) {
          setSelectedCatId(data.categories[0].id);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadMenu();
  }, [restaurantId]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim() || !restaurantId) return;
    setAddLoading(true);
    setError(null);
    try {
      const res = await menuApi.createCategory(restaurantId, catName.trim(), categories.length);
      setCategories((prev) => [...prev, { id: res.id, name: catName.trim(), sortOrder: categories.length, items: [] }]);
      setSelectedCatId(res.id);
      setCatName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add category");
    } finally {
      setAddLoading(false);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(itemPrice);
    if (!itemName.trim() || !selectedCatId || !restaurantId || Number.isNaN(price) || price < 0) return;
    setAddLoading(true);
    setError(null);
    try {
      await menuApi.createItem(restaurantId, selectedCatId, itemName.trim(), price);
      loadMenu();
      setItemName("");
      setItemPrice("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add item");
    } finally {
      setAddLoading(false);
    }
  }

  function openEditModal(item: MenuItem) {
    setEditItem(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditCategoryId(item.categoryId);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    const price = parseFloat(editPrice);
    if (Number.isNaN(price) || price < 0) return;
    setEditLoading(true);
    setError(null);
    try {
      await menuApi.updateItem(editItem.id, {
        name: editName.trim(),
        price,
        categoryId: editCategoryId !== editItem.categoryId ? editCategoryId : undefined,
      });
      loadMenu();
      setEditItem(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setEditLoading(false);
    }
  }

  async function toggleAvailable(item: MenuItem) {
    setError(null);
    try {
      await menuApi.updateItem(item.id, { isAvailable: !item.isAvailable });
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          items: c.items.map((i) =>
            i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i
          ),
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Menu</h1>
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Add category</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={addCategory} className="flex gap-2">
            <Input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Category name"
              className="max-w-xs"
            />
            <Button type="submit" disabled={addLoading || !catName.trim()}>
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Add item</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={addItem} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="min-w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Item name"
                />
              </div>
              <div className="space-y-1">
                <Label>Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-24"
                />
              </div>
              <Button type="submit" disabled={addLoading || !itemName.trim() || !itemPrice}>
                Add item
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardHeader>
              <h2 className="text-lg font-semibold">{cat.name}</h2>
            </CardHeader>
            <CardContent>
              {cat.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items</p>
              ) : (
                <ul className="space-y-2">
                  {cat.items.map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-center justify-between rounded-lg border border-border px-3 py-2 ${
                        !item.isAvailable ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">${item.price.toFixed(2)}</span>
                        {!item.isAvailable && (
                          <span className="rounded bg-muted px-2 py-0.5 text-xs">Unavailable</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAvailable(item)}
                        >
                          {item.isAvailable ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditModal(item)}>
                          Edit
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {editItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setEditItem(null)}
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-lg font-semibold">Edit item</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditItem(null)}>
                ×
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={editLoading}>
                    Save
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
