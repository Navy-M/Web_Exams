import express from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  getProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/logout", logoutUser);
router.post("/profile", protect, getProfile);

export default router;
