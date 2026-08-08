import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "@/shared/errors.js";
import multer from "multer";

type PgError = { code: string; constraint_name?: string };

function isPostgresError(err: unknown): err is PgError {
    return typeof err === "object" && err !== null && "code" in err;
}

function extractPgError(err: unknown): PgError | null {
    if (isPostgresError(err)) return err;
    if (err instanceof Error && "cause" in err && isPostgresError((err as any).cause)) {
        return (err as any).cause;
    }
    return null;
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
            ...(err instanceof ValidationError ? { issues: err.issues } : {}),
        });
    }

    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            error: err.code,
            message: err.message,
        });
    }

    const pgErr = extractPgError(err);
    if (pgErr) {
        if (pgErr.code === "23505") {
            if (pgErr.constraint_name === "stores_owner_id_unique_idx") {
                return res.status(409).json({ message: "You already have a store" });
            }
            return res.status(409).json({ message: "Duplicate value violates a unique constraint" });
        }
        if (pgErr.code === "23503") {
            return res.status(409).json({ message: "Referenced record doesn't exist" });
        }
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }

    console.error(err);
    res.status(500).json({ message: "Internal server error" });
}