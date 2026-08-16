import { z } from "zod";
import { api } from "./client";

export const cartItemSchema = z.object({
  id: z.number(),
  listingId: z.number(),
  productId: z.string().optional(),
  name: z.string().optional().default("Product"),
  image: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  tier: z.string().nullable().optional(),
  store: z
    .object({
      id: z.string(),
      name: z.string(),
      city: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  quantity: z.number(),
  priceAtAdd: z.number(),
  inStock: z.boolean().default(true),
});

export const cartSchema = z.object({
  id: z.string(),
  status: z.string(),
  items: z.array(cartItemSchema).default([]),
  total: z.number(),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;

export interface AddCartItemInput {
  listingId: number;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}

export async function getCart(): Promise<Cart> {
  const data = await api.get<Cart>("/users/me/cart");
  return cartSchema.parse(data);
}

export async function addCartItem(input: AddCartItemInput): Promise<Cart> {
  const data = await api.post<Cart>("/users/me/cart/items", input);
  return cartSchema.parse(data);
}

export async function updateCartItem(
  id: number,
  input: UpdateCartItemInput,
): Promise<Cart> {
  const data = await api.patch<Cart>(`/users/me/cart/items/${id}`, input);
  return cartSchema.parse(data);
}

export async function removeCartItem(id: number): Promise<void> {
  await api.delete(`/users/me/cart/items/${id}`);
}
