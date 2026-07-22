import { Request, Response, NextFunction } from "express";
import User from "../models/userModel";
import { signToken } from "../utils/signToken";
import { AppError } from "../utils/AppError";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import { config } from "../config/env";

export const signUp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, password, email } = req.body;
  const newUser = await User.create({ name, password, email });

  newUser.password = undefined;
  const token = signToken(newUser._id.toString());

  res.status(201).json({
    status: "success",
    message: "user signup successfully",
    token,
    data: {
      user: newUser,
    },
  });
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (
    !user ||
    !(await user.correctPassword(password, user.password as string))
  ) {
    return next(new AppError("Incorrect email or password", 401));
  }

  const token = signToken(user._id.toString());

  res.status(200).json({
    stats: "success",
    token,
  });
};

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401),
    );
  }

  const decoded = await (promisify(jwt.verify) as any)(token, config.jwtSecret);

  console.log("Decoded Token:", decoded);

  next();
};
