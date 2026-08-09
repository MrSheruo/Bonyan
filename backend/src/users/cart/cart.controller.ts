import type { Request, Response, NextFunction } from "express";
import { ValidationError } from "@/shared/errors.js";
import { addCartItemSchema, updateCartItemSchema } from "./cart.validation.js";
import {
    getCartWithItems,
    addItemToCart,
    updateCartItemQuantity,
    removeCartItem,
} from "./cart.service.js";

export async function getCart(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await getCartWithItems(req.user!.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function addItem(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = addCartItemSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);

        const result = await addItemToCart(req.user!.id, parsed.data.listingId, parsed.data.quantity);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = updateCartItemSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);

        const itemId = Number(req.params.id);
        const result = await updateCartItemQuantity(req.user!.id, itemId, parsed.data.quantity);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function removeItem(req: Request, res: Response, next: NextFunction) {
    try {
        const itemId = Number(req.params.id);
        await removeCartItem(req.user!.id, itemId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}