import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { products } from "@/db/schema.js";

export const insertProductSchema = createInsertSchema(products, {
    name: (s) => s.min(1),
}).omit({
    id: true,
    rating: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
});

export const createProductSchema = insertProductSchema;
export const updateProductSchema = insertProductSchema.partial();

export const productIdParamSchema = z.object({
    id: z.string().uuid(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;


export const getProductsQuerySchema = z.object({
    category: z.string().uuid().optional(),
    brand: z.string().optional(),
    color: z.string().optional(),
    size: z.string().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    search: z.string().min(1).optional(),
    cursor: z.string().optional(),
});

export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>;