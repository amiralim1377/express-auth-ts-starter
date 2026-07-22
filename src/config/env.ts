import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(`❌ Missing mandatory environment variable: ${key}`);
  }

  return value;
};

export const config = {
  port: parseInt(getEnvVar("PORT", "3000")),
  nodeEnv: getEnvVar("NODE_ENV", "development"),
  mongoUri: getEnvVar("MONGO_URI"),
};
