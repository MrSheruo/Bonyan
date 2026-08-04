import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";


import { requestLogger } from "./shared/middlewares/logger.js";
import authRouter from "./auth/auth.route.js";

const app = express()

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("dev"));
app.use(helmet());
app.use(cookieParser());
app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.use(requestLogger);

// Routes
app.use("/auth", authRouter)

app.get("/status", (_, res) => {
    res.send("server is working 👍")
})


export default app;