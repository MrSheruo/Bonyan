import type { Request, Response, NextFunction } from "express";
import { registerService, loginService, logoutService } from "./auth.service.js";
import { insertUserSchema } from "@/db/validation.js";
import { ValidationError } from "@/shared/errors.js";

export async function registerController(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = insertUserSchema.safeParse(req.body)
        if (!parsed.success) throw new ValidationError(parsed.error.issues);

        const result = await registerService(parsed.data);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
}

export async function loginController(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.body.email || !req.body.password) throw new ValidationError("Email and password are required");

        const parsed = { email: req.body.email, password: req.body.password };

        const result = await loginService(parsed);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

export async function logoutController(req: Request, res: Response, next: NextFunction) {
    try {
        await logoutService(req);
        res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
        next(err);
    }
}

