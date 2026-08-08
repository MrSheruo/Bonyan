import { Router } from "express";
import { requireAuth, requireRole } from "@/shared/middlewares/auth.middleware.js";
import * as storesController from "./stores.controller.js";

const router = Router();
const isAdminRole = requireRole("admin", "super_admin");

router.get("/:id", storesController.getById);
router.get("/owner/:ownerId", requireAuth, isAdminRole, storesController.getByOwnerId);

router.post("/", requireAuth, storesController.create);
router.patch("/:id", requireAuth, storesController.update);
router.delete("/:id", requireAuth, storesController.remove);

export default router;