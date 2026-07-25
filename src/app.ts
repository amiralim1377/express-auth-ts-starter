import express, { Express } from "express";
import userRouter from "./routes/user.routes";
import { config } from "./config/env";
import morgan from "morgan";
import { AppError } from "./utils/AppError";
import { globalErrorHandler } from "./middlewares/errorHandler";
import rateLimit, { MINUTE } from "express-rate-limit";

const app: Express = express();

if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}

app.set("trust proxy", 1);

if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api", limiter);

app.use(express.json({ limit: "10kb" }));

app.use("/api/v2/users", userRouter);

app.all("/{*splat}", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl}`, 400));
});

app.use(globalErrorHandler);

export default app;
