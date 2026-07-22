import express from "express";
import { signUp } from "../controllers/authController";

const router = express.Router();

router.post("/signup", signUp);

export default router;
