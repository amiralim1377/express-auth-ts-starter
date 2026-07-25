import express, { Express } from "express";
import userRouter from "./routes/user.routes";
import { config } from "./config/env";
import morgan from "morgan";
import { AppError } from "./utils/AppError";
import { globalErrorHandler } from "./middlewares/errorHandler";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { xss } from "express-xss-sanitizer";
import hpp from "hpp";

const app: Express = express();

// 1) Set security HTTP headers
app.use(helmet());

// 2) Trust proxy for production environment
app.set("trust proxy", 1);

// 3) Development logging
if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}

// 4) Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// 5) Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));

// 6) Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 7) Data sanitization against XSS
app.use(xss());

// 8) Prevent parameter pollution (MUST be before routes)
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  }),
);

// 9) Routes
app.use("/api/v2/users", userRouter);

// 10) Handle Unhandled Routes
app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// 11) Global Error Handler
app.use(globalErrorHandler);

export default app;
