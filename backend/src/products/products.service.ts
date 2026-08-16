import {
  eq,
  and,
  isNull,
  sql,
  ilike,
  getTableColumns,
  gte,
  desc,
} from "drizzle-orm";
import { db } from "@/db/db.js";
import { products, categories, productImages } from "@/db/schema.js";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "@/shared/errors.js";
import {
  compressImage,
  uploadImage,
  deleteImage,
  pathFromPublicUrl,
} from "@/shared/storage/bucket.service.js";
import { getListingsForProduct } from "@/listings/listings.service.js";
import type {
  CreateProductInput,
  GetProductsQuery,
  UpdateProductInput,
} from "./products.validation.js";
import { inArray } from "drizzle-orm";
import { getListingsForProducts } from "@/listings/listings.service.js";

type Requester = { id: string; role: string };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const MANAGE_ROLES = new Set(["admin", "super_admin", "store_owner"]);

async function assertCanManageProduct(
  _productId: string,
  requester: Requester,
) {
  // products aren't store-scoped today (flagged earlier as an open gap) —
  // any of these roles can manage any product for now.
  if (!MANAGE_ROLES.has(requester.role)) {
    throw new ForbiddenError(
      "You don't have permission to manage this product",
    );
  }
}

export async function insertProductWithImages(
  tx: Tx,
  input: CreateProductInput,
  uploaded: { publicUrl: string }[],
) {
  const [createdProduct] = await tx.insert(products).values(input).returning();

  await tx.insert(productImages).values(
    uploaded.map((img, index) => ({
      productId: createdProduct?.id!,
      url: img.publicUrl,
      isPrimary: index === 0,
      sortOrder: index,
    })),
  );

  return createdProduct;
}

export async function createProductWithImages(
  input: CreateProductInput,
  imageBuffers: Buffer[],
) {
  if (imageBuffers.length === 0) {
    throw new ValidationError("At least one image is required");
  }

  const uploadedPaths: string[] = [];

  try {
    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .limit(1);

    if (!existingCategory) {
      throw new ValidationError("Category not found");
    }

    const uploaded = await Promise.all(
      imageBuffers.map(async (buffer) => {
        const compressed = await compressImage(buffer);
        const result = await uploadImage(compressed, "product-images");
        uploadedPaths.push(result.path);
        return result;
      }),
    );

    return await db.transaction((tx) =>
      insertProductWithImages(tx, input, uploaded),
    );
  } catch (err) {
    await Promise.all(
      uploadedPaths.map((path) => deleteImage(path, "product-images")),
    );
    throw err;
  }
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  requester: Requester,
) {
  await assertCanManageProduct(id, requester);

  const [product] = await db
    .update(products)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .returning();

  if (!product) throw new NotFoundError("Product not found");
  return product;
}

export async function deleteProduct(id: string, requester: Requester) {
  await assertCanManageProduct(id, requester);

  const [product] = await db
    .update(products)
    .set({ deletedAt: new Date() })
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .returning();

  if (!product) throw new NotFoundError("Product not found");
  return product;
}

export async function getProductById(id: string) {
  const [row] = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.id, id), isNull(products.deletedAt)));

  if (!row) throw new NotFoundError("Product not found");

  const [images, listingsWithDiscounts] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(productImages.sortOrder),
    getListingsForProduct(id),
  ]);

  return {
    ...row.product,
    category: row.category,
    images,
    listings: listingsWithDiscounts,
  };
}

// Requires: create extension if not exists pg_trgm;
// and ideally: create index products_name_trgm_idx on products using gin (name gin_trgm_ops);
// export async function findSimilarProduct(name: string, categoryId: string) {
//     const [match] = await db
//         .select({ id: products.id, name: products.name })
//         .from(products)
//         .where(
//             and(
//                 eq(products.categoryId, categoryId),
//                 isNull(products.deletedAt),
//                 sql`similarity(${products.name}, ${name}) > 0.4`
//             )
//         )
//         .limit(1);

//     return match ?? null;
// }

export async function addProductImages(
  productId: string,
  imageBuffers: Buffer[],
  requester: Requester,
) {
  await assertCanManageProduct(productId, requester);

  if (imageBuffers.length === 0) {
    throw new ValidationError("At least one image is required");
  }

  const uploadedPaths: string[] = [];

  try {
    const [row] = await db
      .select({
        maxSortOrder: sql<number>`coalesce(max(${productImages.sortOrder}), -1)`,
      })
      .from(productImages)
      .where(eq(productImages.productId, productId));

    const maxSortOrder = row?.maxSortOrder ?? -1;

    const uploaded = await Promise.all(
      imageBuffers.map(async (buffer) => {
        const compressed = await compressImage(buffer);
        const result = await uploadImage(compressed, "product-images");
        uploadedPaths.push(result.path);
        return result;
      }),
    );

    return await db
      .insert(productImages)
      .values(
        uploaded.map((img, index) => ({
          productId,
          url: img.publicUrl,
          isPrimary: false,
          sortOrder: maxSortOrder + 1 + index,
        })),
      )
      .returning();
  } catch (err) {
    await Promise.all(
      uploadedPaths.map((path) => deleteImage(path, "product-images")),
    );
    throw err;
  }
}

export async function deleteProductImage(
  productId: string,
  imageId: number,
  requester: Requester,
) {
  await assertCanManageProduct(productId, requester);

  const [image] = await db
    .select()
    .from(productImages)
    .where(
      and(
        eq(productImages.id, imageId),
        eq(productImages.productId, productId),
      ),
    );

  if (!image) throw new NotFoundError("Image not found");

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(productImages)
    .where(eq(productImages.productId, productId));

  if (Number(countRow?.count ?? 0) <= 1) {
    throw new ConflictError(
      "Can't delete the last image — a product must have at least one",
    );
  }

  await deleteImage(
    pathFromPublicUrl(image.url, "product-images"),
    "product-images",
  );
  await db.delete(productImages).where(eq(productImages.id, imageId));
}

// Search For Products

const PAGE_SIZE = 30;
const RECENT_WINDOW = sql`interval '15 days'`;

function encodeCursor(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}
function decodeCursor<T>(cursor: string): T {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
}

export async function getProductImages(productId: string) {
  return db
    .select({ url: productImages.url, isPrimary: productImages.isPrimary })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(productImages.sortOrder);
}

export async function getProductsByCategory(categoryIdOrName: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(
      sql`${categories.id}::text = ${categoryIdOrName} OR ${categories.name} ILIKE ${categoryIdOrName}`,
    )
    .limit(1);

  if (!category) throw new NotFoundError("Category not found");

  const rows = await db
    .select()
    .from(products)
    .where(
      and(eq(products.categoryId, category.id), isNull(products.deletedAt)),
    )
    .orderBy(desc(products.rating), desc(products.id));

  const items = await Promise.all(
    rows.map(async (product) => ({
      ...product,
      images: await getProductImages(product.id),
      listings: await getListingsForProduct(product.id),
    })),
  );

  return { category, items };
}

export async function getImagesForProducts(productIds: string[]) {
  if (productIds.length === 0)
    return new Map<string, { url: string; isPrimary: boolean }[]>();

  const rows = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      isPrimary: productImages.isPrimary,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(productImages.sortOrder);

  const byProductId = new Map<string, { url: string; isPrimary: boolean }[]>();
  for (const { productId, url, isPrimary } of rows) {
    const arr = byProductId.get(productId) ?? [];
    arr.push({ url, isPrimary });
    byProductId.set(productId, arr);
  }
  return byProductId;
}

async function attachImagesAndListings<T extends { id: string }>(page: T[]) {
  const ids = page.map((p) => p.id);
  const [imagesByProduct, listingsByProduct] = await Promise.all([
    getImagesForProducts(ids),
    getListingsForProducts(ids),
  ]);

  return page.map((p) => ({
    ...p,
    images: imagesByProduct.get(p.id) ?? [],
    listings: listingsByProduct.get(p.id) ?? [],
  }));
}

export async function listProducts(query: GetProductsQuery) {
  const baseFilters = [
    isNull(products.deletedAt),
    query.category ? inArray(products.categoryId, query.category) : undefined,
    query.brand ? ilike(products.brand, query.brand) : undefined,
    query.color ? ilike(products.color, query.color) : undefined,
    query.size ? ilike(products.size, query.size) : undefined,
    query.minRating !== undefined
      ? gte(products.rating, String(query.minRating))
      : undefined,
  ].filter((f): f is NonNullable<typeof f> => f !== undefined);

  const cols = getTableColumns(products);

  if (query.search) {
    const tsquery = sql`plainto_tsquery('simple', ${query.search})`;
    const rankExpr = sql<number>`ts_rank(${products.searchVector}, ${tsquery})`;

    let cursorCondition;
    if (query.cursor) {
      const { rank, id } = decodeCursor<{ rank: number; id: string }>(
        query.cursor,
      );
      cursorCondition = sql`(${rankExpr} < ${rank} OR (${rankExpr} = ${rank} AND ${products.id} < ${id}))`;
    }

    const rows = await db
      .select({ ...cols, rank: rankExpr })
      .from(products)
      .where(
        and(
          ...baseFilters,
          sql`${products.searchVector} @@ ${tsquery}`,
          cursorCondition,
        ),
      )
      .orderBy(sql`${rankExpr} DESC`, desc(products.id))
      .limit(PAGE_SIZE + 1);

    const hasMore = rows.length > PAGE_SIZE;
    const page = rows.slice(0, PAGE_SIZE).map(({ rank, ...p }) => p);
    const last = rows.at(Math.min(PAGE_SIZE, rows.length) - 1);
    const nextCursor =
      hasMore && last ? encodeCursor({ rank: last.rank, id: last.id }) : null;

    return {
      items: await attachImagesAndListings(page),
      nextCursor,
    };
  }

  const isRecentExpr = sql<boolean>`(${products.createdAt} >= now() - ${RECENT_WINDOW})`;

  let cursorCondition;
  if (query.cursor) {
    const { isRecent, rating, id } = decodeCursor<{
      isRecent: boolean;
      rating: number;
      id: string;
    }>(query.cursor);
    cursorCondition = sql`(
            (${isRecent} = true AND ${isRecentExpr} = false)
            OR (${isRecentExpr} = ${isRecent} AND (
                ${products.rating} < ${rating}
                OR (${products.rating} = ${rating} AND ${products.id} < ${id})
            ))
        )`;
  }

  const rows = await db
    .select({ ...cols, isRecent: isRecentExpr })
    .from(products)
    .where(and(...baseFilters, cursorCondition))
    .orderBy(
      sql`${isRecentExpr} DESC`,
      desc(products.rating),
      desc(products.id),
    )
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE).map(({ isRecent, ...p }) => p);
  const last = rows.at(Math.min(PAGE_SIZE, rows.length) - 1);
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          isRecent: last.isRecent,
          rating: Number(last.rating),
          id: last.id,
        })
      : null;

  return {
    items: await attachImagesAndListings(page),
    nextCursor,
  };
}
