import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "@/db/db.js";
import {
  carts,
  cartItems,
  listings,
  products,
  stores,
  productImages,
} from "@/db/schema.js";
import { NotFoundError, ConflictError } from "@/shared/errors.js";
import {
  getActiveDiscount,
  withEffectivePrice,
} from "@/listings/listings.service.js";

async function getOrCreateActiveCart(userId: string) {
  // ON CONFLICT DO NOTHING avoids the race: two concurrent first-adds
  // don't throw, the loser just skips the insert.
  await db
    .insert(carts)
    .values({ userId })
    .onConflictDoNothing({
      target: carts.userId,
      where: sql`status = 'active'`,
    });

  const [cart] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.userId, userId), eq(carts.status, "active")));
  if (!cart) throw new Error("Failed to get or create active cart");
  return cart;
}

async function getOwnedCartItem(itemId: number, userId: string) {
  const [row] = await db
    .select({ item: cartItems, cart: carts })
    .from(cartItems)
    .innerJoin(carts, eq(cartItems.cartId, carts.id))
    .where(and(eq(cartItems.id, itemId), eq(carts.userId, userId)));

  // Not found and "belongs to someone else" return the same error.
  // This hides other users' item IDs — no 403 leak.
  if (!row) throw new NotFoundError("Cart item not found");
  return row;
}

export async function getCartWithItems(userId: string) {
  const cart = await getOrCreateActiveCart(userId);

  const items = await db
    .select({
      item: cartItems,
      listing: listings,
      product: products,
      store: stores,
    })
    .from(cartItems)
    .innerJoin(listings, eq(cartItems.listingId, listings.id))
    .innerJoin(products, eq(listings.productId, products.id))
    .leftJoin(stores, eq(listings.storeId, stores.id))
    .where(eq(cartItems.cartId, cart.id));

  const productIds = Array.from(new Set(items.map((i) => i.product.id)));
  const imagesByProduct = new Map<
    string,
    { url: string; isPrimary: boolean }[]
  >();

  if (productIds.length > 0) {
    const imageRows = await db
      .select({
        productId: productImages.productId,
        url: productImages.url,
        isPrimary: productImages.isPrimary,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(productImages.sortOrder);

    for (const { productId, url, isPrimary } of imageRows) {
      const arr = imagesByProduct.get(productId) ?? [];
      arr.push({ url, isPrimary });
      imagesByProduct.set(productId, arr);
    }
  }

  const total = items.reduce(
    (sum, { item }) => sum + Number(item.priceAtAdd) * item.quantity,
    0,
  );

  return {
    id: cart.id,
    status: cart.status,
    items: items.map(({ item, listing, product, store }) => {
      const imgs = imagesByProduct.get(product.id) ?? [];
      const primaryImg =
        imgs.find((i) => i.isPrimary)?.url || imgs[0]?.url || null;

      return {
        id: item.id,
        listingId: listing.id,
        productId: product.id,
        name: product.name,
        image: primaryImg,
        brand: product.brand,
        color: product.color,
        size: product.size,
        unit: product.unit,
        tier: product.tier,
        store: store
          ? {
              id: store.id,
              name: store.name,
              city: store.city,
            }
          : null,
        quantity: item.quantity,
        priceAtAdd: Number(item.priceAtAdd),
        inStock: listing.inStock,
      };
    }),
    total,
  };
}

export async function addItemToCart(
  userId: string,
  listingId: number,
  quantity: number,
) {
  const cart = await getOrCreateActiveCart(userId);

  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId));

  if (!listing || listing.deletedAt)
    throw new NotFoundError("Listing not found");
  if (!listing.inStock) throw new ConflictError("This listing is out of stock");

  const discount = await getActiveDiscount(listingId);
  const { effectivePrice } = withEffectivePrice(listing.price, discount);

  // Merge on conflict — matches the documented business rule (duplicate
  // add-to-cart merges), and also absorbs the concurrent-double-add race.
  // Assumption: on merge, quantity increases but priceAtAdd from the
  // FIRST add is kept (not overwritten). Confirm if you want the price
  // refreshed on every add instead.
  await db
    .insert(cartItems)
    .values({
      cartId: cart.id,
      listingId,
      quantity,
      priceAtAdd: String(effectivePrice),
    })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.listingId],
      set: {
        quantity: sql`${cartItems.quantity} + ${quantity}`,
        updatedAt: new Date(),
      },
    });

  return getCartWithItems(userId);
}

export async function updateCartItemQuantity(
  userId: string,
  itemId: number,
  quantity: number,
) {
  await getOwnedCartItem(itemId, userId);

  await db
    .update(cartItems)
    .set({ quantity, updatedAt: new Date() })
    .where(eq(cartItems.id, itemId));

  return getCartWithItems(userId);
}

export async function removeCartItem(userId: string, itemId: number) {
  await getOwnedCartItem(itemId, userId);

  await db.delete(cartItems).where(eq(cartItems.id, itemId));

  return getCartWithItems(userId);
}
