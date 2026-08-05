import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "@/shared/errors.js";

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
            ...(err instanceof ValidationError ? { issues: err.issues } : {}),
        });
    }
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
}