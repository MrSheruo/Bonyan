import { Router } from "express";
import { getCart, addItem, updateItem, removeItem } from "./cart.controller.js";
import { checkout } from "@/users/orders/orders.controller.js";
const cartRouter = Router();

cartRouter.get("/", getCart);
cartRouter.post("/items", addItem);
cartRouter.patch("/items/:id", updateItem);
cartRouter.delete("/items/:id", removeItem);
cartRouter.post("/checkout", checkout);
export default cartRouter;