const mongoose = require("mongoose");

const jobTitleSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Job title text is required"],
      trim: true,
      maxlength: [200, "Job title cannot be more than 200 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better performance
jobTitleSchema.index({ text: 1 });
jobTitleSchema.index({ createdAt: -1 });

module.exports = mongoose.model("JobTitle", jobTitleSchema);
