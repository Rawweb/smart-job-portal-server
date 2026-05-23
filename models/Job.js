import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
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
      required: true,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    jobType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'],
      default: 'Full-time',
    },
    experienceLevel: {
      type: String,
      enum: ['Entry Level', 'Mid Level', 'Senior Level'],
      default: 'Entry Level',
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    requiredQualification: {
      type: String,
      enum: ['OND', 'HND', 'BSc', 'MSc', 'PhD', 'Any'],
      default: 'Any',
    },
    salary: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: { type: String, default: 'NGN' },
      isNegotiable: { type: Boolean, default: false },
    },
    deadline: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicationCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Job = mongoose.model('Job', jobSchema);

export default Job;
