const mongoose = require("mongoose");

/**
 * TopicQuestionsAsked Schema
 * Tracks which questions have been asked to users during topic interviews
 * Prevents question repetition for specific user, topic, difficulty, and experience combinations
 */
const topicQuestionsAskedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TopicInterview",
      required: [true, "Interview ID is required"],
      index: true,
    },
    topicName: {
      type: String,
      required: [true, "Topic name is required"],
      trim: true,
      index: true,
    },
    difficultyLevel: {
      type: String,
      required: [true, "Difficulty level is required"],
      enum: ["beginner", "intermediate", "expert"],
      index: true,
    },
    experienceLevel: {
      type: String,
      required: [true, "Experience level is required"],
      enum: ["0-2", "3-4", "5-6", "7-8", "9-10"],
      index: true,
    },
    interviewType: {
      type: String,
      required: [true, "Interview type is required"],
      enum: ["technical", "behavioral"],
      default: "technical",
      index: true,
    },
    // Array of asked question IDs
    askedQuestionIds: [
      {
        type: String,
        required: true,
      },
    ],
    // Track question types
    questionCounts: {
      introduction: {
        type: Number,
        default: 0,
      },
      followup: {
        type: Number,
        default: 0,
      },
      pool: {
        type: Number,
        default: 0,
      },
    },
    lastAskedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups
topicQuestionsAskedSchema.index({
  userId: 1,
  topicName: 1,
  difficultyLevel: 1,
  experienceLevel: 1,
  interviewType: 1,
});

topicQuestionsAskedSchema.index({ interviewId: 1 });
topicQuestionsAskedSchema.index({ createdAt: -1 });

/**
 * Static method to add asked question
 */
topicQuestionsAskedSchema.statics.addAskedQuestion = async function (
  userId,
  interviewId,
  topicName,
  difficultyLevel,
  experienceLevel,
  interviewType,
  questionId,
  questionType = "pool"
) {
  try {
    // Find or create the record
    let record = await this.findOne({
      userId,
      interviewId,
      topicName,
      difficultyLevel,
      experienceLevel,
      interviewType,
    });

    if (!record) {
      record = new this({
        userId,
        interviewId,
        topicName,
        difficultyLevel,
        experienceLevel,
        interviewType,
        askedQuestionIds: [questionId],
        questionCounts: {
          [questionType]: 1,
        },
        lastAskedAt: new Date(),
      });
    } else {
      // Add question ID if not already in the array
      if (!record.askedQuestionIds.includes(questionId)) {
        record.askedQuestionIds.push(questionId);
        record.questionCounts[questionType] =
          (record.questionCounts[questionType] || 0) + 1;
        record.lastAskedAt = new Date();
      }
    }

    return await record.save();
  } catch (error) {
    console.error("Error adding asked question:", error);
    throw error;
  }
};

/**
 * Static method to get asked question IDs for a user/topic combo
 * Returns ALL asked questions across ALL interviews for this user/topic combination
 */
topicQuestionsAskedSchema.statics.getAskedQuestionIds = async function (
  userId,
  topicName,
  difficultyLevel,
  experienceLevel,
  interviewType
) {
  try {
    // Get ALL records for this user/topic combination across all interviews
    const records = await this.find({
      userId,
      topicName,
      difficultyLevel,
      experienceLevel,
      interviewType,
      isActive: true,
    });

    // Combine all asked question IDs from all interviews
    const allAskedQuestionIds = [];
    records.forEach(record => {
      allAskedQuestionIds.push(...record.askedQuestionIds);
    });

    // Remove duplicates
    return [...new Set(allAskedQuestionIds)];
  } catch (error) {
    console.error("Error getting asked question IDs:", error);
    return [];
  }
};

/**
 * Static method to check if a question has been asked
 */
topicQuestionsAskedSchema.statics.isQuestionAsked = async function (
  userId,
  interviewId,
  questionId
) {
  try {
    const record = await this.findOne({
      userId,
      interviewId,
      askedQuestionIds: questionId,
      isActive: true,
    });

    return !!record;
  } catch (error) {
    console.error("Error checking if question is asked:", error);
    return false;
  }
};

/**
 * Static method to get question counts for an interview
 */
topicQuestionsAskedSchema.statics.getQuestionCounts = async function (
  userId,
  interviewId
) {
  try {
    const record = await this.findOne({
      userId,
      interviewId,
      isActive: true,
    });

    return record
      ? record.questionCounts
      : {
          introduction: 0,
          followup: 0,
          pool: 0,
        };
  } catch (error) {
    console.error("Error getting question counts:", error);
    return {
      introduction: 0,
      followup: 0,
      pool: 0,
    };
  }
};

/**
 * Instance method to mark as inactive
 */
topicQuestionsAskedSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.model("TopicQuestionsAsked", topicQuestionsAskedSchema);
