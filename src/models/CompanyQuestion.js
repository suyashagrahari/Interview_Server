const mongoose = require("mongoose");

/**
 * Dynamic Company Question Schema
 * This will be used to create collections like GoogleQuestions, MicrosoftAzureQuestions, etc.
 */
const companyQuestionSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    jobRole: {
      type: String,
      required: [true, "Job role is required"],
      trim: true,
    },
    experienceLevel: {
      type: String,
      required: [true, "Experience level is required"],
      enum: ["0-2", "3-4", "5-6", "7-8", "9-10"],
    },
    difficultyLevel: {
      type: String,
      required: [true, "Difficulty level is required"],
      enum: ["beginner", "intermediate", "expert"],
    },
    questionType: {
      type: String,
      required: [true, "Question type is required"],
      enum: ["Code", "SystemDesign", "Normal"],
    },
    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    expectedAnswer: {
      type: String,
      required: [true, "Expected answer is required"],
      trim: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better performance
companyQuestionSchema.index({ companyName: 1 });
companyQuestionSchema.index({ jobRole: 1 });
companyQuestionSchema.index({ experienceLevel: 1 });
companyQuestionSchema.index({ difficultyLevel: 1 });
companyQuestionSchema.index({ questionType: 1 });
companyQuestionSchema.index({ createdAt: -1 });

/**
 * Dynamic Model Factory
 * Creates or retrieves a mongoose model for a specific company
 * Collection name format: {companyName}Questions (e.g., GoogleQuestions, MicrosoftAzureQuestions)
 */
class CompanyQuestionModelFactory {
  static getModel(companyName) {
    // Sanitize company name for collection name
    const collectionName = this.sanitizeCollectionName(companyName);

    // Check if model already exists
    if (mongoose.models[collectionName]) {
      return mongoose.models[collectionName];
    }

    // Create new model with dynamic collection name
    return mongoose.model(
      collectionName,
      companyQuestionSchema,
      collectionName
    );
  }

  static sanitizeCollectionName(companyName) {
    // Remove any non-alphanumeric characters except spaces
    let name = companyName.trim().replace(/[^a-zA-Z0-9\s]/g, "");

    // Remove spaces completely (e.g., "Microsoft Azure" → "MicrosoftAzure")
    name = name.replace(/\s+/g, "");

    // Add "Questions" suffix
    return `${name}Questions`;
  }
}

module.exports = CompanyQuestionModelFactory;
module.exports.schema = companyQuestionSchema;
