import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db/db.js";
import { orders, orderItems, addresses, carts } from "@/db/schema.js";
import { NotFoundError, ForbiddenError, ConflictError } from "@/shared/errors.js";
import { getListingById, getOwnStore } from "@/listings/listings.service.js";
import { getCartWithItems } from "@/users/cart/cart.service.js";
import type { AddressInput } from "./orders.validation.js";

type RawItem = { listingId: number; quantity: number; priceAtAdd?: number };
type Issue = { listingId: number; type: "removed" | "out_of_stock" | "price_changed"; oldPrice?: number; newPrice?: number };
type PricedItem = {
    listingId: number;
    storeId: string;
    categoryId: string;
    quantity: number;
    unitPrice: number;
};

async function validateAndPriceItems(items: RawItem[]) {
    const pricedItems: PricedItem[] = [];
    const issues: Issue[] = [];

    for (const item of items) {
        let listing;
        try {
            listing = await getListingById(item.listingId);
        } catch (err) {
            if (err instanceof NotFoundError) {
                issues.push({ listingId: item.listingId, type: "removed" });
                continue;
            }
            throw err;
        }

        if (!listing.inStock) {
            issues.push({ listingId: item.listingId, type: "out_of_stock" });
            continue;
        }

        if (item.priceAtAdd !== undefined && item.priceAtAdd !== listing.effectivePrice) {
            issues.push({
                listingId: item.listingId,
                type: "price_changed",
                oldPrice: item.priceAtAdd,
                newPrice: listing.effectivePrice,
            });
        }

        pricedItems.push({
            listingId: listing.id,
            storeId: listing.storeId,
            categoryId: listing.product.categoryId,
            quantity: item.quantity,
            unitPrice: listing.effectivePrice,
        });
    }

    if (pricedItems.length === 0) {
        throw new ConflictError(
            items.length === 1
                ? "This item is out of stock"
                : "All items in your cart are out of stock — add in-stock items to continue"
        );
    }

    return { pricedItems, issues };
}

async function assertNotOwnListing(userId: string, listingId: number) {
    let listing;
    try {
        listing = await getListingById(listingId);
    } catch (err) {
        if (err instanceof NotFoundError) return; // handled later as "removed"
        throw err;
    }

    try {
        const store = await getOwnStore(userId);
        if (store.id === listing.storeId) {
            throw new ForbiddenError("You can't buy your own store's listing");
        }
    } catch (err) {
        if (err instanceof ForbiddenError && err.message === "You can't buy your own store's listing") {
            throw err;
        }
        // any other ForbiddenError here means "user has no store" — not a store owner, rule doesn't apply
    }
}

async function resolveOrderAddress(userId: string, input: AddressInput) {
    if ("addressId" in input) {
        const [address] = await db
            .select()
            .from(addresses)
            .where(and(eq(addresses.id, input.addressId), eq(addresses.userId, userId)));
        if (!address) throw new NotFoundError("Address not found");
        return address;
    }

    if (input.saveAddress) {
        const [saved] = await db
            .insert(addresses)
            .values({
                userId,
                label: input.addressLabel as "home" | "work" | "other" | undefined,
                line1: input.addressLine1,
                line2: input.addressLine2,
                city: input.addressCity,
                governorate: input.addressGovernorate,
                postalCode: input.addressPostalCode,
                isDefault: false,
            })
            .returning();
        if (!saved) throw new Error("Failed to save address");
        return saved;
    }

    return {
        label: input.addressLabel as "home" | "work" | "other" | undefined,
        line1: input.addressLine1,
        line2: input.addressLine2 ?? null,
        city: input.addressCity,
        governorate: input.addressGovernorate ?? null,
        postalCode: input.addressPostalCode ?? null,
    };
}

async function createOrderRecord(
    userId: string,
    address: {
        id?: number;
        label?: "home" | "work" | "other" | null | undefined;
        line1: string;
        line2?: string | null;
        city: string;
        governorate?: string | null;
        postalCode?: string | null;
    },
    pricedItems: PricedItem[],
    cartId: string | null
) {
    // TODO(paymob): before creating the order, this is where a payment
    // intent / order would be created with Paymob, and the order's
    // paymentStatus would start as "pending" until Paymob confirms.
    // For now, orders are created directly with no payment gate.

    return db.transaction(async (tx) => {
        const [order] = await tx
            .insert(orders)
            .values({
                userId,
                cartId,
                addressId: address.id ?? null,
                addressLabel: address.label ?? null,
                addressLine1: address.line1,
                addressLine2: address.line2 ?? null,
                addressCity: address.city,
                addressGovernorate: address.governorate ?? null,
                addressPostalCode: address.postalCode ?? null,
            })
            .returning();

        if (!order) throw new Error("Failed to create order");

        const orderItemRows = pricedItems.map((item) => ({
            orderId: order.id,
            listingId: item.listingId,
            storeId: item.storeId,
            categoryId: item.categoryId,
            quantity: item.quantity,
            unitPriceAtPurchase: String(item.unitPrice),
            totalPrice: String(Number((item.unitPrice * item.quantity).toFixed(2))),
        }));

        const items = await tx.insert(orderItems).values(orderItemRows).returning();

        return { ...order, items };
    });
}

export async function checkoutCart(userId: string, addressInput: AddressInput) {
    const cart = await getCartWithItems(userId);

    for (const item of cart.items) {
        await assertNotOwnListing(userId, item.listingId);
    }

    const rawItems: RawItem[] = cart.items.map((i) => ({
        listingId: i.listingId,
        quantity: i.quantity,
        priceAtAdd: i.priceAtAdd,
    }));

    const { pricedItems, issues } = await validateAndPriceItems(rawItems);
    const address = await resolveOrderAddress(userId, addressInput);
    const order = await createOrderRecord(userId, address, pricedItems, cart.id);

    await db.update(carts).set({ status: "converted", updatedAt: new Date() }).where(eq(carts.id, cart.id));

    return { order, issues };
}

export async function buyNow(userId: string, listingId: number, quantity: number, addressInput: AddressInput) {
    await assertNotOwnListing(userId, listingId);

    const { pricedItems, issues } = await validateAndPriceItems([{ listingId, quantity }]);
    const address = await resolveOrderAddress(userId, addressInput);
    const order = await createOrderRecord(userId, address, pricedItems, null);

    return { order, issues };
}

export async function getOrdersForUser(userId: string) {
    const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt));

    const withItems = await Promise.all(
        rows.map(async (order) => {
            const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
            return { ...order, items };
        })
    );

    return withItems;
}

export async function getOrderById(userId: string, orderId: string) {
    const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));

    if (!order) throw new NotFoundError("Order not found");

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return { ...order, items };
}

export async function updateOrderItemStatus(
    requester: { id: string; role: string },
    orderItemId: number,
    status: "pending" | "confirmed" | "on_the_way" | "delivered" | "cancelled"
) {
    const [item] = await db.select().from(orderItems).where(eq(orderItems.id, orderItemId));
    if (!item) throw new NotFoundError("Order item not found");

    if (requester.role === "store_owner") {
        const store = await getOwnStore(requester.id);
        if (store.id !== item.storeId) {
            throw new ForbiddenError("This order item doesn't belong to your store");
        }
    } else if (requester.role !== "admin" && requester.role !== "super_admin") {
        throw new ForbiddenError("You can't update order item status");
    }

    const [updated] = await db
        .update(orderItems)
        .set({ status, updatedAt: new Date() })
        .where(eq(orderItems.id, orderItemId))
        .returning();

    return updated;
}