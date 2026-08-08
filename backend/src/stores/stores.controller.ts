import type { Request, Response, NextFunction } from "express";
import * as storesService from "./stores.service.js";
import {
    createStoreSchema,
    updateStoreSchema,
    storeIdParamSchema,
    ownerIdParamSchema,
} from "./stores.validation.js";

function validationError(res: Response, error: any) {
    return res.status(400).json({
        message: "Validation failed",
        errors: error.flatten().fieldErrors,
    });
}

export async function create(req: Request, res: Response, next: NextFunction) {
    const parsed = createStoreSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        const store = await storesService.createStore(parsed.data, req.user);
        res.status(201).json(store);
    } catch (err) {
        next(err);
    }
}

export async function update(req: Request, res: Response, next: NextFunction) {
    const params = storeIdParamSchema.safeParse(req.params);
    const body = updateStoreSchema.safeParse(req.body);
    if (!params.success) return validationError(res, params.error);
    if (!body.success) return validationError(res, body.error);

    try {
        const store = await storesService.updateStore(params.data.id, body.data, req.user);
        res.json(store);
    } catch (err) {
        next(err);
    }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
    const parsed = storeIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        await storesService.deleteStore(parsed.data.id, req.user);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
    const parsed = storeIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        const store = await storesService.getStoreById(parsed.data.id);
        res.json(store);
    } catch (err) {
        next(err);
    }
}

// admin-only — see route guard
export async function getByOwnerId(req: Request, res: Response, next: NextFunction) {
    const parsed = ownerIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        const store = await storesService.getStoreByOwnerId(parsed.data.ownerId);
        res.json(store);
    } catch (err) {
        next(err);
    }
}