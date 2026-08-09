import { eq, and, count } from "drizzle-orm";
import { db } from "@/db/db.js";
import { addresses } from "@/db/schema.js";
import { NotFoundError } from "@/shared/errors.js";
import type { CreateAddressInput, UpdateAddressInput } from "./addresses.validation.js";

async function getOwnedAddress(addressId: number, userId: string) {
    const [address] = await db
        .select()
        .from(addresses)
        .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));

    if (!address) throw new NotFoundError("Address not found");
    return address;
}

export async function getAddressesForUser(userId: string) {
    return db.select().from(addresses).where(eq(addresses.userId, userId));
}

export async function createAddress(userId: string, input: CreateAddressInput) {
    return db.transaction(async (tx) => {
        const result = await tx
            .select({ value: count() })
            .from(addresses)
            .where(eq(addresses.userId, userId));

        const existingCount = result[0]?.value ?? 0;
        const isFirst = existingCount === 0;

        const [created] = await tx
            .insert(addresses)
            .values({
                userId,
                label: input.label,
                line1: input.line1,
                line2: input.line2,
                city: input.city,
                governorate: input.governorate,
                postalCode: input.postalCode,
                isDefault: isFirst ? true : input.isDefault,
            })
            .returning();

        if (!created) throw new Error("Failed to create address");
        return created;
    });
}

export async function updateAddress(userId: string, addressId: number, input: UpdateAddressInput) {
    await getOwnedAddress(addressId, userId);

    if (input.isDefault === true) {
        return db.transaction(async (tx) => {
            await tx
                .update(addresses)
                .set({ isDefault: false })
                .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));

            const [updated] = await tx
                .update(addresses)
                .set(input)
                .where(eq(addresses.id, addressId))
                .returning();

            if (!updated) throw new Error("Failed to update address");
            return updated;
        });
    }

    const [updated] = await db
        .update(addresses)
        .set(input)
        .where(eq(addresses.id, addressId))
        .returning();

    if (!updated) throw new Error("Failed to update address");
    return updated;
}

export async function deleteAddress(userId: string, addressId: number) {
    await getOwnedAddress(addressId, userId);

    const [deleted] = await db
        .delete(addresses)
        .where(eq(addresses.id, addressId))
        .returning();

    return deleted;
}