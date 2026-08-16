"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedItem {
  productId: string;
  listingId: string;
  name: string;
  image: string;
  brand: string | null;
  rating: string;
  price: number;
}

interface SavedItemsState {
  items: SavedItem[];
  addItem: (item: SavedItem) => void;
  removeItem: (productId: string) => void;
  toggleItem: (item: SavedItem) => void;
  isSaved: (productId: string) => boolean;
  clearAll: () => void;
}

export const useSavedItemsStore = create<SavedItemsState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const { items } = get();
        if (items.some((it) => it.productId === item.productId)) {
          return;
        }
        set({ items: [item, ...items] });
      },
      removeItem: (productId) => {
        const { items } = get();
        const next = items.filter((it) => it.productId !== productId);
        if (next.length !== items.length) {
          set({ items: next });
        }
      },
      toggleItem: (item) => {
        const { items, isSaved, removeItem, addItem } = get();
        if (isSaved(item.productId)) {
          removeItem(item.productId);
        } else {
          addItem(item);
        }
      },
      isSaved: (productId) => {
        const { items } = get();
        return items.some((it) => it.productId === productId);
      },
      clearAll: () => set({ items: [] }),
    }),
    {
      name: "saved-items",
    }
  )
);
