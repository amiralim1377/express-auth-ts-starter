import User from "../models/userModel";
import { AppError } from "../utils/AppError";
import { Request, Response, NextFunction } from "express";

interface UpdateMeBody {
  name?: string;
  email?: string;
}

const filterObj = (
  obj: UpdateMeBody,
  ...allowedFields: (keyof UpdateMeBody)[]
) => {
  const newObj: Partial<UpdateMeBody> = {};

  Object.keys(obj).forEach((el) => {
    const key = el as keyof UpdateMeBody;

    if (allowedFields.includes(key)) {
      newObj[key] = obj[key];
    }
  });

  return newObj;
};

export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.body?.password || req.body?.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400,
      ),
    );
  }

  const filteredBody = filterObj(req.body, "name", "email");

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
};

export const deleteMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await User.findByIdAndUpdate(req.user?._id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    console.log(error);
  }
};
