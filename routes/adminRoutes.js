import express from 'express';
import {
  getAdminStats,
  getAllUsers,
  getAllJobs,
  toggleJobStatus,
} from '../controllers/adminController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// protect runs on all admin routes
// The admin check happens inside each controller
// You could also add a separate adminOnly middleware
// but since we have a helper function it stays clean this way

router.get('/stats', protect, getAdminStats);
router.get('/users', protect, getAllUsers);
router.get('/jobs', protect, getAllJobs);
router.patch('/jobs/:id/toggle', protect, toggleJobStatus);

export default router;
