import express from 'express';
import {
  getJobs,
  getJobById,
  createJob,
  getGraduateStats,
} from '../controllers/jobController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/graduate/stats', protect, getGraduateStats);

router.get('/', protect, getJobs);
router.get('/:id', protect, getJobById);
router.post('/', protect, createJob);

export default router;
