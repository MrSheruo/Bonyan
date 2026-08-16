"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Heart as HeartIcon, ArrowRight as ArrowRightIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product-card";
import { useSavedItemsStore, type SavedItem } from "@/lib/stores/saved-items-store";
import type { Product } from "@/lib/api/products";
import { cn } from "@/lib/utils";

function savedItemToProductShape(saved: SavedItem): Product {
  return {
    id: saved.productId,
    name: saved.name,
    brand: saved.brand ?? null,
    rating: Number(saved.rating) || 0,
    images: [{ url: saved.image, isPrimary: true }],
    listings: [],
  };
}

export function SavedItemsList() {
  const items = useSavedItemsStore((s) => s.items);
  const clearAll = useSavedItemsStore((s) => s.clearAll);

  const count = items.length;

  const products = useMemo(
    () => items.map((item) => ({ saved: item, product: savedItemToProductShape(item) })),
    [items]
  );

  if (count === 0) {
    return (
      <section className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Saved Items</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Pieces you&apos;ve loved for later — they&apos;ll live here.
            </p>
          </div>
        </div>

        <div className="min-h-[420px] rounded-2xl border border-dashed border-border/80 bg-card/60 flex flex-col items-center justify-center gap-6 text-center p-10">
          <div className="inline-flex items-center justify-center size-20 rounded-full bg-accent/15 text-accent-foreground">
            <HeartIcon className="h-9 w-9" />
          </div>
          <div className="flex flex-col gap-2 max-w-md">
            <h2 className="font-semibold text-xl tracking-tight">
              Nothing saved yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Tap the heart on any product card to save it here. Your list
              stays saved on this device across sessions.
            </p>
          </div>
          <Link
            href="/products"
            className={cn(buttonVariants(), "inline-flex items-center gap-2")}
          >
            Browse Products
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            Saved Items
            <Badge
              variant="secondary"
              className="bg-accent/20 text-accent-foreground border-transparent text-base px-3 py-0.5 rounded-xl"
            >
              {count} {count === 1 ? "item" : "items"}
            </Badge>
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Pieces you&apos;ve set aside. Add them to cart anytime.
          </p>
        </div>
        {count > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors self-end md:self-auto cursor-pointer"
          >
            Clear all saved
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map(({ saved, product }) => (
          <ProductCard
            key={saved.productId}
            product={product}
            savedListingId={saved.listingId}
            savedPrice={saved.price}
          />
        ))}
      </div>
    </section>
  );
}
