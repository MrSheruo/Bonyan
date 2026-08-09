import { eq, and, isNull, ilike } from "drizzle-orm";
import { db } from "@/db/db.js";
import { stores, storeSocialLinks, user } from "@/db/schema.js";
import { NotFoundError, ForbiddenError } from "@/shared/errors.js";
import type { CreateStoreInput, UpdateStoreInput } from "./stores.validation.js";

const isAdmin = (role: string) => role === "admin" || role === "super_admin";

async function findPossibleDuplicate(name: string, city: string) {
    const [match] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(and(ilike(stores.name, name), ilike(stores.city, city), isNull(stores.deletedAt)));

    return match?.id ?? null;
}


export async function createStore(
    input: CreateStoreInput,
    requester: { id: string; role: string }
) {

    const duplicateOf = await findPossibleDuplicate(input.name, input.city);


    const ownerId = isAdmin(requester.role) && input.ownerId ? input.ownerId : requester.id;
    let ownerName = input.ownerName;
    if (!ownerName) {
        const [owner] = await db.select({ name: user.name }).from(user).where(eq(user.id, ownerId));
        ownerName = owner?.name;
    }

    const { socialLinks, ownerId: _drop, ownerName: _drop2, ...storeFields } = input;

    return db.transaction(async (tx) => {
        const [store] = await tx
            .insert(stores)
            .values({ ...storeFields, ownerId, ownerName, duplicateOf, verified: isAdmin(requester.role) ? true : false })
            .returning();

        if (socialLinks?.length) {
            await tx.insert(storeSocialLinks).values(
                socialLinks.map((link) => ({
                    storeId: store?.id!,
                    platform: link.platform,
                    url: link.url,
                }))
            );
        }

        return store;
    });
}

async function assertOwnerOrAdmin(storeId: string, requester: { id: string; role: string }) {
    const [store] = await db
        .select()
        .from(stores)
        .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)));

    if (!store) throw new NotFoundError("Store not found");

    if (store.ownerId !== requester.id && !isAdmin(requester.role)) {
        throw new ForbiddenError("You don't have permission to modify this store");
    }

    return store;
}

export async function updateStore(
    id: string,
    input: UpdateStoreInput,
    requester: { id: string; role: string }
) {
    await assertOwnerOrAdmin(id, requester);

    const { socialLinks, ...storeFields } = input;

    return db.transaction(async (tx) => {
        const [store] = await tx
            .update(stores)
            .set({ ...storeFields, updatedAt: new Date() })
            .where(eq(stores.id, id))
            .returning();

        if (socialLinks?.length) {
            for (const link of socialLinks) {
                await tx
                    .insert(storeSocialLinks)
                    .values({ storeId: id, platform: link.platform, url: link.url })
                    .onConflictDoUpdate({
                        target: [storeSocialLinks.storeId, storeSocialLinks.platform],
                        set: { url: link.url },
                    });
            }
        }

        return store;
    });
}

export async function deleteStore(id: string, requester: { id: string; role: string }) {
    await assertOwnerOrAdmin(id, requester);

    const [store] = await db
        .update(stores)
        .set({ deletedAt: new Date() })
        .where(eq(stores.id, id))
        .returning();

    return store;
}

export async function getStoreById(id: string) {
    const [store] = await db
        .select()
        .from(stores)
        .where(and(eq(stores.id, id), isNull(stores.deletedAt)));

    if (!store) throw new NotFoundError("Store not found");

    const socialLinks = await getStoreSocialMediaLinks(store.id)

    return { ...store, socialLinks };
}

export async function getStoreByOwnerId(ownerId: string) {
    const [store] = await db
        .select()
        .from(stores)
        .where(and(eq(stores.ownerId, ownerId), isNull(stores.deletedAt)));

    if (!store) throw new NotFoundError("Store not found for this owner");

    const socialLinks = await getStoreSocialMediaLinks(store.id);
    return { ...store, socialLinks };
}

export async function findStoreByOwnerId(ownerId: string) {
    const [store] = await db
        .select()
        .from(stores)
        .where(and(eq(stores.ownerId, ownerId), isNull(stores.deletedAt)));

    if (!store) return null;

    const socialLinks = await getStoreSocialMediaLinks(store.id);
    return { ...store, socialLinks };
}

export async function getStoreSocialMediaLinks(storeId: string) {

    const socialLinks = await db
        .select()
        .from(storeSocialLinks)
        .where(eq(storeSocialLinks.storeId, storeId));

    return socialLinks || [];
}