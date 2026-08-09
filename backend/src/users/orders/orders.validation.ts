import { z } from "zod";

const addressIdSchema = z.object({
    addressId: z.number().int().positive(),
});

const rawAddressSchema = z.object({
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    addressCity: z.string().min(1),
    addressGovernorate: z.string().optional(),
    addressPostalCode: z.string().optional(),
    addressLabel: z.enum(["home", "work", "other"]).optional(),
    saveAddress: z.boolean().default(false),
});

export const addressInputSchema = z.union([addressIdSchema, rawAddressSchema]);

export const buyNowSchema = z.object({
    listingId: z.number().int().positive(),
    quantity: z.number().int().positive().default(1),
    address: addressInputSchema,
});

export const checkoutSchema = z.object({
    address: addressInputSchema,
});

export const updateOrderItemStatusSchema = z.object({
    status: z.enum(["pending", "confirmed", "on_the_way", "delivered", "cancelled"]),
});

export type AddressInput = z.infer<typeof addressInputSchema>;
export type BuyNowInput = z.infer<typeof buyNowSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type UpdateOrderItemStatusInput = z.infer<typeof updateOrderItemStatusSchema>;