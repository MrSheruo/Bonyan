"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  addAddress,
  getAddresses,
  removeAddress,
  updateAddress,
  type Address,
  type CreateAddressInput,
  type UpdateAddressInput,
} from "@/lib/api/addresses";
import { useUser } from "./use-auth";

export const ADDRESSES_QUERY_KEY = ["addresses"] as const;

export function useAddresses(
  options?: Omit<UseQueryOptions<Address[]>, "queryKey" | "queryFn" | "enabled">
) {
  const { isAuthenticated, isLoading } = useUser();

  return useQuery<Address[]>({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: getAddresses,
    enabled: !isLoading && isAuthenticated,
    staleTime: 1000 * 60 * 2,
    ...options,
  });
}

export function useAddAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAddressInput) => addAddress(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number | string;
      input: UpdateAddressInput;
    }) => updateAddress(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ADDRESSES_QUERY_KEY });
      const previous = queryClient.getQueryData<Address[]>(ADDRESSES_QUERY_KEY);
      if (previous) {
        const next = previous.map((a) =>
          String(a.id) === String(id) ? ({ ...a, ...input } as Address) : a
        );
        queryClient.setQueryData<Address[]>(ADDRESSES_QUERY_KEY, next);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Address[]>(ADDRESSES_QUERY_KEY, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => removeAddress(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ADDRESSES_QUERY_KEY });
      const previous = queryClient.getQueryData<Address[]>(ADDRESSES_QUERY_KEY);
      if (previous) {
        const next = previous.filter(
          (a) => String(a.id) !== String(id)
        );
        queryClient.setQueryData<Address[]>(ADDRESSES_QUERY_KEY, next);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Address[]>(ADDRESSES_QUERY_KEY, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
}
