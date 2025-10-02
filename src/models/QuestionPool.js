const mongoose = require("mongoose");

const questionPoolSchema = new mongoose.Schema(
  {
    // References
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Interview context
    interviewType: {
      type: String,
      required: true,
      enum: ["technical", "behavioral"],
    },
    level: {
      type: String,
      required: true,
      enum: ["0-2", "3-4", "5-6", "7-8", "9-10"],
    },
    difficultyLevel: {
      type: String,
      required: true,
      enum: ["beginner", "intermediate", "expert"],
    },
    jobRole: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Job role cannot be more than 100 characters"],
    },

    // Questions array
    questions: [
      {
        questionId: {
          type: String,
          required: true,
          trim: true,
          maxlength: [50, "Question ID cannot be more than 50 characters"],
        },
        question: {
          type: String,
          required: true,
          trim: true,
          maxlength: [1000, "Question cannot be more than 1000 characters"],
        },
        category: {
          type: String,
          required: true,
          trim: true,
          maxlength: [50, "Category cannot be more than 50 characters"],
        },
        expectedAnswer: {
          type: String,
          required: true,
          trim: true,
          maxlength: [
            2000,
            "Expected answer cannot be more than 2000 characters",
          ],
        },
        keywords: [
          {
            type: String,
            trim: true,
            maxlength: [50, "Keyword cannot be more than 50 characters"],
          },
        ],
        isCompleted: {
          type: Boolean,
          default: false,
        },
        isAsked: {
          type: Boolean,
          default: false,
        },
        askedAt: {
          type: Date,
          default: null,
        },
        completedAt: {
          type: Date,
          default: null,
        },
      },
    ],

    // Pool metadata
    totalTokensUsed: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Total tokens used cannot be negative"],
    },

    // Timestamps
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
questionPoolSchema.index({ resumeId: 1 });
questionPoolSchema.index({ interviewId: 1 });
questionPoolSchema.index({ userId: 1 });
questionPoolSchema.index({ interviewType: 1, level: 1, difficultyLevel: 1 });
questionPoolSchema.index({ createdAt: -1 });

// Virtual for question count
questionPoolSchema.virtual("questionCount").get(function () {
  return this.questions ? this.questions.length : 0;
});

// Static method to find question pool by interview
questionPoolSchema.statics.findByInterview = function (interviewId) {
  return this.findOne({ interviewId }).sort({ createdAt: -1 });
};

// Static method to find question pool by resume
questionPoolSchema.statics.findByResume = function (resumeId) {
  return this.findOne({ resumeId }).sort({ createdAt: -1 });
};

// Static method to find question pools by user
questionPoolSchema.statics.findByUser = function (userId, limit = 10) {
  return this.find({ userId })
    .populate("resumeId", "resumeName")
    .populate("interviewId", "jobRole interviewType level difficultyLevel")
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Instance method to get question by ID
questionPoolSchema.methods.getQuestionById = function (questionId) {
  return this.questions.find((q) => q.questionId === questionId);
};

// Instance method to add question
questionPoolSchema.methods.addQuestion = function (questionData) {
  this.questions.push(questionData);
  return this.save();
};

// Instance method to update question
questionPoolSchema.methods.updateQuestion = function (questionId, updateData) {
  const question = this.questions.find((q) => q.questionId === questionId);
  if (question) {
    Object.assign(question, updateData);
    return this.save();
  }
  throw new Error("Question not found");
};

// Instance method to remove question
questionPoolSchema.methods.removeQuestion = function (questionId) {
  this.questions = this.questions.filter((q) => q.questionId !== questionId);
  return this.save();
};

// Instance method to mark question as completed
questionPoolSchema.methods.markQuestionCompleted = function (questionId) {
  const question = this.questions.find((q) => q.questionId === questionId);
  if (question) {
    question.isCompleted = true;
    question.completedAt = new Date();
    return this.save();
  }
  throw new Error("Question not found");
};

// Instance method to mark question as asked
questionPoolSchema.methods.markQuestionAsked = function (questionId) {
  const question = this.questions.find((q) => q.questionId === questionId);
  if (question) {
    question.isAsked = true;
    question.askedAt = new Date();
    return this.save();
  }
  throw new Error("Question not found");
};

// Pre-save middleware to update updatedAt
questionPoolSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("QuestionPool", questionPoolSchema);
