import express from 'express';
import {
  getGraduateProfile,
  updateGraduateProfile,
  updateResume,
  getEmployerProfile,
  updateEmployerProfile,
} from '../controllers/profileController.js';
import protect from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Graduate profile routes
router.get('/graduate', protect, getGraduateProfile);
router.patch('/graduate', protect, updateGraduateProfile);

// Resume update — uses multer wrapper same as onboarding
// We define the error handler inline here since it is small
router.patch(
  '/graduate/resume',
  protect,
  (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  updateResume
);

// Employer profile routes
router.get('/employer', protect, getEmployerProfile);
router.patch('/employer', protect, updateEmployerProfile);

export default router;
