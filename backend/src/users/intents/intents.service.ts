import { eq } from "drizzle-orm";
import { db } from "@/db/db.js";
import { userIntents, intents } from "@/db/schema.js";
import type { SetIntentsInput } from "./intents.validation.js";

export async function getUserIntents(userId: string) {
    return db
        .select({
            intentId: userIntents.intentId,
            percentage: userIntents.percentage,
            name: intents.name,
        })
        .from(userIntents)
        .innerJoin(intents, eq(userIntents.intentId, intents.id))
        .where(eq(userIntents.userId, userId));
}

export async function setUserIntents(userId: string, input: SetIntentsInput) {
    const total = input.intents.reduce((sum, i) => sum + i.percentage, 0);

    const result = await db.transaction(async (tx) => {
        await tx.delete(userIntents).where(eq(userIntents.userId, userId));

        if (input.intents.length === 0) return [];

        return tx
            .insert(userIntents)
            .values(
                input.intents.map((i) => ({
                    userId,
                    intentId: i.intentId,
                    percentage: String(i.percentage),
                }))
            )
            .returning();
    });

    return {
        intents: result,
        warning: total > 100 ? `Total allocation is ${total}% — exceeds 100%` : null,
    };
}