import express from "express";
import {
  createResult,
  getResults,
  getResultsByUser,
  getResultById,
  submitUInfo,
  analyze,
  deleteResult,
  updateTestFeedback,
  prioritizeJobs,
  clearResultAnalysis,
} from "../controllers/resultsController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createResult);
router.post("/submitUInfo", submitUInfo);

router.get("/:resultId", getResultById);

router.delete("/:resultId/analysis", protect, admin, clearResultAnalysis);
router.delete("/:resultId", protect, admin, deleteResult);

router.post("/analyze", analyze);

router.post("/jobs/prioritize", prioritizeJobs);

router.get("/", getResults);

router.post("/submitfeedback", updateTestFeedback);

router.post("/:userId/userResult", getResults);

router.post("/results/list/:userId", protect, admin, getResultsByUser);

export default router;
