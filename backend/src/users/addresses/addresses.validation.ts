import { z } from "zod";

export const createAddressSchema = z.object({
    label: z.enum(["home", "work", "other"]).default("home"),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    governorate: z.string().optional(),
    postalCode: z.string().optional(),
    isDefault: z.boolean().default(false),
});

export const updateAddressSchema = z.object({
    label: z.enum(["home", "work", "other"]).optional(),
    line1: z.string().min(1).optional(),
    line2: z.string().optional(),
    city: z.string().min(1).optional(),
    governorate: z.string().optional(),
    postalCode: z.string().optional(),
    isDefault: z.boolean().optional(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;