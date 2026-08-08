import { eq, and, isNull, lte, gte } from "drizzle-orm";
import { db } from "@/db/db.js";
import { listings, products, stores, discounts } from "@/db/schema.js";
import {
    compressImage,
    deleteImage,
    uploadImage,
} from "@/shared/storage/bucket.service.js";
import { insertProductWithImages } from "@/products/products.service.js";
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from "@/shared/errors.js";
import type {
    CreateListingInput,
    UpdateListingInput,
    CreateDiscountInput,
    UpdateDiscountInput,
} from "./listings.validation.js";
import { isProductExist } from "@/products/products.check.js";

async function assertNoDuplicateListing(productId: string, storeId: string) {
    const [existing] = await db
        .select({ id: listings.id })
        .from(listings)
        .where(
            and(
                eq(listings.productId, productId),
                eq(listings.storeId, storeId),
                isNull(listings.deletedAt)
            )
        );

    if (existing) {
        throw new ConflictError(
            "You already have a listing for this product — edit that one, or add a discount to it instead"
        );
    }
}

async function getOwnStore(userId: string) {
    const [store] = await db
        .select()
        .from(stores)
        .where(and(eq(stores.ownerId, userId), isNull(stores.deletedAt)));

    if (!store) throw new ForbiddenError("You don't own a store");
    if (!store.verified) throw new ForbiddenError("Your store isn't verified yet");
    return store;
}

async function getOwnedListing(listingId: number, userId: string) {
    const [row] = await db
        .select({ listing: listings, store: stores })
        .from(listings)
        .innerJoin(stores, eq(listings.storeId, stores.id))
        .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)));

    if (!row) throw new NotFoundError("Listing not found");
    if (row.store.ownerId !== userId) throw new ForbiddenError("You don't own this listing");
    return row;
}

export async function createListing(
    input: CreateListingInput,
    imageBuffers: Buffer[],
    requester: { id: string }
) {
    const store = await getOwnStore(requester.id);
    const existProduct = await isProductExist(input.productId!);
    if (!existProduct) {
        throw new ValidationError("Product not found");
    }

    assertNoDuplicateListing(input.productId!, store.id);
    // if (!input.productId) {
    // throw new ValidationError("No product ID provided");
    // TODO Similarity
    // const similar = await findSimilarProduct(input.name!, input.categoryId!);
    // if (similar) {
    //     throw new ConflictError(
    //         `A similar product already exists: "${similar.name}". Create a listing for it instead, or resubmit with productId to confirm a new product is intended.`,
    //     );   
    // }
    // }

    // if (imageBuffers.length === 0) {
    //     throw new ConflictError("At least one image is required when creating a new product");
    // }
    const uploadedPaths: string[] = [];

    try {
        let uploaded: { path: string; publicUrl: string }[] = [];
        if (imageBuffers.length > 0) {
            uploaded = await Promise.all(
                imageBuffers.map(async (buffer) => {
                    const compressed = await compressImage(buffer);
                    const result = await uploadImage(compressed);
                    uploadedPaths.push(result.path);
                    return result;
                })
            );
        }

        return await db.transaction(async (tx) => {
            let productId = input.productId;

            if (!productId) {
                const { price, inStock, productId: _drop, ...productFields } = input;
                const product = await insertProductWithImages(tx, productFields as any, uploaded);
                productId = product?.id!;
            }
            const [listing] = await tx
                .insert(listings)
                .values({
                    productId,
                    storeId: store.id,
                    price: String(input.price),
                    inStock: input.inStock,
                })
                .returning();

            return listing;
        });
    } catch (err) {
        await Promise.all(uploadedPaths.map((path) => deleteImage(path)));
        throw err;
    }
}

export async function updateListing(id: number, input: UpdateListingInput, requester: { id: string }) {
    await getOwnedListing(id, requester.id);

    const [listing] = await db
        .update(listings)
        .set({
            ...(input.price !== undefined && { price: String(input.price) }),
            ...(input.inStock !== undefined && { inStock: input.inStock }),
            updatedAt: new Date(),
        })
        .where(eq(listings.id, id))
        .returning();

    return listing;
}

export async function deleteListing(id: number, requester: { id: string }) {
    await getOwnedListing(id, requester.id);

    const [listing] = await db
        .update(listings)
        .set({ deletedAt: new Date() })
        .where(eq(listings.id, id))
        .returning();

    return listing;
}

export async function restoreListing(id: number, requester: { id: string }) {
    const [row] = await db
        .select({ listing: listings, store: stores })
        .from(listings)
        .innerJoin(stores, eq(listings.storeId, stores.id))
        .where(eq(listings.id, id));

    if (!row) throw new NotFoundError("Listing not found");
    if (row.store.ownerId !== requester.id) throw new ForbiddenError("You don't own this listing");
    if (!row.listing.deletedAt) throw new ConflictError("Listing is not deleted");

    try {
        const [listing] = await db
            .update(listings)
            .set({ deletedAt: null, updatedAt: new Date() })
            .where(eq(listings.id, id))
            .returning();
        return listing;
    } catch (err: any) {
        if (err.code === "23505") {
            throw new ConflictError(
                "You already have an active listing for this product — edit that one instead"
            );
        }
        throw err;
    }
}

async function getActiveDiscount(listingId: number) {
    const [discount] = await db
        .select()
        .from(discounts)
        .where(
            and(
                eq(discounts.listingId, listingId),
                lte(discounts.startsAt, new Date()),
                gte(discounts.endsAt, new Date())
            )
        );
    return discount ?? null;
}

function withEffectivePrice(price: string, discount: { percentage: string } | null) {
    const base = Number(price);
    if (!discount) return { effectivePrice: base, hasDiscount: false };
    const effectivePrice = Number((base * (1 - Number(discount.percentage) / 100)).toFixed(2));
    return { effectivePrice, hasDiscount: true };
}

export async function getListingById(id: number) {

    const [row] = await db
        .select({ listing: listings, product: products, store: stores })
        .from(listings)
        .innerJoin(products, eq(listings.productId, products.id))
        .innerJoin(stores, eq(listings.storeId, stores.id))
        .where(and(eq(listings.id, id), isNull(listings.deletedAt)));

    if (!row) throw new NotFoundError("Listing not found");

    const discount = await getActiveDiscount(id);

    return {
        ...row.listing,
        product: row.product,
        store: row.store,
        ...withEffectivePrice(row.listing.price, discount),
        discount,
    };
}

export async function compareListings(productId: string) {
    const rows = await db
        .select({ listing: listings, store: stores })
        .from(listings)
        .innerJoin(stores, eq(listings.storeId, stores.id))
        .where(and(eq(listings.productId, productId), isNull(listings.deletedAt)));

    const withDiscounts = await Promise.all(
        rows.map(async ({ listing, store }) => {
            const discount = await getActiveDiscount(listing.id);
            return {
                listingId: listing.id,
                storeId: store.id,
                storeName: store.name,
                price: Number(listing.price),
                ...withEffectivePrice(listing.price, discount),
                discountEndsAt: discount?.endsAt ?? null,
            };
        })
    );

    return withDiscounts.sort((a, b) => a.effectivePrice - b.effectivePrice);
}

export async function createDiscount(
    listingId: number,
    input: CreateDiscountInput,
    requester: { id: string }
) {
    await getOwnedListing(listingId, requester.id);

    const [overlap] = await db
        .select({ id: discounts.id })
        .from(discounts)
        .where(and(eq(discounts.listingId, listingId), gte(discounts.endsAt, new Date())));

    if (overlap) {
        throw new ConflictError("This listing already has an active or upcoming discount");
    }

    const [discount] = await db
        .insert(discounts)
        .values({
            listingId,
            percentage: String(input.percentage),
            startsAt: input.startsAt ?? new Date(),
            endsAt: input.endsAt,
        })
        .returning();

    return discount;
}

export async function updateDiscount(
    listingId: number,
    discountId: string,
    input: UpdateDiscountInput,
    requester: { id: string }
) {
    await getOwnedListing(listingId, requester.id);

    const [existing] = await db
        .select()
        .from(discounts)
        .where(and(eq(discounts.id, discountId), eq(discounts.listingId, listingId)));

    if (!existing) throw new NotFoundError("Discount not found");

    const [discount] = await db
        .update(discounts)
        .set({
            ...(input.percentage !== undefined && { percentage: String(input.percentage) }),
            ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
            ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
        })
        .where(eq(discounts.id, discountId))
        .returning();

    return discount;
}

export async function deleteDiscount(listingId: number, discountId: string, requester: { id: string }) {
    await getOwnedListing(listingId, requester.id);

    const [discount] = await db
        .delete(discounts)
        .where(and(eq(discounts.id, discountId), eq(discounts.listingId, listingId)))
        .returning();

    if (!discount) throw new NotFoundError("Discount not found");
    return discount;
}

export async function getListingsForProduct(productId: string) {
    const rows = await db
        .select({
            listing: listings,
            store: stores
        })
        .from(listings)
        .innerJoin(stores, eq(listings.storeId, stores.id))
        .where(and(eq(listings.productId, productId), isNull(listings.deletedAt)));

    console.log(rows);

    return Promise.all(
        rows.map(async ({ listing, store }) => {
            const discount = await getActiveDiscount(listing.id);
            return {
                ...listing,
                store,
                ...withEffectivePrice(listing.price, discount),
                discountEndsAt: discount?.endsAt ?? null,
            };
        })
    );
}