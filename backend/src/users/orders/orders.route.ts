import { Router } from "express";
import { buyNowHandler, listOrders, getOrder, updateItemStatus } from "./orders.controller.js";

const ordersRouter = Router();

ordersRouter.post("/", buyNowHandler);
ordersRouter.get("/", listOrders);
ordersRouter.get("/:id", getOrder);

export default ordersRouter;