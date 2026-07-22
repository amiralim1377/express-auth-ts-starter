import express, { Express, Request, Response } from "express";

const app: Express = express();

// a route for test

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to Express 5 + TypeScript Auth API!",
  });
});

export default app;
