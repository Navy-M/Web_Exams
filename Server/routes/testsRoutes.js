import express from "express";
import {
  getTestQuestions,
} from "../controllers/testsController.js";

const router = express.Router();

router.post("/getquestions", getTestQuestions);


export default router;
