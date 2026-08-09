import express from "express";
import { requireAuth } from "@/shared/middlewares/auth.middleware.js";
import { me } from "./users.controller.js";

const usersRouter = express.Router();

usersRouter.get("/me", requireAuth, me);

export default usersRouter;