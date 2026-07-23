import express from "express";
import {
  login,
  protect,
  restrictTo,
  signUp,
} from "../controllers/authController";

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", login);

router.get("/test-protect", protect, restrictTo("admin"), (req, res) => {
  res.status(200).json({ message: "شما با موفقیت از بادیگارد رد شدید!" });
});

export default router;
