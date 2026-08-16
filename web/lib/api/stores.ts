import { z } from "zod";
import { api } from "./client";

export const storeSocialLinkSchema = z.object({
  id: z.number().optional(),
  storeId: z.string().optional(),
  platform: z.string(),
  url: z.string(),
});

export const storeDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  ownerName: z.string().nullable().optional(),
  contactNumber: z.string().nullable().optional(),
  rating: z.union([z.number(), z.string()]).nullable().optional(),
  verified: z.boolean().nullable().optional().default(false),
  socialLinks: z.array(storeSocialLinkSchema).optional().default([]),
});

export type StoreSocialLink = z.infer<typeof storeSocialLinkSchema>;
export type StoreDetail = z.infer<typeof storeDetailSchema>;

export async function getStore(id: string): Promise<StoreDetail> {
  const data = await api.get<StoreDetail>(`/stores/${id}`);
  return storeDetailSchema.parse(data);
}
