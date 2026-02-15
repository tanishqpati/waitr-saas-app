"use client";

import { createContext, useContext, type ReactNode } from "react";

type Restaurant = { id: string; name: string; slug: string };

type RestaurantContextValue = {
  restaurants: Restaurant[];
  restaurantId: string;
  setRestaurantId: (id: string) => void;
};

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

export function RestaurantProvider({
  children,
  restaurants,
  restaurantId,
  setRestaurantId,
}: {
  children: ReactNode;
  restaurants: Restaurant[];
  restaurantId: string;
  setRestaurantId: (id: string) => void;
}) {
  return (
    <RestaurantContext.Provider
      value={{ restaurants, restaurantId, setRestaurantId }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error("useRestaurant must be used within RestaurantProvider");
  return ctx;
}
