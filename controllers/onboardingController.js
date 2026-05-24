import User from '../models/User.js';
import GraduateProfile from '../models/GraduateProfile.js';
import EmployerProfile from '../models/EmployerProfile.js';
import cloudinary from '../config/cloudinary.js';
import { parseResume } from '../utils/resumeParser.js';
import { extractSkills } from '../utils/skillExtractor.js';
import path from 'path';

// Helper: Upload a buffer to Cloudinary
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(buffer);
  });
};

const getResumeExtension = (originalname, mimetype) => {
  const extension = path.extname(originalname || '').toLowerCase();
  if (extension) return extension;
  if (mimetype === 'application/pdf') return '.pdf';
  return '.docx';
};

// @desc    Upload resume + extract skills
// @route   POST /api/onboarding/resume
// @access  Private
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file received. Please upload a PDF or DOCX file.',
      });
    }

    const { buffer, originalname, mimetype } = req.file;

    const text = await parseResume(buffer, mimetype);
    const extractedSkills = extractSkills(text);

    const uploadResult = await uploadToCloudinary(buffer, {
      resource_type: 'raw',
      folder: 'skillbridge/resumes',
      public_id: `resume-${req.user._id}${getResumeExtension(
        originalname,
        mimetype
      )}`,
      overwrite: true, // replace existing file with same public_id
    });

    await GraduateProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        resume: {
          fileName: originalname,
          filePath: uploadResult.secure_url,
          uploadedAt: new Date(),
        },
      }
    );

    res.status(200).json({
      message: 'Resume uploaded successfully',
      fileName: originalname,
      fileUrl: uploadResult.secure_url,
      extractedSkills,
    });
  } catch (error) {
    console.error('Resume upload error:', error.message);
    res
      .status(500)
      .json({ message: error.message || 'Failed to upload resume' });
  }
};

// @desc    Complete graduate onboarding
// @route   POST /api/onboarding/graduate
// @access  Private
export const completeGraduateOnboarding = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      location,
      fieldOfStudy,
      qualification,
      graduationYear,
      about,
      skills,
    } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }
    if (!fieldOfStudy || !fieldOfStudy.trim()) {
      return res.status(400).json({ message: 'Field of study is required' });
    }

    if (!location || !location.trim()) {
      return res.status(400).json({ message: 'Location is required' });
    }

    if (!qualification || !qualification.trim()) {
      return res.status(400).json({ message: 'Qualification is required' });
    }

    if (!graduationYear) {
      return res.status(400).json({ message: 'Graduation year is required' });
    }

    if (!skills || skills.length === 0) {
      return res.status(400).json({ message: 'Add at least one skill' });
    }

    const updatedProfile = await GraduateProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        fullName: fullName.trim(),
        phone: phone?.trim() || '',
        location: location?.trim() || '',
        fieldOfStudy: fieldOfStudy?.trim() || '',
        qualification: qualification || 'BSc',
        graduationYear: graduationYear ? Number(graduationYear) : null,
        about: about?.trim() || '',
        skills,
      }
    );
    // isOnboarded: true unlocks the full dashboard
    await User.findByIdAndUpdate(req.user._id, { isOnboarded: true });

    res.status(200).json({
      message: 'Onboarding completed successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Graduate onboarding error:', error.message);
    res.status(500).json({ message: 'Failed to complete onboarding' });
  }
};

// @desc    Complete employer onboarding
// @route   POST /api/onboarding/employer
// @access  Private
export const completeEmployerOnboarding = async (req, res) => {
  try {
    const {
      companyName,
      industry,
      companySize,
      location,
      website,
      description,
    } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    if (!industry) {
      return res.status(400).json({ message: 'Industry is required' });
    }

    if (!location || !location.trim()) {
      return res.status(400).json({ message: 'Location is required' });
    }

    if (!description || !description.trim()) {
      return res
        .status(400)
        .json({ message: 'Company description is required' });
    }

    if (website && website.trim()) {
      const websiteRegex =
        /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;

      if (!websiteRegex.test(website.trim())) {
        return res.status(400).json({ message: 'Enter a valid website URL' });
      }
    }

    const updatedProfile = await EmployerProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        companyName: companyName.trim(),
        industry: industry.trim(),
        companySize: companySize || '1-10',
        location: location.trim(),
        website: website?.trim() || '',
        description: description.trim(),
      },
      {
        new: true,
      }
    );

    await User.findByIdAndUpdate(req.user._id, { isOnboarded: true });

    res.status(200).json({
      message: 'Onboarding completed successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Employer onboarding error:', error.message);
    res.status(500).json({ message: 'Failed to complete onboarding' });
  }
};
