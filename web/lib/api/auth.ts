import { z } from "zod";
import { api, ApiError } from "./client";

// Input Schemas
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// Response Schemas
export const cartItemSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    listingId: z.union([z.number(), z.string()]).optional(),
    productId: z.string().optional(),
    name: z.string().optional(),
    image: z.string().nullable().optional(),
    brand: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    size: z.string().nullable().optional(),
    unit: z.string().nullable().optional(),
    tier: z.string().nullable().optional(),
    quantity: z.number().optional(),
    priceAtAdd: z.union([z.number(), z.string()]).optional(),
    inStock: z.boolean().optional(),
  })
  .passthrough();

export const cartSchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    items: z.array(cartItemSchema).optional().default([]),
    total: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough()
  .nullable()
  .optional();

export const storeSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    rating: z.union([z.number(), z.string()]).nullable().optional(),
    city: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

export const userSchema = z
  .object({
    id: z.string(),
    name: z.string().optional().default("User"),
    email: z.string().optional().default(""),
    emailVerified: z.boolean().nullable().optional(),
    image: z.string().nullable().optional(),
    createdAt: z.union([z.string(), z.date()]).nullable().optional(),
    updatedAt: z.union([z.string(), z.date()]).nullable().optional(),
    role: z.string().nullable().optional(),
    banned: z.boolean().nullable().optional(),
    banReason: z.string().nullable().optional(),
    banExpires: z.union([z.string(), z.date()]).nullable().optional(),
    budget: z.union([z.number(), z.string()]).nullable().optional(),
    maritalStatus: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    store: storeSchema,
    cart: cartSchema,
  })
  .passthrough();

export type User = z.infer<typeof userSchema>;

export const authResponseSchema = z
  .object({
    user: z.record(z.string(), z.unknown()).optional(),
    token: z.string().optional(),
  })
  .passthrough();

export type AuthResponse = z.infer<typeof authResponseSchema>;

// API Functions
export async function registerUser(
  input: RegisterInput,
): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>("/auth/register", input);
  return authResponseSchema.parse(data);
}

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>("/auth/login", input);
  return authResponseSchema.parse(data);
}

export async function logoutUser(): Promise<{ message: string }> {
  return api.post<{ message: string }>("/auth/logout");
}

export async function getMe(): Promise<User | null> {
  try {
    const data = await api.get<User>("/users/me");
    if (!data) return null;
    const parsed = userSchema.safeParse(data);
    if (parsed.success) {
      return parsed.data as User;
    }
    console.warn("userSchema validation warning:", parsed.error);
    return data as User;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 409)) {
      return null;
    }
    console.warn("getMe failed unexpectedly:", error);
    return null;
  }
}
