import { Router } from "express";
import { listAddresses, addAddress, editAddress, removeAddress } from "./addresses.controller.js";

const addressesRouter = Router();

addressesRouter.get("/", listAddresses);
addressesRouter.post("/", addAddress);
addressesRouter.patch("/:id", editAddress);
addressesRouter.delete("/:id", removeAddress);

export default addressesRouter;