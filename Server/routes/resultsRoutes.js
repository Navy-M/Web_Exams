import express from "express";
import {
  createResult,
  getResults,
  getResultsByUser,
  getResultById,
  submitTestResult,
  analyzeResult,
  deleteResult,
  updateTestFeedback,
  prioritizeJobs,
} from "../controllers/resultsController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createResult);
router.post("/submitUInfo", submitTestResult);

router.get("/:resultId", getResultById);

router.delete("/:resultId", protect, admin, deleteResult);

router.post("/analyze", analyzeResult);

router.post("/prioritize", protect, admin, prioritizeJobs);

router.get("/", getResults);

router.post("/submitfeedback", updateTestFeedback);

router.post("/:userId/userResult", getResults);

router.post("/results/:userId/list", protect, admin, getResultsByUser);

export default router;
