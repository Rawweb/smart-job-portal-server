import express from 'express';
import {
  applyForJob,
  getMyApplications,
  getJobApplicants,
  updateApplicationStatus,
  getEmployerStats,
} from '../controllers/applicationController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/employer/stats', protect, getEmployerStats);
router.get('/my', protect, getMyApplications);

router.post('/', protect, applyForJob);
router.get('/job/:jobId', protect, getJobApplicants);
router.patch('/:id/status', protect, updateApplicationStatus);

export default router;
