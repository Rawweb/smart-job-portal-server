import Job from '../models/Job.js';
import GraduateProfile from '../models/GraduateProfile.js';
import EmployerProfile from '../models/EmployerProfile.js';
import Application from '../models/Application.js';
import calculateSkillGap from '../utils/skillGapAnalysis.js';

// @desc    Get all active jobs
//          If requester is a graduate, each job includes their
//          compatibility score, matched skills, and missing skills
// @route   GET /api/jobs
// @access  Private
export const getJobs = async (req, res) => {
  try {
    const { sector, jobType, search } = req.query;
    // req.query holds URL query parameters
    // e.g. /api/jobs?sector=IT&jobType=Full-time

    const filter = { isActive: true };
    if (sector) filter.sector = sector;
    if (jobType) filter.jobType = jobType;
    if (search) {
      // $regex allows partial matching — "dev" matches "Developer"
      // $options: 'i' makes it case-insensitive
      filter.title = { $regex: search, $options: 'i' };
    }

    // .lean() returns plain JS objects instead of Mongoose documents
    // This is faster when we just need to read data not modify it
    const jobs = await Job.find(filter).lean().sort({ createdAt: -1 });

    // ── Attach employer profile to each job ──
    // The Job model stores employer as a User _id
    // We need the company name which is in EmployerProfile
    // So we batch-fetch all relevant employer profiles in ONE query
    // instead of querying inside a loop (that would be slow)
    const employerIds = [...new Set(jobs.map((j) => j.employer.toString()))];

    const employerProfiles = await EmployerProfile.find({
      user: { $in: employerIds }, // $in means "where user field is in this array"
    }).lean();

    const profileMap = {};
    employerProfiles.forEach((p) => {
      profileMap[p.user.toString()] = p;
    });

    // Get graduate's skills if the requester is a graduate
    let graduateSkills = [];
    if (req.user.role === 'graduate') {
      const graduateProfile = await GraduateProfile.findOne({
        user: req.user._id,
      }).lean();
      graduateSkills = graduateProfile?.skills || [];
    }

    //Build the final jobs array
    const jobsWithData = jobs.map((job) => {
      const employerProfile = profileMap[job.employer.toString()] || {};

      // Calculate skill gap for this graduate vs this job
      const skillGap =
        req.user.role === 'graduate'
          ? calculateSkillGap(graduateSkills, job.requiredSkills)
          : null;

      return {
        ...job, // spread all original job fields
        companyName: employerProfile.companyName || 'Unknown Company',
        companySize: employerProfile.companySize || '',
        ...(skillGap && {
          compatibilityScore: skillGap.compatibilityScore,
          matchedSkills: skillGap.matchedSkills,
          missingSkills: skillGap.missingSkills,
        }),
      };
    });

    // Sort by compatibility score descending so best matches appear first
    if (req.user.role === 'graduate') {
      jobsWithData.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    }

    res.status(200).json({ jobs: jobsWithData });
  } catch (error) {
    console.error('Get jobs error:', error.message);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
};

// @desc    Get a single job by ID with full skill gap breakdown
// @route   GET /api/jobs/:id
// @access  Private
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const employerProfile = await EmployerProfile.findOne({
      user: job.employer,
    }).lean();

    let skillGap = null;
    if (req.user.role === 'graduate') {
      const graduateProfile = await GraduateProfile.findOne({
        user: req.user._id,
      }).lean();
      const graduateSkills = graduateProfile?.skills || [];
      skillGap = calculateSkillGap(graduateSkills, job.requiredSkills);
    }

    // Check if this graduate has already applied
    let hasApplied = false;
    if (req.user.role === 'graduate') {
      const existing = await Application.findOne({
        job: job._id,
        applicant: req.user._id,
      });
      hasApplied = !!existing;
    }

    res.status(200).json({
      job: {
        ...job,
        companyName: employerProfile?.companyName || 'Unknown Company',
        companyIndustry: employerProfile?.industry || '',
        companyDescription: employerProfile?.description || '',
        companyWebsite: employerProfile?.website || '',
        skillGap,
        hasApplied,
      },
    });
  } catch (error) {
    console.error('Get job by id error:', error.message);
    res.status(500).json({ message: 'Failed to fetch job' });
  }
};

// @desc    Create a new job (employer only)
// @route   POST /api/jobs
// @access  Private — employer only
export const createJob = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Only employers can post jobs' });
    }

    const {
      title,
      description,
      sector,
      location,
      jobType,
      experienceLevel,
      requiredSkills,
      requiredQualification,
      salary,
      deadline,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: 'Job title is required',
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        message: 'Job description is required',
      });
    }

    if (!sector || !sector.trim()) {
      return res.status(400).json({
        message: 'Sector is required',
      });
    }

    if (
      !requiredSkills ||
      !Array.isArray(requiredSkills) ||
      requiredSkills.filter((skill) => skill.trim() !== '').length === 0
    ) {
      return res.status(400).json({
        message: 'Add at least one required skill',
      });
    }

    // clean skills before saving — remove empty strings and trim whitespace
    const cleanedSkills = requiredSkills
      .map((skill) => skill.trim())
      .filter((skill) => skill !== '');

    // If salary is provided, validate that min is not greater than max
    if (salary?.min && salary?.max && Number(salary.min) > Number(salary.max)) {
      return res.status(400).json({
        message: 'Minimum salary cannot exceed maximum salary',
      });
    }

    // deadline validation
    if (deadline && new Date(deadline) < new Date()) {
      return res.status(400).json({
        message: 'Deadline cannot be in the past',
      });
    }

    // create job
    const job = await Job.create({
      employer: req.user._id,
      title: title.trim(),
      description: description.trim(),
      sector: sector.trim(),
      location: location?.trim() || '',
      jobType: jobType || 'Full-time',
      experienceLevel: experienceLevel || 'Entry Level',
      requiredSkills: cleanedSkills,
      requiredQualification: requiredQualification || 'Any',
      salary: {
        min: salary?.min || null,
        max: salary?.max || null,
        currency: salary?.currency || 'NGN',
        isNegotiable: salary?.isNegotiable || false,
      },
      deadline: deadline || null,
    });

    res.status(201).json({ message: 'Job posted successfully', job });
  } catch (error) {
    console.error('Create job error:', error.message);
    res.status(500).json({ message: 'Failed to create job' });
  }
};

// @desc    Get dashboard stats for graduate
// @route   GET /api/jobs/graduate/stats
// @access  Private — graduate only
export const getGraduateStats = async (req, res) => {
  try {
    const graduateProfile = await GraduateProfile.findOne({
      user: req.user._id,
    }).lean();

    const graduateSkills = graduateProfile?.skills || [];

    // Run all three DB queries at the same time with Promise.all
    // instead of one after the other — much faster
    const [totalJobs, totalApplications, allJobs] = await Promise.all([
      Job.countDocuments({ isActive: true }),
      Application.countDocuments({ applicant: req.user._id }),
      Job.find({ isActive: true }).lean(),
    ]);

    // Calculate average compatibility score across all jobs
    let avgScore = 0;
    if (allJobs.length > 0 && graduateSkills.length > 0) {
      const totalScore = allJobs.reduce((sum, job) => {
        const { compatibilityScore } = calculateSkillGap(
          graduateSkills,
          job.requiredSkills
        );
        return sum + compatibilityScore;
      }, 0);
      avgScore = Math.round(totalScore / allJobs.length);
    }

    res.status(200).json({
      stats: {
        totalJobs,
        totalApplications,
        avgCompatibilityScore: avgScore,
        skillsCount: graduateSkills.length,
        fullName: graduateProfile?.fullName || '',
      },
    });
  } catch (error) {
    console.error('Graduate stats error:', error.message);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
