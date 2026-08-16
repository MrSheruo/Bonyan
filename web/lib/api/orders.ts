import { z } from "zod";
import { api } from "./client";
import { productListingSchema } from "./products";

export const addressIdInputSchema = z.object({
  addressId: z.number().int().positive(),
});

export const rawAddressInputSchema = z.object({
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  addressCity: z.string().min(1),
  addressGovernorate: z.string().optional(),
  addressPostalCode: z.string().optional(),
  addressLabel: z.enum(["home", "work", "other"]).optional(),
  saveAddress: z.boolean().default(false),
});

export const addressInputSchema = z.union([
  addressIdInputSchema,
  rawAddressInputSchema,
]);

export const orderItemSchema = z.object({
  id: z.number(),
  orderId: z.string(),
  listingId: z.number(),
  storeId: z.string(),
  categoryId: z.string(),
  quantity: z.number(),
  unitPriceAtPurchase: z.union([z.number(), z.string()]).pipe(z.coerce.number()),
  totalPrice: z.union([z.number(), z.string()]).pipe(z.coerce.number()),
  status: z
    .enum(["pending", "confirmed", "on_the_way", "delivered", "cancelled"])
    .default("pending"),
  listing: productListingSchema.optional(),
});

export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  cartId: z.string().nullable().optional(),
  addressId: z.number().nullable().optional(),
  addressLabel: z
    .enum(["home", "work", "other"])
    .nullable()
    .optional(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable().optional(),
  addressCity: z.string(),
  addressGovernorate: z.string().nullable().optional(),
  addressPostalCode: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]).optional(),
  items: z.array(orderItemSchema).default([]),
});

export const buyNowResponseSchema = z.object({
  order: orderSchema,
  issues: z
    .array(
      z.object({
        listingId: z.number(),
        type: z.enum(["removed", "out_of_stock", "price_changed"]),
        oldPrice: z.number().optional(),
        newPrice: z.number().optional(),
      })
    )
    .default([]),
});

export type AddressIdInput = z.infer<typeof addressIdInputSchema>;
export type RawAddressInput = z.infer<typeof rawAddressInputSchema>;
export type AddressInput = z.infer<typeof addressInputSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type Order = z.infer<typeof orderSchema>;
export type BuyNowResponse = z.infer<typeof buyNowResponseSchema>;

export async function buyNow(input: {
  listingId: number;
  quantity: number;
  address: AddressInput;
}): Promise<BuyNowResponse> {
  const data = await api.post<unknown>("/users/me/orders", input);
  return buyNowResponseSchema.parse(data);
}
