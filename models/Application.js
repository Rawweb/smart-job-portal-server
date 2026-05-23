import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Shortlisted', 'Rejected'],
      default: 'Pending',
    },
    coverLetter: {
      type: String,
      default: '',
    },

    // Skill gap analysis result saved at time of application
    skillGapResult: {
      compatibilityScore: { type: Number, default: 0 },
      matchedSkills: { type: [String], default: [] },
      missingSkills: { type: [String], default: [] },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent a graduate from applying to the same job twice
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);

export default Application;
