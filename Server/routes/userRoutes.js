import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import {
  getUsers,
  getProfile,
  completeProfile,
  deleteUser,
  getUserById
} from "../controllers/userController.js";

const router = express.Router();

router.delete("/:id", protect, deleteUser);
router.post("/completeProf", protect, completeProfile); // Authenticated user's own profile
router.get("/profile", protect, getProfile); // Authenticated user's own profile
router.get("/", protect, admin, getUsers); // Admin: list all users
router.get("/:id", protect, getUserById);


export default router;
