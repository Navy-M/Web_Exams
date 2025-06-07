import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import {
  getUsers,
  getProfile,
  updateTestFeedback,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/profile", protect, getProfile); // Authenticated user's own profile
router.get("/", protect, admin, getUsers); // Admin: list all users
router.patch("/:userId/results/:resultId/evaluate", updateTestFeedback);

export default router;
