import express from "express";
import { blockIfDeactivated, requireAuth } from "@/shared/middlewares/auth.middleware.js";
import { deleteAccount, me, reactivate, updateProfile } from "./users.controller.js";
import cartRouter from "./cart/cart.route.js";
import ordersRouter from "./orders/orders.route.js";
import { upload } from "@/shared/multer.config.js";
import addressesRouter from "./addresses/addresses.route.js";
import intentsRouter from "./intents/intents.route.js";

const usersRouter = express.Router();

usersRouter.use(requireAuth);
usersRouter.post("/me/reactivate", reactivate)

usersRouter.use(blockIfDeactivated);
usersRouter.get("/me", me);
usersRouter.patch("/me", upload.single("image"), updateProfile);

usersRouter.delete("/me", deleteAccount);

usersRouter.use("/me/cart", cartRouter);
usersRouter.use("/me/orders", ordersRouter);
usersRouter.use("/me/addresses", addressesRouter);
usersRouter.use("/me/intents", intentsRouter);
export default usersRouter;