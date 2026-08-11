import { eq } from "drizzle-orm";
import { db } from "@/db/db.js";
import { user } from "@/db/schema.js";
import { compressImage, uploadImage, deleteImage, pathFromPublicUrl } from "@/shared/storage/bucket.service.js";
import type { UpdateProfileInput } from "./users.validation.js";
import { findStoreByOwnerId } from "@/stores/stores.service.js";
import { getCartWithItems } from "./cart/cart.service.js";
import { auth } from "@/shared/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";

const AVATAR_BUCKET = "user-avatars";

export async function getMe(user: { id: string;[key: string]: unknown }) {
    const store = await findStoreByOwnerId(user.id);
    const cart = await getCartWithItems(user.id);
    return {
        ...user,
        store,
        cart,
    };
}

export async function updateUserProfile(
    userId: string,
    input: UpdateProfileInput,
    imageBuffer?: Buffer
) {
    let newImageUrl: string | undefined;

    if (imageBuffer) {
        const compressed = await compressImage(imageBuffer);
        const uploaded = await uploadImage(compressed, AVATAR_BUCKET);
        newImageUrl = uploaded.publicUrl;
    }

    const [currentUser] = await db.select().from(user).where(eq(user.id, userId));

    const [updated] = await db
        .update(user)
        .set({
            ...(input.name !== undefined && { name: input.name }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.maritalStatus !== undefined && { maritalStatus: input.maritalStatus }),
            ...(input.budget !== undefined && { budget: String(input.budget) }),
            ...(newImageUrl !== undefined && { image: newImageUrl }),

        })
        .where(eq(user.id, userId))
        .returning();

    if (!updated) throw new Error("Failed to update profile");

    if (newImageUrl && currentUser?.image) {
        try {
            const oldPath = pathFromPublicUrl(currentUser.image, AVATAR_BUCKET);
            await deleteImage(oldPath, AVATAR_BUCKET);
        } catch (err) {
            console.error("Failed to clean up old avatar:", err);
        }
    }

    return updated;
}

export async function deleteOwnAccount(userId: string, req: Request) {
    await db.update(user).set({ deletedAt: new Date() }).where(eq(user.id, userId));
    await auth.api.signOut({ headers: fromNodeHeaders(req.headers) });
}

export async function reactivateAccount(userId: string) {
    const [updated] = await db
        .update(user)
        .set({ deletedAt: null })
        .where(eq(user.id, userId))
        .returning();
    if (!updated) throw new Error("Failed to reactivate account");
    return updated;
}