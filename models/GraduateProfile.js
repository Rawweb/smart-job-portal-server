import mongoose from 'mongoose';

const graduateProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    fieldOfStudy: {
      type: String,
      trim: true,
      default: '',
    },
    qualification: {
      type: String,
      enum: ['OND', 'HND', 'BSc', 'MSc', 'PhD', 'Other'],
      default: 'BSc',
    },
    graduationYear: {
      type: Number,
      default: null,
    },
    about: {
      type: String,
      default: '',
    },
    skills: {
      type: [String],
      default: [],
    },
    resume: {
      fileName: { type: String, default: '' },
      filePath: { type: String, default: '' },
      uploadedAt: { type: Date, default: null },
    },
    sector: {
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
  },
  {
    timestamps: true,
  }
);

const GraduateProfile = mongoose.model(
  'GraduateProfile',
  graduateProfileSchema
);

export default GraduateProfile;
