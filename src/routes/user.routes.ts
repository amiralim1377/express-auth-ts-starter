import express from "express";
import {
  forgotPassword,
  login,
  protect,
  resetPassword,
  restrictTo,
  signUp,
  updatePassword,
} from "../controllers/authController";

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", login);
router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:token", resetPassword);
router.patch("/updateMyPassword", protect, updatePassword);

router.get("/test-protect", protect, restrictTo("admin"), (req, res) => {
  res.status(200).json({ message: "شما با موفقیت از بادیگارد رد شدید!" });
});

export default router;
