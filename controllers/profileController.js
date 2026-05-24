import GraduateProfile from '../models/GraduateProfile.js';
import EmployerProfile from '../models/EmployerProfile.js';
import cloudinary from '../config/cloudinary.js';
import { parseResume } from '../utils/resumeParser.js';
import { extractSkills } from '../utils/skillExtractor.js';
import path from 'path';

const getResumeExtension = (originalname, mimetype) => {
  const extension = path.extname(originalname || '').toLowerCase();
  if (extension) return extension;
  if (mimetype === 'application/pdf') return '.pdf';
  return '.docx';
};

// @desc    Get graduate's own profile
// @route   GET /api/profile/graduate
// @access  Private — graduate only
export const getGraduateProfile = async (req, res) => {
  try {
    // .populate('user', 'email') replaces the user ObjectId
    // with the actual user document but only returns the email field
    // We need the email to display on the profile page
    const profile = await GraduateProfile.findOne({
      user: req.user._id,
    }).populate('user', 'email');

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.status(200).json({ profile });
  } catch (error) {
    console.error('Get graduate profile error:', error.message);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// @desc    Update graduate profile
// @route   PATCH /api/profile/graduate
// @access  Private — graduate only
export const updateGraduateProfile = async (req, res) => {
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

    // Build an update object with only the fields that were actually sent
    // If a field is undefined (not sent), we skip it
    // This prevents accidentally clearing fields the user did not touch
    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (location !== undefined) updates.location = location.trim();
    if (fieldOfStudy !== undefined) updates.fieldOfStudy = fieldOfStudy.trim();
    if (qualification !== undefined) updates.qualification = qualification;
    if (graduationYear !== undefined) {
      updates.graduationYear = graduationYear ? Number(graduationYear) : null;
    }
    if (about !== undefined) updates.about = about.trim();
    if (skills !== undefined) updates.skills = skills;

    // findOneAndUpdate with { new: true } returns the updated document
    // not the old one — which is what we want to send back
    const profile = await GraduateProfile.findOneAndUpdate(
      { user: req.user._id },
      updates,
      { new: true }
    ).populate('user', 'email');

    res.status(200).json({
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error) {
    console.error('Update graduate profile error:', error.message);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// @desc    Update resume on profile page
// @route   PATCH /api/profile/graduate/resume
// @access  Private — graduate only
export const updateResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file received. Please upload a PDF or DOCX file.',
      });
    }

    const { buffer, originalname, mimetype } = req.file;

    // Parse for skills and upload to Cloudinary
    // Same logic as onboarding — we extracted this into utils
    // so we can reuse it here without repeating code
    const text = await parseResume(buffer, mimetype);
    const extractedSkills = extractSkills(text);

    const cloudinaryUrl = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'skillbridge/resumes',
          public_id: `resume-${req.user._id}${getResumeExtension(
            originalname,
            mimetype
          )}`,
          overwrite: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );
      stream.end(buffer);
    });

    const profile = await GraduateProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        resume: {
          fileName: originalname,
          filePath: cloudinaryUrl,
          uploadedAt: new Date(),
        },
      },
      { new: true }
    ).populate('user', 'email');

    res.status(200).json({
      message: 'Resume updated successfully',
      profile,
      extractedSkills,
    });
  } catch (error) {
    console.error('Update resume error:', error.message);
    res.status(500).json({ message: 'Failed to update resume' });
  }
};

// @desc    Get employer's own profile
// @route   GET /api/profile/employer
// @access  Private — employer only
export const getEmployerProfile = async (req, res) => {
  try {
    const profile = await EmployerProfile.findOne({
      user: req.user._id,
    }).populate('user', 'email');

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.status(200).json({ profile });
  } catch (error) {
    console.error('Get employer profile error:', error.message);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// @desc    Update employer profile
// @route   PATCH /api/profile/employer
// @access  Private — employer only
export const updateEmployerProfile = async (req, res) => {
  try {
    const {
      companyName,
      industry,
      companySize,
      location,
      website,
      description,
    } = req.body;

    const updates = {};
    if (companyName !== undefined) updates.companyName = companyName.trim();
    if (industry !== undefined) updates.industry = industry;
    if (companySize !== undefined) updates.companySize = companySize;
    if (location !== undefined) updates.location = location.trim();
    if (website !== undefined) updates.website = website.trim();
    if (description !== undefined) updates.description = description.trim();

    const profile = await EmployerProfile.findOneAndUpdate(
      { user: req.user._id },
      updates,
      { new: true }
    ).populate('user', 'email');

    res.status(200).json({
      message: 'Company profile updated successfully',
      profile,
    });
  } catch (error) {
    console.error('Update employer profile error:', error.message);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};
