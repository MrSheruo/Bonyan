import { z } from "zod";
import { createProductSchema } from "@/products/products.validation.js";

export const createListingSchema = z
    .object({
        productId: z.string().uuid().optional(),
        price: z.coerce.number().nonnegative(),
        inStock: z.coerce.boolean().default(true),
    })
    .merge(createProductSchema.partial())
    .superRefine((data, ctx) => {
        if (!data.productId) {
            if (!data.name) {
                ctx.addIssue({ code: "custom", path: ["name"], message: "Required when creating a new product" });
            }
            if (!data.categoryId) {
                ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Required when creating a new product" });
            }
        }
    });

export const updateListingSchema = z.object({
    price: z.coerce.number().nonnegative().optional(),
    inStock: z.coerce.boolean().optional(),
});

export const listingIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const compareQuerySchema = z.object({
    productId: z.string().uuid(),
});

export const createDiscountSchema = z
    .object({
        percentage: z.coerce.number().positive().max(100),
        startsAt: z.coerce.date().optional(),
        endsAt: z.coerce.date(),
    })
    .refine((d) => !d.startsAt || d.endsAt > d.startsAt, {
        message: "endsAt must be after startsAt",
        path: ["endsAt"],
    });

export const updateDiscountSchema = z.object({
    percentage: z.coerce.number().positive().max(100).optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
});

export const discountParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
    discountId: z.string().uuid(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;