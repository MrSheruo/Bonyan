import { z } from "zod";
import { api } from "./client";

export const productImageSchema = z.object({
  url: z.string(),
  isPrimary: z.boolean().default(false),
});

export const productListingSchema = z.object({
  id: z.number(),
  productId: z.string(),
  storeId: z.string(),
  price: z.union([z.number(), z.string()]),
  inStock: z.boolean().default(true),
  effectivePrice: z.number(),
  hasDiscount: z.boolean().default(false),
  discountEndsAt: z.string().nullable().optional(),
  store: z.object({
    id: z.string(),
    name: z.string(),
    city: z.string().optional().default(""),
  }),
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  categoryId: z.string().optional(),
  brand: z.string().nullable().optional(),
  rawMaterial: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  tier: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  rating: z.union([z.number(), z.string()]).nullable().optional(),
  images: z.array(productImageSchema).default([]),
  listings: z.array(productListingSchema).default([]),
});

export const getProductsResponseSchema = z.object({
  items: z.array(productSchema),
  nextCursor: z.string().nullable(),
});

export type ProductImage = z.infer<typeof productImageSchema>;
export type ProductListing = z.infer<typeof productListingSchema>;
export type Product = z.infer<typeof productSchema>;
export type GetProductsResponse = z.infer<typeof getProductsResponseSchema>;

export interface ProductFilters {
  category?: string | string[];
  brand?: string;
  color?: string;
  size?: string;
  minRating?: number | string;
  search?: string;
  price?: number | string;
}

export async function getProducts(
  filters: ProductFilters = {},
  cursor?: string | null
): Promise<GetProductsResponse> {
  const query = new URLSearchParams();

  if (filters.category) {
    if (Array.isArray(filters.category)) {
      filters.category.forEach((cat) => {
        if (cat) query.append("category", cat);
      });
    } else {
      // If comma separated, append each or the whole string
      const cats = filters.category.split(",").filter(Boolean);
      if (cats.length > 0) {
        cats.forEach((cat) => query.append("category", cat));
      }
    }
  }

  if (filters.brand) {
    query.set("brand", filters.brand);
  }

  if (filters.color) {
    query.set("color", filters.color);
  }

  if (filters.size) {
    query.set("size", filters.size);
  }

  if (filters.minRating !== undefined && filters.minRating !== null && filters.minRating !== "") {
    query.set("minRating", String(filters.minRating));
  }

  if (filters.search) {
    query.set("search", filters.search);
  }

  if (cursor) {
    query.set("cursor", cursor);
  }

  const queryString = query.toString();
  const path = `/products${queryString ? `?${queryString}` : ""}`;

  const data = await api.get<GetProductsResponse>(path);
  return getProductsResponseSchema.parse(data);
}

export async function getProductById(id: string): Promise<Product> {
  const data = await api.get<unknown>(`/products/${encodeURIComponent(id)}`);
  return productSchema.parse(data);
}
