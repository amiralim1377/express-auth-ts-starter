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

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401,
      ),
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401),
    );
  }

  req.user = currentUser;

  next();
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // roles ['admin', 'user']. role='user'
    if (!roles.includes(req.user?.role as string)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }

    next();
  };
};
