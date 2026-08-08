import { Router } from "express";
import { requireAuth, requireRole } from "@/shared/middlewares/auth.middleware.js";
import { upload } from "@/shared/multer.config.js";
import * as listingsController from "./listings.controller.js";
import { db } from "@/db/db.js";
import { listings, stores } from "@/db/schema.js";
import { eq, isNull } from "drizzle-orm";

const listingsRouter = Router();
const requireStoreOwner = requireRole("store_owner");
listingsRouter.get("/", async (req, res) => {


    const rows = await db.select({ listing: listings, store: stores })
        .from(listings)
        .innerJoin(stores, eq(listings.storeId, stores.id))
        .where(isNull(listings.deletedAt));
    res.json(rows);
})
listingsRouter.get("/compare", listingsController.compare);
listingsRouter.get("/:id", listingsController.getById);

listingsRouter.post(
    "/",
    requireAuth,
    requireStoreOwner,
    upload.array("images", 5),
    listingsController.create
);
listingsRouter.patch("/:id", requireAuth, requireStoreOwner, listingsController.update);
listingsRouter.delete("/:id", requireAuth, requireStoreOwner, listingsController.remove);
listingsRouter.post("/:id/restore", requireAuth, requireStoreOwner, listingsController.restore);

listingsRouter.post("/:id/discounts", requireAuth, requireStoreOwner, listingsController.createDiscount);
listingsRouter.patch(
    "/:id/discounts/:discountId",
    requireAuth,
    requireStoreOwner,
    listingsController.updateDiscount
);
listingsRouter.delete(
    "/:id/discounts/:discountId",
    requireAuth,
    requireStoreOwner,
    listingsController.deleteDiscount
);

export default listingsRouter;