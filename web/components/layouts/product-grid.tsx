"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGrid, List, ChevronDown, Loader2, PackageSearch } from "lucide-react";
import { ProductCard } from "../product-card";
import { Skeleton } from "../ui/skeleton";
import { type ProductFilters } from "@/lib/api/products";
import { useProducts } from "@/lib/hooks/use-products";

interface ProductGridProps {
  filters?: ProductFilters;
}

export const ProductGrid = ({ filters = {} }: ProductGridProps) => {
  const [view, setView] = useState<"grid" | "list">("grid");

  const {
    products,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProducts(filters);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <section className="flex flex-col gap-8 min-w-0 flex-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading products..." : `${products.length} products found`}
        </p>

        <div className="flex items-center gap-4 self-start md:self-auto">
          <div className="relative">
            <select className="appearance-none bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-foreground text-sm py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
              <option>Recommended</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest Arrivals</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>

          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`p-2 transition-colors cursor-pointer ${
                view === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`p-2 transition-colors cursor-pointer ${
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <Skeleton className="aspect-4/5 w-full rounded-lg" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <p className="text-destructive font-medium">Failed to load products</p>
          <p className="text-sm text-muted-foreground">
            {error?.message || "Please check your connection and try again."}
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="p-4 rounded-full bg-muted/60">
            <PackageSearch className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">No products found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              We couldn&apos;t find any products matching your selected filters. Try resetting some filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10"
                : "grid grid-cols-1 sm:grid-cols-2 gap-6"
            }
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Sentinel element for infinite scroll */}
          <div ref={sentinelRef} className="py-4 flex items-center justify-center">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Loading more products...</span>
              </div>
            )}
            {!hasNextPage && products.length > 0 && (
              <p className="text-xs text-muted-foreground">
                You&apos;ve reached the end of the collection.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
