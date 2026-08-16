import { db } from "@/db/db.js";
import { stores } from "@/db/schema.js";
import { auth } from "@/shared/auth.js";
import { AuthError, ConflictError } from "@/shared/errors.js";
import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import type { Request } from "express";

export async function registerService(
    input: { email: string; password: string; name: string },
    req: Request
) {
    try {
        const result = await auth.api.signUpEmail({
            body: {
                email: input.email,
                password: input.password,
                name: input.name,
            },
            headers: fromNodeHeaders(req.headers),
            asResponse: true,
        });
        return result;
    } catch (err: any) {
        if (err.message?.includes("already exists") || err.status === 422) {
            throw new ConflictError("User already exists");
        }
        throw err;
    }
}

export async function loginService(
    input: { email: string; password: string },
    req: Request
) {
    try {
        const result = await auth.api.signInEmail({
            body: {
                email: input.email,
                password: input.password,
            },
            headers: fromNodeHeaders(req.headers),
            asResponse: true,
        });
        return result;
    } catch (err: any) {
        throw new AuthError("Email or Password is not valid");
    }
}

export async function logoutService(req: Request) {
    const result = await auth.api.signOut({
        headers: fromNodeHeaders(req.headers),
        asResponse: true,
    });
    return result;
}

