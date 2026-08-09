import { z } from "zod";

export const addCartItemSchema = z.object({
    listingId: z.number().int().positive(),
    quantity: z.number().int().positive().default(1),
});

export const updateCartItemSchema = z.object({
    quantity: z.number().int().positive(),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;