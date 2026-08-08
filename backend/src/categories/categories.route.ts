import { Router } from "express";
import { requireAuth, requireRole } from "@/shared/middlewares/auth.middleware.js";
import * as categoriesController from "./categories.controller.js";

const router = Router();
const canManageCategories = requireRole("admin", "super_admin");

router.get("/", categoriesController.list);
router.post("/", requireAuth, canManageCategories, categoriesController.create);
router.patch("/:id", requireAuth, canManageCategories, categoriesController.update);
router.delete("/:id", requireAuth, canManageCategories, categoriesController.remove);

export default router;