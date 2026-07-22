import jwt from "jsonwebtoken";
import { config } from "../config/env";

const signToken = (id: string): string => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });
};

export { signToken };
