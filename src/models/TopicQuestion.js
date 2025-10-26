const mongoose = require("mongoose");

/**
 * Dynamic Topic Question Schema
 * This will be used to create collections like ReactQuestions, NodeJSQuestions, etc.
 */
const topicQuestionSchema = new mongoose.Schema(
  {
    topicName: {
      type: String,
      required: [true, "Topic name is required"],
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
topicQuestionSchema.index({ topicName: 1 });
topicQuestionSchema.index({ experienceLevel: 1 });
topicQuestionSchema.index({ difficultyLevel: 1 });
topicQuestionSchema.index({ createdAt: -1 });

/**
 * Dynamic Model Factory
 * Creates or retrieves a mongoose model for a specific topic
 * Collection name format: {topicName}Questions (e.g., ReactQuestions, NodeJSQuestions)
 */
class TopicQuestionModelFactory {
  static getModel(topicName) {
    // Sanitize topic name for collection name
    const collectionName = this.sanitizeCollectionName(topicName);

    // Check if model already exists
    if (mongoose.models[collectionName]) {
      return mongoose.models[collectionName];
    }

    // Create new model with dynamic collection name
    return mongoose.model(collectionName, topicQuestionSchema, collectionName);
  }

  static sanitizeCollectionName(topicName) {
    // Remove any non-alphanumeric characters except spaces
    let name = topicName.trim().replace(/[^a-zA-Z0-9\s]/g, "");

    // Remove spaces completely (e.g., "Microsoft Azure" → "MicrosoftAzure")
    name = name.replace(/\s+/g, "");

    // Add "Questions" suffix
    return `${name}Questions`;
  }
}

module.exports = TopicQuestionModelFactory;
module.exports.schema = topicQuestionSchema;
