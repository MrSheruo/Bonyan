import { Router } from "express";
import { requireAuth, requireRole } from "@/shared/middlewares/auth.middleware.js";
import { upload } from "@/shared/multer.config.js";
import * as productsController from "./products.controller.js";

// import { db } from "@/db/db.js";
// import { products } from "@/db/schema.js";
// import { like } from "drizzle-orm";

const productsRouter = Router();
const canManageProducts = requireRole("admin", "super_admin", "store_owner");
productsRouter.get("/", productsController.list);
// productsRouter.get("/", async (req, res) => {
//     const { q } = req.query;
//     if (q) {
//         const rows = await db.select().from(products).where(like(products.name, `%${q}%`));
//         return res.json(rows);
//     }
//     const rows = await db.select().from(products);
//     return res.json(rows);
// });
productsRouter.get("/:id", productsController.getById);

productsRouter.post(
    "/",
    requireAuth,
    canManageProducts,
    upload.array("images", 5),
    productsController.create
);
productsRouter.patch("/:id", requireAuth, canManageProducts, productsController.update);
productsRouter.delete("/:id", requireAuth, canManageProducts, productsController.remove);

export default productsRouter;