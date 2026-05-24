import express from 'express';
import multer from 'multer';
import {
  uploadResume,
  completeGraduateOnboarding,
  completeEmployerOnboarding,
} from '../controllers/onboardingController.js';
import protect from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// This is a custom wrapper around the resume route
// It catches multer errors (wrong file type, file too large)
// and returns a clean JSON response instead of crashing
const resumeUploadHandler = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'File is too large. Maximum allowed size is 5MB.',
        });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }

    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

router.post('/resume', protect, resumeUploadHandler, uploadResume);
router.post('/graduate', protect, completeGraduateOnboarding);
router.post('/employer', protect, completeEmployerOnboarding);

export default router;
