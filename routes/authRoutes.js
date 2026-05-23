import express from 'express';
import {
  register,
  login,
  selectRole,
  getMe,
} from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// public routes
router.post('/register', register);
router.post('/login', login);

//private routes
router.post('/select-role', protect, selectRole);
router.get('/me', protect, getMe);

export default router;
