import { db } from "@/db/db.js";
import { stores } from "@/db/schema.js";
import { eq } from "drizzle-orm";

export async function getMe(user: { id: string; role: string;[key: string]: any }) {
    const [store] = await db.select().from(stores).where(eq(stores.ownerId, user.id));

    return {
        user,
        store: store ?? null,
    };
}