import { eq } from "drizzle-orm";
import { db } from "@/db/db.js";
import { categories } from "@/db/schema.js";
import { NotFoundError } from "@/shared/errors.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.validation.js";

export async function listCategories() {
    return db.select().from(categories);
}

export async function createCategory(input: CreateCategoryInput) {
    const [category] = await db.insert(categories).values(input).returning();
    return category;
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
    const [category] = await db
        .update(categories)
        .set(input)
        .where(eq(categories.id, id))
        .returning();

    if (!category) throw new NotFoundError("Category not found");
    return category;
}

export async function deleteCategory(id: string) {
    const [category] = await db
        .delete(categories)
        .where(eq(categories.id, id))
        .returning();

    if (!category) throw new NotFoundError("Category not found");
    return category;
}