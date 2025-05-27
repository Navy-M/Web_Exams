import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { getUsers } from '../controllers/userController.js';

const router = express.Router();

router.route('/')
  .get(protect, admin, getUsers);

export default router;