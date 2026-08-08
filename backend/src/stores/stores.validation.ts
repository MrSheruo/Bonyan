import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { stores } from "@/db/schema.js";

const socialLinkSchema = z.object({
    platform: z.enum(["whatsapp", "facebook", "instagram"]),
    url: z.string().url(),
});

export const createStoreSchema = createInsertSchema(stores, {
    name: (s) => s.min(1),
    city: (s) => s.min(1),
    contactNumber: (s) => s.regex(/^\+?[0-9]{7,15}$/, "Invalid phone number").optional(),
    location: (s) => s.url().optional(),
})
    .omit({ id: true, rating: true, verified: true, deletedAt: true, createdAt: true, updatedAt: true })
    .extend({
        ownerId: z.string().uuid().optional(),
        ownerName: z.string().optional(),
        socialLinks: z.array(socialLinkSchema).optional(),
    });

export const updateStoreSchema = createStoreSchema.omit({ ownerId: true }).partial();

export const storeIdParamSchema = z.object({
    id: z.string().uuid(),
});

export const ownerIdParamSchema = z.object({
    ownerId: z.string().uuid(),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;