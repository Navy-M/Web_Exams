import express from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
} from "../controllers/authController.js";
const router = express.Router();
router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/logout", logoutUser);
export default router;
