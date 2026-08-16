import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, bearer } from "better-auth/plugins";
import { db } from "@/db/db.js";
import * as schema from "@/db/schema.js";
export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },

    session: {
        expiresIn: 60 * 60 * 24 * 7,
    },

    // socialProviders: {
    //     google: {
    //         clientId: process.env.GOOGLE_CLIENT_ID!,
    //         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    //     },
    //     facebook: {
    //         clientId: process.env.FACEBOOK_CLIENT_ID!,
    //         clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    //     },
    // },

    trustedOrigins: [
        "http://localhost:3000",
    ],

    advanced: {
        database: {
            generateId: () => crypto.randomUUID()
        }
    },
    user: {
        additionalFields: {
            budget: { type: "number", required: false, defaultValue: 0 },
            maritalStatus: { type: "string", required: false },
            phone: { type: "string", required: false },
        },
    },

    plugins: [
        admin(),
        bearer(),
    ],
});