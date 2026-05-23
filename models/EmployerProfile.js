import mongoose from 'mongoose';

const employerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    industry: {
      type: String,
      enum: [
        'Information Technology',
        'Banking and Finance',
        'Education',
        'Healthcare Administration',
        'Engineering and Technical Services',
        'Other',
      ],
      default: 'Other',
    },
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
      default: '1-10',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    logo: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const EmployerProfile = mongoose.model(
  'EmployerProfile',
  employerProfileSchema
);

export default EmployerProfile;
