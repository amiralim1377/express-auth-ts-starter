import { Request, Response, NextFunction } from "express";
import User from "../models/userModel";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, password, email } = req.body;
  const newUser = await User.create({ name, password, email });

  newUser.password = undefined;

  res.status(201).json({
    status: "success",
    message: "user signup successfully",
    data: {
      user: newUser,
    },
  });
};
