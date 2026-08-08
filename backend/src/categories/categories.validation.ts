import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { categories } from "@/db/schema.js";

export const createCategorySchema = createInsertSchema(categories, {
    name: (s) => s.min(1),
    imageUrl: (s) => s.url().optional(),
}).omit({ id: true, createdAt: true });

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamSchema = z.object({
    id: z.string().uuid(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;