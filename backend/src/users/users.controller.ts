import type { Request, Response, NextFunction } from "express";
import { getMe } from "./users.service.js";

export async function me(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await getMe(req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
}