import { z } from "zod";
import { api } from "./client";

const LABELS = ["home", "work", "other"] as const;

export const addressSchema = z.object({
  id: z.union([z.number(), z.string()]),
  userId: z.union([z.number(), z.string()]).optional(),
  label: z.enum(LABELS).default("home"),
  line1: z.string().min(1),
  line2: z.string().nullable().optional(),
  city: z.string().min(1),
  governorate: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});

export const createAddressSchema = z.object({
  label: z.enum(LABELS).default("home"),
  line1: z.string().trim().min(1, "Street address is required"),
  line2: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  city: z.string().trim().min(1, "City is required"),
  governorate: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  postalCode: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export type Address = z.infer<typeof addressSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type AddressLabel = (typeof LABELS)[number];

export async function getAddresses(): Promise<Address[]> {
  const data = await api.get<unknown>("/users/me/addresses");
  if (Array.isArray(data)) {
    return data.map((item) => addressSchema.parse(item));
  }
  return [];
}

export async function addAddress(
  input: CreateAddressInput
): Promise<Address> {
  const data = await api.post<unknown>("/users/me/addresses", input);
  return addressSchema.parse(data);
}

export async function updateAddress(
  id: number | string,
  input: UpdateAddressInput
): Promise<Address> {
  const data = await api.patch<unknown>(`/users/me/addresses/${id}`, input);
  return addressSchema.parse(data);
}

export async function removeAddress(id: number | string): Promise<void> {
  await api.delete<void>(`/users/me/addresses/${id}`);
}
