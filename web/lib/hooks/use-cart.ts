"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  type AddCartItemInput,
  type Cart,
  type CartItem,
} from "@/lib/api/cart";
import { useUser } from "./use-auth";

export const CART_QUERY_KEY = ["cart"] as const;

export function useCart() {
  const { isAuthenticated, isLoading } = useUser();

  return useQuery<Cart>({
    queryKey: CART_QUERY_KEY,
    queryFn: getCart,
    enabled: !isLoading && isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddCartItemInput) => addCartItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      updateCartItem(id, { quantity }),
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previousCart = queryClient.getQueryData<Cart>(CART_QUERY_KEY);
      if (previousCart) {
        const items = previousCart.items.map((item: CartItem) =>
          item.id === id ? { ...item, quantity } : item
        );
        const total = items.reduce(
          (sum: number, i: CartItem) => sum + i.priceAtAdd * i.quantity,
          0
        );
        queryClient.setQueryData<Cart>(CART_QUERY_KEY, {
          ...previousCart,
          items,
          total,
        });
      }
      return { previousCart };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData<Cart>(CART_QUERY_KEY, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => removeCartItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previousCart = queryClient.getQueryData<Cart>(CART_QUERY_KEY);
      if (previousCart) {
        const items = previousCart.items.filter(
          (item: CartItem) => item.id !== id
        );
        const total = items.reduce(
          (sum: number, i: CartItem) => sum + i.priceAtAdd * i.quantity,
          0
        );
        queryClient.setQueryData<Cart>(CART_QUERY_KEY, {
          ...previousCart,
          items,
          total,
        });
      }
      return { previousCart };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData<Cart>(CART_QUERY_KEY, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}
