import express, { Express } from "express";
import userRouter from "./routes/user.routes";
import { config } from "./config/env";
import morgan from "morgan";
import { AppError } from "./utils/AppError";
import { globalErrorHandler } from "./middlewares/errorHandler";

const app: Express = express();

if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}

app.use(express.json());

app.use("/api/v2/users", userRouter);

app.all("/{*splat}", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

export default app;
