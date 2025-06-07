import express from "express";
import { createResult, getResults, getResultsByUser } from "../controllers/resultsController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createResult);
router.get("/", getResults);
router.post("/results/:userId/list", protect, admin, getResultsByUser);

export default router;
