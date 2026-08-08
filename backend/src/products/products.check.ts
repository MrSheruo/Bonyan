import { db } from "@/db/db.js";
import { products } from "@/db/schema.js";
import { eq } from "drizzle-orm";

export async function isProductExist(productId: string) {
    const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId));
    return !!product;
}