import { sql, relations } from "drizzle-orm";
import {
    pgTable,
    pgEnum,
    uuid,
    text,
    smallint,
    bigint,
    numeric,
    boolean,
    timestamp,
    integer,
    index,
    uniqueIndex,
    primaryKey,
    char,
    customType,
    check,
} from "drizzle-orm/pg-core";

// =========================================================
// Enums
// =========================================================
export const purchaseStatus = pgEnum("purchase_status", [
    "pending",
    "confirmed",
    "on_the_way",
    "delivered",
    "cancelled",
]);
export const productTier = pgEnum("product_tier", ["economy", "standard", "luxury"]);
export const socialPlatform = pgEnum("social_platform", ["whatsapp", "facebook", "instagram"]);
export const addressLabel = pgEnum("address_label", ["home", "work", "other"]);
export const maritalStatusEnum = pgEnum("marital_status", ["single", "married"]);
export const cartStatus = pgEnum("cart_status", ["active", "converted", "abandoned"]);

const tsvector = customType<{ data: string }>({
    dataType() {
        return "tsvector";
    },
});

// =========================================================
// categories
// =========================================================
export const categories = pgTable("categories", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// =========================================================
// intents
// =========================================================
export const intents = pgTable("intents", {
    id: smallint("id").generatedAlwaysAsIdentity().primaryKey(),
    name: text("name").notNull().unique(),
});

// =========================================================
// stores
// =========================================================
export const stores = pgTable(
    "stores",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: text("name").notNull(),
        location: text("location"),
        city: text("city").notNull(),
        ownerName: text("owner_name"),
        contactNumber: text("contact_number"),
        rating: numeric("rating", { precision: 2, scale: 1 }).default("0"),
        verified: boolean("verified").notNull().default(false),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
        ownerId: uuid("owner_id")
            .notNull()
            .references(() => user.id, { onDelete: "restrict" }),
        duplicateOf: uuid("duplicate_of").references((): any => stores.id, { onDelete: "set null" }),
    },
    (table) => ({
        cityIdx: index("stores_city_idx").on(table.city),
        ownerIdIdx: uniqueIndex("stores_owner_id_unique_idx").on(table.ownerId),
    })
);

export const storeSocialLinks = pgTable(
    "store_social_links",
    {
        id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
        storeId: uuid("store_id")
            .notNull()
            .references(() => stores.id, { onDelete: "cascade" }),
        platform: socialPlatform("platform").notNull(),
        url: text("url").notNull(),
    },
    (table) => ({
        storeIdIdx: index("store_social_links_store_id_idx").on(table.storeId),
        storePlatformUnique: uniqueIndex("store_social_links_store_platform_unique").on(
            table.storeId,
            table.platform
        ),
    })
);

// =========================================================
// products
// =========================================================
export const products = pgTable(
    "products",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: text("name").notNull(),
        categoryId: uuid("category_id")
            .notNull()
            .references(() => categories.id, { onDelete: "restrict" }),
        brand: text("brand"),
        rawMaterial: text("raw_material"),
        color: text("color"),
        size: text("size"),
        unit: text("unit").notNull().default("piece"),
        tier: productTier("tier").notNull().default("standard"),
        description: text("description"),
        rating: numeric("rating", { precision: 2, scale: 1 }).default("0"),
        searchVector: tsvector("search_vector").generatedAlwaysAs(
            (): any =>
                sql`to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(description, ''))`
        ),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        categoryIdIdx: index("products_category_id_idx").on(table.categoryId),
        searchVectorIdx: index("products_search_vector_idx").using("gin", table.searchVector),
        createdAtIdx: index("products_created_at_idx").on(table.createdAt.desc(), table.id.desc()),
        ratingIdIdx: index("products_rating_id_idx")
            .on(table.rating.desc(), table.id.desc())
            .where(sql`deleted_at IS NULL`),
    })
);

export const productImages = pgTable(
    "product_images",
    {
        id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
        productId: uuid("product_id")
            .notNull()
            .references(() => products.id, { onDelete: "cascade" }),
        url: text("url").notNull(),
        isPrimary: boolean("is_primary").notNull().default(false),
        sortOrder: integer("sort_order").notNull().default(0),
    },
    (table) => ({
        productIdIdx: index("product_images_product_id_idx").on(table.productId),
    })
);

// =========================================================
// listings
// =========================================================
export const listings = pgTable(
    "listings",
    {
        id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
        productId: uuid("product_id")
            .notNull()
            .references(() => products.id, { onDelete: "restrict" }),
        storeId: uuid("store_id")
            .notNull()
            .references(() => stores.id, { onDelete: "restrict" }),
        price: numeric("price", { precision: 12, scale: 2 }).notNull(),
        inStock: boolean("in_stock").notNull().default(true),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
    },
    (table) => ({
        productIdIdx: index("listings_product_id_idx").on(table.productId),
        storeIdIdx: index("listings_store_id_idx").on(table.storeId),
        productStoreUnique: uniqueIndex("listings_product_store_unique")
            .on(table.productId, table.storeId)
            .where(sql`deleted_at IS NULL`),
    })
);

// =========================================================
// user (Better Auth core table — replaces old `users`)
// =========================================================
export const user = pgTable("user", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),

    // admin plugin fields — this IS your soft-delete mechanism
    role: text("role"),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),

    // your application fields
    budget: numeric("budget", { precision: 12, scale: 2 }).notNull().default("0"),
    maritalStatus: maritalStatusEnum("marital_status"),
    phone: text("phone"),
});
export const session = pgTable(
    "session",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        impersonatedBy: text("impersonated_by"),
    },
    (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
    "account",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
    "verification",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));

// =========================================================
// user_intents
// =========================================================
export const userIntents = pgTable(
    "user_intents",
    {
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        intentId: smallint("intent_id")
            .notNull()
            .references(() => intents.id, { onDelete: "restrict" }),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.userId, table.intentId] }),
    })
);

// =========================================================
// addresses
// =========================================================
export const addresses = pgTable(
    "addresses",
    {
        id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        label: addressLabel("label").notNull().default("home"),
        line1: text("line1").notNull(),
        line2: text("line2"),
        city: text("city").notNull(),
        governorate: text("governorate"),
        postalCode: text("postal_code"),
        isDefault: boolean("is_default").notNull().default(false),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        userIdIdx: index("addresses_user_id_idx").on(table.userId),
    })
);

// payment_methods: only Paymob's token/reference is stored. Raw card data never touches this DB.
export const paymentMethods = pgTable(
    "payment_methods",
    {
        id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        paymobToken: text("paymob_token").notNull(),
        cardBrand: text("card_brand"),
        last4: char("last4", { length: 4 }),
        isDefault: boolean("is_default").notNull().default(false),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        userIdIdx: index("payment_methods_user_id_idx").on(table.userId),
    })
);

export const discounts = pgTable(
    "discounts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        listingId: bigint("listing_id", { mode: "number" })
            .notNull()
            .references(() => listings.id, { onDelete: "cascade" }),
        percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
        startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
        endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        listingIdIdx: index("discounts_listing_id_idx").on(table.listingId),
        activeRangeIdx: index("discounts_active_range_idx").on(table.startsAt, table.endsAt),
        percentageCheck: check("discounts_percentage_check", sql`${table.percentage} > 0 and ${table.percentage} <= 100`),
        datesCheck: check("discounts_dates_check", sql`${table.endsAt} > ${table.startsAt}`),
    })
);



// =========================================================
// carts
// =========================================================
export const carts = pgTable(
    "carts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        status: cartStatus("status").notNull().default("active"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        userIdIdx: index("carts_user_id_idx").on(table.userId),
        // enforces "one active cart per user" the same way stores.ownerId enforces
        // "one store per user" — but partial, since a user accumulates many
        // converted/abandoned carts over time and only the active one is unique.
        activeUserUnique: uniqueIndex("carts_active_user_unique")
            .on(table.userId)
            .where(sql`status = 'active'`),
    })
);

// =========================================================
// cart_items
// =========================================================
export const cartItems = pgTable(
    "cart_items",
    {
        id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
        cartId: uuid("cart_id")
            .notNull()
            .references(() => carts.id, { onDelete: "cascade" }),
        listingId: bigint("listing_id", { mode: "number" })
            .notNull()
            .references(() => listings.id, { onDelete: "restrict" }),
        quantity: integer("quantity").notNull().default(1),
        priceAtAdd: numeric("price_at_add", { precision: 12, scale: 2 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        cartIdIdx: index("cart_items_cart_id_idx").on(table.cartId),
        listingIdIdx: index("cart_items_listing_id_idx").on(table.listingId),
        cartListingUnique: uniqueIndex("cart_items_cart_listing_unique").on(table.cartId, table.listingId),
        quantityCheck: check("cart_items_quantity_check", sql`${table.quantity} > 0`),
    })
);

// =========================================================
// orders (header)
// =========================================================
export const orders = pgTable(
    "orders",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "restrict" }),
        cartId: uuid("cart_id").references(() => carts.id, { onDelete: "set null" }),
        addressId: bigint("address_id", { mode: "number" }).references(() => addresses.id, {
            onDelete: "set null",
        }),
        addressLabel: addressLabel("address_label"),
        addressLine1: text("address_line1").notNull(),
        addressLine2: text("address_line2"),
        addressCity: text("address_city").notNull(),
        addressGovernorate: text("address_governorate"),
        addressPostalCode: text("address_postal_code"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        userIdIdx: index("orders_user_id_idx").on(table.userId),
    })
);

// =========================================================
// order_items (line items — status per store here)
// =========================================================
export const orderItems = pgTable(
    "order_items",
    {
        id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
        orderId: uuid("order_id")
            .notNull()
            .references(() => orders.id, { onDelete: "cascade" }),
        listingId: bigint("listing_id", { mode: "number" })
            .notNull()
            .references(() => listings.id, { onDelete: "restrict" }),
        storeId: uuid("store_id")
            .notNull()
            .references(() => stores.id, { onDelete: "restrict" }),
        categoryId: uuid("category_id")
            .notNull()
            .references(() => categories.id, { onDelete: "restrict" }),
        quantity: integer("quantity").notNull().default(1),
        unitPriceAtPurchase: numeric("unit_price_at_purchase", { precision: 12, scale: 2 }).notNull(),
        totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
        status: purchaseStatus("status").notNull().default("pending"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        orderIdIdx: index("order_items_order_id_idx").on(table.orderId),
        listingIdIdx: index("order_items_listing_id_idx").on(table.listingId),
        storeIdIdx: index("order_items_store_id_idx").on(table.storeId),
        categoryIdIdx: index("order_items_category_id_idx").on(table.categoryId),
        quantityCheck: check("order_items_quantity_check", sql`${table.quantity} > 0`),
    })
);