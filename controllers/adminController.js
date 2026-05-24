import User from '../models/User.js';
import GraduateProfile from '../models/GraduateProfile.js';
import EmployerProfile from '../models/EmployerProfile.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';

// Helper — check admin role
// We will use this check at the top of every admin function
const requireAdmin = (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return false;
  }
  return true;
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private — admin only
export const getAdminStats = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    // Run all counts simultaneously with Promise.all
    // instead of waiting for each one to finish before starting the next
    const [
      totalUsers,
      totalGraduates,
      totalEmployers,
      totalJobs,
      activeJobs,
      totalApplications,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'graduate' }),
      User.countDocuments({ role: 'employer' }),
      Job.countDocuments(),
      Job.countDocuments({ isActive: true }),
      Application.countDocuments(),
    ]);

    // Get the 5 most recently registered users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email role isOnboarded createdAt')
      // .select() specifies which fields to return
      // This is like SELECT in SQL — we only fetch what we need
      .lean();

    // Get the 5 most recently posted jobs
    const recentJobs = await Job.find().sort({ createdAt: -1 }).limit(5).lean();

    res.status(200).json({
      stats: {
        totalUsers,
        totalGraduates,
        totalEmployers,
        totalJobs,
        activeJobs,
        totalApplications,
        recentUsers,
        recentJobs,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error.message);
    res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
};

// @desc    Get all users (paginated)
// @route   GET /api/admin/users
// @access  Private — admin only
export const getAllUsers = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    // Pagination — instead of loading ALL users at once
    // we load a page at a time
    // ?page=1&limit=20 → first 20 users
    // ?page=2&limit=20 → next 20 users
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    // skip tells MongoDB how many documents to jump over
    // page 1: skip 0, page 2: skip 20, page 3: skip 40

    const { role, search } = req.query;

    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (search) {
      filter.email = { $regex: search, $options: 'i' };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('email role isOnboarded createdAt')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        // Math.ceil rounds up — 21 users / 20 per page = 2 pages
      },
    });
  } catch (error) {
    console.error('Get all users error:', error.message);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// @desc    Get all jobs
// @route   GET /api/admin/jobs
// @access  Private — admin only
export const getAllJobs = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Job.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Job.countDocuments(),
    ]);

    // Attach company names to jobs
    const employerIds = [...new Set(jobs.map((j) => j.employer.toString()))];
    const profiles = await EmployerProfile.find({
      user: { $in: employerIds },
    }).lean();

    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user.toString()] = p;
    });

    const jobsWithCompany = jobs.map((job) => ({
      ...job,
      companyName:
        profileMap[job.employer.toString()]?.companyName || 'Unknown',
    }));

    res.status(200).json({
      jobs: jobsWithCompany,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all jobs error:', error.message);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
};

// @desc    Toggle job active status
// @route   PATCH /api/admin/jobs/:id/toggle
// @access  Private — admin only
export const toggleJobStatus = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Flip the isActive boolean
    // true → false, false → true
    job.isActive = !job.isActive;
    await job.save();

    res.status(200).json({
      message: `Job ${job.isActive ? 'activated' : 'deactivated'} successfully`,
      job,
    });
  } catch (error) {
    console.error('Toggle job error:', error.message);
    res.status(500).json({ message: 'Failed to update job' });
  }
};
