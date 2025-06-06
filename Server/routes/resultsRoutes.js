import express from "express";
import { createResult, getResults } from "../controllers/resultsController.js";

const router = express.Router();

router.post("/", createResult);
router.get("/", getResults);

export default router;
