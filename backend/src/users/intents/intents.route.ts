import { Router } from "express";
import { listIntents, replaceIntents } from "./intents.controller.js";

const intentsRouter = Router();

intentsRouter.get("/", listIntents);
intentsRouter.put("/", replaceIntents);

export default intentsRouter;