import express from "express";
import {
  createResult,
  getResults,
  getResultsByUser,
  submitTestResult,
  analyzeResult,
  deleteResult
} from "../controllers/resultsController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createResult);
router.post("/submitUInfo", submitTestResult);

router.delete('/:resultId',protect, admin, deleteResult);

router.post("/analyze", analyzeResult);

router.get("/", getResults);

router.post("/:userId/userResult", getResults);

router.post("/results/:userId/list", protect, admin, getResultsByUser);

export default router;
