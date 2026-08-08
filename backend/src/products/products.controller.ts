import type { Request, Response, NextFunction } from "express";
import * as productsService from "./products.service.js";
import { ValidationError } from "@/shared/errors.js";
import { createProductSchema, updateProductSchema, productIdParamSchema, getProductsQuerySchema } from "./products.validation.js";

function validationError(res: Response, error: any) {
    return res.status(400).json({ message: "Validation failed", errors: error.flatten().fieldErrors });
}

export async function create(req: Request, res: Response, next: NextFunction) {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        const files = (req.files as Express.Multer.File[]) ?? [];
        if (files.length === 0) throw new ValidationError("At least one image is required");
        if (!parsed.data.categoryId) throw new ValidationError("No product ID provided");

        const product = await productsService.createProductWithImages(parsed.data, files.map((f) => f.buffer));
        res.status(201).json(product);
    } catch (err) {
        next(err);
    }
}

export async function update(req: Request, res: Response, next: NextFunction) {
    const params = productIdParamSchema.safeParse(req.params);
    const body = updateProductSchema.safeParse(req.body);
    if (!params.success) return validationError(res, params.error);
    if (!body.success) return validationError(res, body.error);

    try {
        const product = await productsService.updateProduct(params.data.id, body.data, req.user);
        res.json(product);
    } catch (err) {
        next(err);
    }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
    const parsed = productIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        await productsService.deleteProduct(parsed.data.id, req.user);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
    const parsed = productIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        const product = await productsService.getProductById(parsed.data.id);
        res.json(product);
    } catch (err) {
        next(err);
    }
}

export async function addImages(req: Request, res: Response, next: NextFunction) {
    const parsed = productIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        const files = (req.files as Express.Multer.File[]) ?? [];
        const images = await productsService.addProductImages(parsed.data.id, files.map((f) => f.buffer), req.user);
        res.status(201).json(images);
    } catch (err) {
        next(err);
    }
}

export async function removeImage(req: Request, res: Response, next: NextFunction) {
    const parsed = productIdParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);

    const imageId = Number(req.params.imageId);
    if (!Number.isInteger(imageId) || imageId <= 0) {
        return res.status(400).json({ message: "Invalid image id" });
    }

    try {
        await productsService.deleteProductImage(parsed.data.id, imageId, req.user);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

export async function list(req: Request, res: Response, next: NextFunction) {
    const parsed = getProductsQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
        const result = await productsService.listProducts(parsed.data);
        res.json(result);
    } catch (err) {
        next(err);
    }
}