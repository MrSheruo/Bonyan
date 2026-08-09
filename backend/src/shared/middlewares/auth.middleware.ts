// middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from "express";
import { auth } from "@/shared/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { AuthError, ConflictError, ForbiddenError } from "@/shared/errors.js";

declare global {
    namespace Express {
        interface Request {
            user?: any;
            session?: any;
            isDeactivated?: boolean;
        }
    }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) throw new AuthError("Not authenticated");

        req.isDeactivated = !!(session.user as any).deletedAt;
        req.user = session.user;
        req.session = session.session;
        next();
    } catch (err) {
        next(err instanceof AuthError ? err : new AuthError("Not authenticated"));
    }
}

export function blockIfDeactivated(req: Request, res: Response, next: NextFunction) {
    if (req.isDeactivated) {
        return next(new ForbiddenError("Account is deactivated. Reactivate to continue."));
    }
    next();
}

export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return next(new ForbiddenError("Insufficient permissions"));
        }
        next();
    };
}

export async function requireGuest(req: Request, res: Response, next: NextFunction) {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });

    if (session) {
        return next(new ConflictError("Already authenticated"));
    }
    next();
}