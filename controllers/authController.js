import User from '../models/User.js';
import GraduateProfile from '../models/GraduateProfile.js';
import EmployerProfile from '../models/EmployerProfile.js';
import generateToken from '../utils/generateToken.js';

// @desc register new user
// @access public
// @route POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'An account with this email aleady exists',
      });
    }

    const user = await User.create({ email, password });

    // generate token for this user
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({
      message: 'Server error occurred while creating an account',
    });
  }
};

// @desc login user
// @access public
// @route POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    // find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      message: 'Server error occurred while logging in',
    });
  }
};

// @desc select role and onboard after successful registration
// @access private
// @route POST /api/auth/select-role
export const selectRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['graduate', 'employer'].includes(role)) {
      return res.status(400).json({
        message: 'Role must be either graduate or employer',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // prevent changing role after it's set
    if (user.role !== null) {
      return res.status(400).json({
        message: 'Role has already been set and cannot be changed',
      });
    }

    // set the role
    user.role = role;
    await user.save();

    // create an empty profile for the user based on their role
    // this way the profile document always exists — we just update it
    // during onboarding instead of creating it later
    if (role === 'graduate') {
      await GraduateProfile.create({ user: user._id });
    } else if (role === 'employer') {
      await EmployerProfile.create({ user: user._id });
    }

    res.status(200).json({
      message: 'Role selected successfully',
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Error selecting role:', error.message);
    res.status(500).json({
      message: 'Server error occurred while selecting role',
    });
  }
};

// @desc get current logged in user info
// @access private
// @route GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    // req.user is already attached by the protect middleware
    // We just return it — no extra DB query needed
    res.status(200).json({
      user: {
        _id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        isOnboarded: req.user.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Get me error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};