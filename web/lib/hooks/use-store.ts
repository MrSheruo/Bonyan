"use client";

import { useQuery } from "@tanstack/react-query";
import { getStore, type StoreDetail } from "@/lib/api/stores";

export function useStore(id: string, options?: { enabled?: boolean }) {
  return useQuery<StoreDetail>({
    queryKey: ["store", id],
    queryFn: () => getStore(id),
    enabled: Boolean(id) && (options?.enabled ?? false),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
