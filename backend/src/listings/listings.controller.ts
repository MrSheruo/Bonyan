import type { Request, Response, NextFunction } from "express";
import * as listingsService from "./listings.service.js";
import {
    createListingSchema,
    updateListingSchema,
    listingIdParamSchema,
    compareQuerySchema,
    createDiscountSchema,
    updateDiscountSchema,
    discountParamsSchema,
} from "./listings.validation.js";

function validationError(res: Response, error: any) {
    return res.status(400).json({ message: "Validation failed", errors: error.flatten().fieldErrors });
}

export async function create(req: Request, res: Response, next: NextFunction) {
    const parsed = createListingSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        const files = (req.files as Express.Multer.File[]) ?? [];
        const listing = await listingsService.createListing(parsed.data, files.map((f) => f.buffer), req.user);
        res.status(201).json(listing);
    } catch (err) {
        next(err);
    }
}

export async function update(req: Request, res: Response, next: NextFunction) {
    const params = listingIdParamSchema.safeParse(req.params);
    const body = updateListingSchema.safeParse(req.body);
    if (!params.success) return validationError(res, params.error);
    if (!body.success) return validationError(res, body.error);

    try {
        const listing = await listingsService.updateListing(params.data.id, body.data, req.user);
        res.json(listing);
    } catch (err) {
        next(err);
    }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
    const parsed = listingIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        await listingsService.deleteListing(parsed.data.id, req.user);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

export async function restore(req: Request, res: Response, next: NextFunction) {
    const parsed = listingIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        const listing = await listingsService.restoreListing(parsed.data.id, req.user);
        res.json(listing);
    } catch (err) {
        next(err);
    }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
    const parsed = listingIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);
    console.log(parsed.data.id);

    try {
        const listing = await listingsService.getListingById(parsed.data.id);
        res.json(listing);
    } catch (err) {
        next(err);
    }
}

export async function compare(req: Request, res: Response, next: NextFunction) {
    const parsed = compareQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        const results = await listingsService.compareListings(parsed.data.productId);
        res.json(results);
    } catch (err) {
        next(err);
    }
}

export async function createDiscount(req: Request, res: Response, next: NextFunction) {
    const params = listingIdParamSchema.safeParse(req.params);
    const body = createDiscountSchema.safeParse(req.body);
    if (!params.success) return validationError(res, params.error);
    if (!body.success) return validationError(res, body.error);

    try {
        const discount = await listingsService.createDiscount(params.data.id, body.data, req.user);
        res.status(201).json(discount);
    } catch (err) {
        next(err);
    }
}

export async function updateDiscount(req: Request, res: Response, next: NextFunction) {
    const params = discountParamsSchema.safeParse(req.params);
    const body = updateDiscountSchema.safeParse(req.body);
    if (!params.success) return validationError(res, params.error);
    if (!body.success) return validationError(res, body.error);

    try {
        const discount = await listingsService.updateDiscount(
            params.data.id,
            params.data.discountId,
            body.data,
            req.user
        );
        res.json(discount);
    } catch (err) {
        next(err);
    }
}

export async function deleteDiscount(req: Request, res: Response, next: NextFunction) {
    const parsed = discountParamsSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        await listingsService.deleteDiscount(parsed.data.id, parsed.data.discountId, req.user);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}