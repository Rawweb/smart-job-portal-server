import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
    role: {
      type: String,
      enum: ['graduate', 'employer', 'admin'],
      default: null,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// This runs automatically before every save
// It hashes the password so we never store plain text
userSchema.pre('save', async function () {
  // Only hash if password was changed or is new
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// A method we can call on any user to check their password at login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
