import { db } from "./db.js";
import { auth } from "@/shared/auth.js";
import {
    user,
    categories,
    products,
    productImages,
    stores,
    listings,
    discounts,
    addresses,
    paymentMethods,
    carts,
    cartItems,
    orders,
    orderItems,
} from "./schema.js";
import { eq } from "drizzle-orm";

// ---------- helpers ----------
const PASSWORD = "test0123";

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)]!;
}
function pickMany<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const out: T[] = [];
    for (let i = 0; i < n && copy.length; i++) {
        out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]!);
    }
    return out;
}
function picsum(seed: string, w = 640, h = 480) {
    return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}
function randomDateBetween(daysFromNow: number, spreadDays: number) {
    const base = Date.now() + daysFromNow * 86400000;
    return new Date(base + randInt(0, spreadDays) * 86400000);
}

// ---------- fixed seed data ----------
const CATEGORY_NAMES = [
    "Furniture", "Kitchenware", "Electronics", "Lighting", "Textiles",
    "Outdoor", "Decor", "Storage", "Bathroom", "Office", "Bedding",
    "Rugs & Carpets", "Wall Art", "Garden Tools", "Cleaning Supplies",
];
const BRANDS = ["Nova", "Atlas", "Cedar", "Lumen", "Terra", "Vantage", "Orbit", "Halcyon", "Ridge", "Marble & Co"];
const RAW_MATERIALS = ["Oak", "Steel", "Cotton", "Glass", "Ceramic", "Aluminum", "Bamboo", "Leather", "Plastic", "Marble"];
const COLORS = ["White", "Black", "Beige", "Walnut", "Grey", "Navy", "Olive", "Terracotta", "Cream", "Charcoal"];
const SIZES = ["Small", "Medium", "Large", "One Size", "XL"];
const UNITS = ["piece", "set", "pair", "box"];
const TIERS = ["economy", "standard", "luxury"] as const;
const PRODUCT_NOUNS = [
    "Chair", "Table", "Lamp", "Shelf", "Rug", "Vase", "Mirror", "Sofa", "Cabinet",
    "Desk", "Curtain", "Pillow", "Pot", "Frame", "Stool", "Basket", "Clock", "Bench",
];
const CITIES = ["Baghdad", "Basra", "Erbil", "Najaf", "Mosul", "Sulaymaniyah", "Karbala"];
const STORE_NAMES = ["Home & Co", "The Furnish Room", "Casa Living"];
const CARD_BRANDS = ["visa", "mastercard", "meeza"];
const ADDRESS_LABELS = ["home", "work", "other"] as const;
const ORDER_ITEM_STATUSES = ["pending", "confirmed", "on_the_way", "delivered", "cancelled"] as const;

async function main() {
    console.log("Seeding: users via Better Auth...");

    const userSpecs = [
        { name: "Super Admin", email: "superadmin@bonyan.test", role: "super_admin" },
        { name: "Admin One", email: "admin@bonyan.test", role: "admin" },
        { name: "Store Owner One", email: "owner1@bonyan.test", role: "store_owner" },
        { name: "Store Owner Two", email: "owner2@bonyan.test", role: "store_owner" },
        { name: "Store Owner Three", email: "owner3@bonyan.test", role: "store_owner" },
        { name: "Buyer One", email: "buyer1@bonyan.test", role: "user" },
        { name: "Buyer Two", email: "buyer2@bonyan.test", role: "user" },
    ] as const;

    const seededUsers: { id: string; role: string }[] = [];

    for (const spec of userSpecs) {
        const result = await auth.api.signUpEmail({
            body: { email: spec.email, password: PASSWORD, name: spec.name },
        });
        const userId = result.user.id;
        await db.update(user).set({ role: spec.role }).where(eq(user.id, userId));
        seededUsers.push({ id: userId, role: spec.role });
        console.log(`  created ${spec.email} (${spec.role})`);
    }

    const storeOwnerIds = seededUsers.filter((u) => u.role === "store_owner").map((u) => u.id);
    const buyerIds = seededUsers.filter((u) => u.role === "user" || u.role === "store_owner").map((u) => u.id);
    const allUserIds = seededUsers.map((u) => u.id);

    // ---------- categories ----------
    console.log("Seeding: categories...");
    const insertedCategories = await db
        .insert(categories)
        .values(
            CATEGORY_NAMES.map((name) => ({
                name,
                imageUrl: picsum(`cat-${name}`, 400, 300),
            }))
        )
        .returning({ id: categories.id });

    // ---------- stores ----------
    console.log("Seeding: stores...");
    const insertedStores = await db
        .insert(stores)
        .values(
            storeOwnerIds.map((ownerId, i) => ({
                name: STORE_NAMES[i]!,
                city: pick(CITIES),
                location: `${pick(CITIES)} District ${randInt(1, 20)}`,
                ownerName: userSpecs.find((_, idx) => storeOwnerIds[idx] === ownerId)?.name ?? "Owner",
                contactNumber: `+964 7${randInt(10000000, 99999999)}`,
                verified: true,
                ownerId,
            }))
        )
        .returning({ id: stores.id });

    // ---------- products ----------
    console.log("Seeding: products...");
    const PRODUCT_COUNT = 90;
    const productRows = Array.from({ length: PRODUCT_COUNT }).map((_, i) => {
        const noun = pick(PRODUCT_NOUNS);
        const brand = pick(BRANDS);
        return {
            name: `${brand} ${pick(COLORS)} ${noun} ${i}`,
            categoryId: pick(insertedCategories).id,
            brand,
            rawMaterial: pick(RAW_MATERIALS),
            color: pick(COLORS),
            size: pick(SIZES),
            unit: pick(UNITS),
            tier: pick(TIERS),
            description: `A ${pick(RAW_MATERIALS).toLowerCase()} ${noun.toLowerCase()} from the ${brand} collection.`,
        };
    });
    const insertedProducts = await db.insert(products).values(productRows).returning({
        id: products.id,
        categoryId: products.categoryId,
    });

    // ---------- product images (1-2 per product) ----------
    console.log("Seeding: product images...");
    const imageRows = insertedProducts.flatMap((p) => {
        const count = randInt(1, 2);
        return Array.from({ length: count }).map((_, idx) => ({
            productId: p.id,
            url: picsum(`${p.id}-${idx}`),
            isPrimary: idx === 0,
            sortOrder: idx,
        }));
    });
    await db.insert(productImages).values(imageRows);

    // ---------- listings ----------
    console.log("Seeding: listings...");
    const listingPairs = new Set<string>();
    const listingRows: { productId: string; storeId: string; price: string; inStock: boolean }[] = [];

    for (const product of insertedProducts) {
        const storeCount = randInt(1, insertedStores.length);
        const chosenStores = pickMany(insertedStores, storeCount);
        for (const store of chosenStores) {
            const key = `${product.id}:${store.id}`;
            if (listingPairs.has(key)) continue;
            listingPairs.add(key);
            listingRows.push({
                productId: product.id,
                storeId: store.id,
                price: String(randInt(5, 500)),
                inStock: Math.random() > 0.1,
            });
        }
    }

    const insertedListings = await db.insert(listings).values(listingRows).returning({
        id: listings.id,
        productId: listings.productId,
        storeId: listings.storeId,
        price: listings.price,
    });

    // ---------- discounts ----------
    console.log("Seeding: discounts...");
    const discountTargets = pickMany(insertedListings, Math.min(40, insertedListings.length));
    const discountRows = discountTargets.map((l) => {
        const bucket = pick(["expired", "active", "upcoming"] as const);
        let startsAt: Date, endsAt: Date;
        if (bucket === "expired") {
            startsAt = randomDateBetween(-30, 10);
            endsAt = randomDateBetween(-10, 5);
        } else if (bucket === "active") {
            startsAt = randomDateBetween(-10, 5);
            endsAt = randomDateBetween(5, 15);
        } else {
            startsAt = randomDateBetween(5, 10);
            endsAt = randomDateBetween(15, 20);
        }
        return {
            listingId: l.id,
            percentage: String(randInt(5, 60)),
            startsAt,
            endsAt,
        };
    });
    await db.insert(discounts).values(discountRows);

    // ---------- addresses (returning — needed for order snapshots) ----------
    console.log("Seeding: addresses...");
    const ADDRESS_COUNT = 90;
    const addressRows = Array.from({ length: ADDRESS_COUNT }).map(() => ({
        userId: pick(allUserIds),
        label: pick(ADDRESS_LABELS),
        line1: `${randInt(1, 200)} ${pick(["Main St", "Palm Ave", "River Rd", "Market St"])}`,
        line2: Math.random() > 0.5 ? `Apt ${randInt(1, 40)}` : null,
        city: pick(CITIES),
        governorate: pick(CITIES),
        postalCode: String(randInt(10000, 99999)),
        isDefault: Math.random() > 0.7,
    }));
    const insertedAddresses = await db.insert(addresses).values(addressRows).returning({
        id: addresses.id,
        userId: addresses.userId,
        label: addresses.label,
        line1: addresses.line1,
        line2: addresses.line2,
        city: addresses.city,
        governorate: addresses.governorate,
        postalCode: addresses.postalCode,
    });

    // ---------- payment methods ----------
    console.log("Seeding: payment methods...");
    const PM_COUNT = 90;
    const pmRows = Array.from({ length: PM_COUNT }).map(() => ({
        userId: pick(allUserIds),
        paymobToken: `tok_${randInt(100000, 999999)}`,
        cardBrand: pick(CARD_BRANDS),
        last4: String(randInt(1000, 9999)),
        isDefault: Math.random() > 0.7,
    }));
    await db.insert(paymentMethods).values(pmRows);

    // ---------- carts + cart_items ----------
    console.log("Seeding: carts...");
    const cartRows = buyerIds.map((userId) => ({ userId, status: "active" as const }));
    const insertedCarts = await db.insert(carts).values(cartRows).returning({
        id: carts.id,
        userId: carts.userId,
    });

    console.log("Seeding: cart items...");
    const cartItemRows: {
        cartId: string;
        listingId: number;
        quantity: number;
        priceAtAdd: string;
    }[] = [];

    for (const cart of insertedCarts) {
        const itemCount = randInt(1, 3);
        const chosenListings = pickMany(insertedListings, itemCount);
        for (const listing of chosenListings) {
            cartItemRows.push({
                cartId: cart.id,
                listingId: listing.id,
                quantity: randInt(1, 3),
                priceAtAdd: listing.price, // already a string (numeric column)
            });
        }
    }
    await db.insert(cartItems).values(cartItemRows);

    // ---------- orders + order_items ----------
    console.log("Seeding: orders...");
    const ORDER_COUNT = 20;

    for (let i = 0; i < ORDER_COUNT; i++) {
        const buyerId = pick(buyerIds);
        const address = pick(insertedAddresses);

        const [order] = await db
            .insert(orders)
            .values({
                userId: buyerId,
                cartId: null,
                addressId: address.id,
                addressLabel: address.label,
                addressLine1: address.line1,
                addressLine2: address.line2,
                addressCity: address.city,
                addressGovernorate: address.governorate,
                addressPostalCode: address.postalCode,
            })
            .returning({ id: orders.id });

        const itemCount = randInt(1, 3);
        const chosenListings = pickMany(insertedListings, itemCount);

        const orderItemRows = chosenListings.map((listing) => {
            const product = insertedProducts.find((p) => p.id === listing.productId)!;
            const quantity = randInt(1, 4);
            const unitPrice = Number(listing.price);
            return {
                orderId: order!.id,
                listingId: listing.id,
                storeId: listing.storeId,
                categoryId: product.categoryId,
                quantity,
                unitPriceAtPurchase: listing.price,
                totalPrice: String(Number((unitPrice * quantity).toFixed(2))),
                status: pick(ORDER_ITEM_STATUSES),
            };
        });

        await db.insert(orderItems).values(orderItemRows);
    }

    console.log("Seed complete.");
    console.log(`Login: any of the 7 emails above, password "${PASSWORD}"`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Seed failed:", err);
        process.exit(1);
    });