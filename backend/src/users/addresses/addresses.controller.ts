import type { Request, Response, NextFunction } from "express";
import { ValidationError } from "@/shared/errors.js";
import { createAddressSchema, updateAddressSchema } from "./addresses.validation.js";
import {
    getAddressesForUser,
    createAddress,
    updateAddress,
    deleteAddress,
} from "./addresses.service.js";

export async function listAddresses(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await getAddressesForUser(req.user!.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function addAddress(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = createAddressSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);

        const result = await createAddress(req.user!.id, parsed.data);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
}

export async function editAddress(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = updateAddressSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);

        const addressId = Number(req.params.id);
        const result = await updateAddress(req.user!.id, addressId, parsed.data);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function removeAddress(req: Request, res: Response, next: NextFunction) {
    try {
        const addressId = Number(req.params.id);
        await deleteAddress(req.user!.id, addressId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}
