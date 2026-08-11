import type { Request, Response, NextFunction } from "express";
import { ValidationError } from "@/shared/errors.js";
import { buyNowSchema, checkoutSchema, updateOrderItemStatusSchema } from "./orders.validation.js";
import {
    checkoutCart,
    buyNow,
    getOrdersForUser,
    getOrderById,
    updateOrderItemStatus,
} from "./orders.service.js";

export async function checkout(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = checkoutSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);

        const result = await checkoutCart(req.user!.id, parsed.data.address);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
}

export async function buyNowHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = buyNowSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);

        const { listingId, quantity, address } = parsed.data;
        const result = await buyNow(req.user!.id, listingId, quantity, address);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
}

export async function listOrders(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await getOrdersForUser(req.user!.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await getOrderById(req.user!.id, req.params.id as string);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function updateItemStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = updateOrderItemStatusSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);

        const itemId = Number(req.params.id);
        const result = await updateOrderItemStatus(req.user!, itemId, parsed.data.status);
        res.json(result);
    } catch (err) {
        next(err);
    }
}