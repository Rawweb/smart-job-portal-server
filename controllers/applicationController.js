import Application from '../models/Application.js';
import Job from '../models/Job.js';
import GraduateProfile from '../models/GraduateProfile.js';
import EmployerProfile from '../models/EmployerProfile.js';
import calculateSkillGap from '../utils/skillGapAnalysis.js';

// @desc    Apply for a job
// @route   POST /api/applications
// @access  Private — graduate only
export const applyForJob = async (req, res) => {
  try {
    const { jobId, coverLetter } = req.body;

    if (req.user.role !== 'graduate') {
      return res
        .status(403)
        .json({ message: 'Only graduates can apply for jobs' });
    }

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    // Make sure the job exists and is still active
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (!job.isActive) {
      return res
        .status(400)
        .json({ message: 'This job is no longer accepting applications' });
    }

    // Check for duplicate application
    // The Application model has a compound unique index on job + applicant
    // so MongoDB would reject it anyway, but we check first for a cleaner message
    const existing = await Application.findOne({
      job: jobId,
      applicant: req.user._id,
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: 'You have already applied for this job' });
    }

    // Get the graduate's skills to calculate skill gap at time of application
    // We save this snapshot so even if the graduate updates their skills later
    // the employer always sees what they had when they applied
    const graduateProfile = await GraduateProfile.findOne({
      user: req.user._id,
    }).lean();

    const graduateSkills = graduateProfile?.skills || [];
    const skillGap = calculateSkillGap(graduateSkills, job.requiredSkills);

    // Create the application with the skill gap snapshot saved inside it
    const application = await Application.create({
      job: jobId,
      applicant: req.user._id,
      coverLetter: coverLetter?.trim() || '',
      skillGapResult: {
        compatibilityScore: skillGap.compatibilityScore,
        matchedSkills: skillGap.matchedSkills,
        missingSkills: skillGap.missingSkills,
      },
    });

    // Increment the job's application counter
    await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });
    // $inc increments a number field by the given amount

    res.status(201).json({
      message: 'Application submitted successfully',
      application,
    });
  } catch (error) {
    console.error('Apply error:', error.message);
    res.status(500).json({ message: 'Failed to submit application' });
  }
};

// @desc    Get graduate's own applications
// @route   GET /api/applications/my
// @access  Private — graduate only
export const getMyApplications = async (req, res) => {
  try {
    // .populate() replaces the job ID with the actual job document
    // Without populate, we only get the ID — not the title, sector, etc.
    const applications = await Application.find({
      applicant: req.user._id,
    })
      .populate('job', 'title sector jobType location employer isActive')
      .lean()
      .sort({ createdAt: -1 });

    // Now attach employer company name to each application
    // Collect all unique employer IDs from the populated jobs
    const employerIds = [
      ...new Set(
        applications
          .filter((a) => a.job?.employer)
          .map((a) => a.job.employer.toString())
      ),
    ];

    const employerProfiles = await EmployerProfile.find({
      user: { $in: employerIds },
    }).lean();

    const profileMap = {};
    employerProfiles.forEach((p) => {
      profileMap[p.user.toString()] = p;
    });

    const enriched = applications.map((app) => ({
      ...app,
      companyName:
        profileMap[app.job?.employer?.toString()]?.companyName ||
        'Unknown Company',
    }));

    res.status(200).json({ applications: enriched });
  } catch (error) {
    console.error('Get applications error:', error.message);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
};

// @desc    Get all applicants for a specific job (employer)
// @route   GET /api/applications/job/:jobId
// @access  Private — employer only
export const getJobApplicants = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Make sure this employer owns this job
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not own this job' });
    }

    const applications = await Application.find({ job: req.params.jobId })
      .populate('applicant', 'email')
      .lean()
      .sort({ 'skillGapResult.compatibilityScore': -1 });
    // Sort by score descending so best matches are shown first

    // Attach graduate profile info to each application
    const applicantIds = applications.map((a) => a.applicant._id);

    const graduateProfiles = await GraduateProfile.find({
      user: { $in: applicantIds },
    }).lean();

    const gradMap = {};
    graduateProfiles.forEach((p) => {
      gradMap[p.user.toString()] = p;
    });

    const enriched = applications.map((app) => ({
      ...app,
      graduateProfile: gradMap[app.applicant._id.toString()] || {},
    }));

    res.status(200).json({ applications: enriched, job });
  } catch (error) {
    console.error('Get applicants error:', error.message);
    res.status(500).json({ message: 'Failed to fetch applicants' });
  }
};

// @desc    Update application status (employer)
// @route   PATCH /api/applications/:id/status
// @access  Private — employer only
export const updateApplicationStatus = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status } = req.body;
    const validStatuses = ['Pending', 'Reviewed', 'Shortlisted', 'Rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const application = await Application.findById(req.params.id).populate(
      'job'
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Confirm the employer owns the job this application belongs to
    if (application.job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    application.status = status;
    await application.save();

    res.status(200).json({
      message: 'Application status updated',
      application,
    });
  } catch (error) {
    console.error('Update status error:', error.message);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

// @desc    Get employer dashboard stats
// @route   GET /api/applications/employer/stats
// @access  Private — employer only
export const getEmployerStats = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get all jobs posted by this employer
    const myJobs = await Job.find({ employer: req.user._id }).lean();
    const myJobIds = myJobs.map((j) => j._id);

    const [totalApplications, shortlisted, recentJobs] = await Promise.all([
      Application.countDocuments({ job: { $in: myJobIds } }),
      Application.countDocuments({
        job: { $in: myJobIds },
        status: 'Shortlisted',
      }),
      Job.find({ employer: req.user._id })
        .lean()
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    // Get application counts per job for the recent jobs list
    const appCounts = await Application.aggregate([
      { $match: { job: { $in: myJobIds } } },
      // aggregate lets us group and count in one query
      { $group: { _id: '$job', count: { $sum: 1 } } },
    ]);

    // Build a map of jobId → application count
    const appCountMap = {};
    appCounts.forEach((item) => {
      appCountMap[item._id.toString()] = item.count;
    });

    const recentJobsWithCounts = recentJobs.map((job) => ({
      ...job,
      applicationCount: appCountMap[job._id.toString()] || 0,
    }));

    const employerProfile = await EmployerProfile.findOne({
      user: req.user._id,
    }).lean();

    res.status(200).json({
      stats: {
        totalJobs: myJobs.length,
        activeJobs: myJobs.filter((j) => j.isActive).length,
        totalApplications,
        shortlisted,
        companyName: employerProfile?.companyName || '',
        recentJobs: recentJobsWithCounts,
      },
    });
  } catch (error) {
    console.error('Employer stats error:', error.message);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
