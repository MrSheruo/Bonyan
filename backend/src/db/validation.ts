import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
    categories,
    intents,
    stores,
    storeSocialLinks,
    products,
    productImages,
    listings,
    user,
    userIntents,
    addresses,
    paymentMethods,
    purchases,
} from "./schema.js";

// ===== categories =====
export const insertCategorySchema = createInsertSchema(categories).omit({
    id: true,
    createdAt: true,
});

// ===== intents =====
export const insertIntentSchema = createInsertSchema(intents);

// ===== stores =====
export const insertStoreSchema = createInsertSchema(stores, {
    rating: (s) => s.refine((v) => Number(v) >= 0 && Number(v) <= 5, "Rating must be 0-5"),
    contactNumber: (s) => s.regex(/^\+?[0-9]{7,15}$/, "Invalid phone number").optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });

// ===== store_social_links =====
export const insertStoreSocialLinkSchema = createInsertSchema(storeSocialLinks, {
    url: (s) => s.url(),
});

// ===== products =====
export const insertProductSchema = createInsertSchema(products, {
    rating: (s) => s.refine((v) => Number(v) >= 0 && Number(v) <= 5, "Rating must be 0-5"),
}).omit({
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
});

// ===== product_images =====
export const insertProductImageSchema = createInsertSchema(productImages, {
    url: (s) => s.url(),
    sortOrder: (s) => s.int().nonnegative(),
});

// ===== listings =====
export const insertListingSchema = createInsertSchema(listings, {
    price: (s) => s.refine((v) => Number(v) >= 0, "Price must be non-negative"),
}).omit({ createdAt: true, updatedAt: true });

// ===== users =====
export const insertUserSchema = createInsertSchema(user, {
    email: (s) => z.email(),
    budget: (s) => s.refine((v) => Number(v) >= 0, "Budget must be non-negative"),
    phone: (s) => s.regex(/^\+?[0-9]{7,15}$/, "Invalid phone number").optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, })
    .extend({
        password: z.string().min(8).max(72),
    });

// ===== user_intents =====
export const insertUserIntentSchema = createInsertSchema(userIntents);

// ===== addresses =====
export const insertAddressSchema = createInsertSchema(addresses, {
    postalCode: (s) => s.regex(/^[0-9]{3,10}$/, "Invalid postal code").optional(),
}).omit({ createdAt: true });

// ===== payment_methods =====
// Never accept raw card data here — only Paymob's returned token.
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods, {
    last4: (s) => s.regex(/^[0-9]{4}$/, "Must be 4 digits"),
}).omit({ createdAt: true });

// ===== purchases =====
export const insertPurchaseSchema = createInsertSchema(purchases, {
    quantity: (s) => s.int().positive(),
    unitPriceAtPurchase: (s) => s.refine((v) => Number(v) >= 0, "Price must be non-negative"),
    totalPrice: (s) => s.refine((v) => Number(v) >= 0, "Price must be non-negative"),
}).omit({ purchaseDate: true, createdAt: true });