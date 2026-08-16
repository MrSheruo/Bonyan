"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getProductById, getProducts, type Product, type ProductFilters } from "@/lib/api/products";

export function useProducts(filters: ProductFilters = {}) {
  const query = useInfiniteQuery({
    queryKey: ["products", filters],
    queryFn: ({ pageParam }) => getProducts(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const products: Product[] = query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    ...query,
    products,
  };
}

export function useProduct(id: string | null | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id!),
    enabled: typeof id === "string" && id.length > 0,
  });
}
