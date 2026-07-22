import mongoose from "mongoose";
import app from "./app";
import { config } from "./config/env";

const startServer = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("🌱 Successfully connected to MongoDB!");

    app.listen(config.port, () => {
      console.log(
        `🚀 Server running in ${config.nodeEnv} mode on http://localhost:${config.port}`,
      );
    });
  } catch (error) {
    console.error("💥 Database connection failed:", error);
    process.exit(1);
  }
};

startServer();
