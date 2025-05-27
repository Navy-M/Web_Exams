import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { 
  createTest, 
  assignTest, 
  getTestResults 
} from '../controllers/testController.js';

const router = express.Router();

router.route('/')
  .post(protect, admin, createTest);

router.route('/:testId/assign')
  .post(protect, admin, assignTest);

router.route('/:testId/results')
  .get(protect, admin, getTestResults);

export default router;