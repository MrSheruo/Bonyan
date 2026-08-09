import type { Request, Response, NextFunction } from "express";
import { ValidationError } from "@/shared/errors.js";
import { setIntentsSchema } from "./intents.validation.js";
import { getUserIntents, setUserIntents } from "./intents.service.js";

export async function listIntents(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await getUserIntents(req.user!.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function replaceIntents(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = setIntentsSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);

        const result = await setUserIntents(req.user!.id, parsed.data);
        res.json(result);
    } catch (err) {
        next(err);
    }
}