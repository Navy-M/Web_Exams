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
  getExamSession,
  startExamSession,
  saveExamDraft,
} from "../controllers/resultsController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createResult);
router.post("/submitUInfo", protect, submitUInfo);
router.get("/sessions/:testType", protect, getExamSession);
router.post("/sessions", protect, startExamSession);
router.put("/sessions/:sessionId/draft", protect, saveExamDraft);

router.delete("/:resultId/analysis", protect, admin, clearResultAnalysis);
router.delete("/:resultId", protect, admin, deleteResult);

router.post("/analyze", protect, admin, analyze);

router.post("/jobs/prioritize", protect, admin, prioritizeJobs);

router.get("/", protect, admin, getResults);

router.post("/submitfeedback", protect, admin, updateTestFeedback);

router.post("/:userId/userResult", protect, admin, getResultsByUser);

router.post("/list/:userId", protect, admin, getResultsByUser);

router.get("/:resultId", protect, getResultById);

export default router;
