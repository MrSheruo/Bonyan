import express from "express";
import { loginController, logoutController, registerController } from "./auth.controller.js";
import { requireAuth, requireGuest } from "@/shared/middlewares/auth.middleware.js";

const authRouter = express.Router();

authRouter.post("/register", requireGuest, registerController);
authRouter.post("/login", requireGuest, loginController);

authRouter.post("/logout", requireAuth, logoutController);
export default authRouter;