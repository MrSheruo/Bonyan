import type { Request, Response, NextFunction } from "express";
import { deleteOwnAccount, getMe, reactivateAccount } from "./users.service.js";
import { AuthError } from "@/shared/errors.js";
import { updateProfileSchema } from "./users.validation.js";
import { updateUserProfile } from "./users.service.js";
import { ValidationError } from "@/shared/errors.js";

export async function me(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) {
            throw new AuthError("USER_NOT_AUTHENTICATED");
        }
        const result = await getMe(req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = updateProfileSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);

        const imageBuffer = req.file?.buffer;
        const result = await updateUserProfile(req.user!.id, parsed.data, imageBuffer);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
        await deleteOwnAccount(req.user!.id, req);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

export async function reactivate(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await reactivateAccount(req.user!.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
}