import { z } from "zod";

export const updateProfileSchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    maritalStatus: z.enum(["single", "married"]).optional(),
    budget: z.coerce.number().min(0).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;