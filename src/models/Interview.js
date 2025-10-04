const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Candidate ID is required"],
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: [true, "Resume ID is required"],
      index: true,
    },
    // Interview Configuration
    interviewType: {
      type: String,
      required: [true, "Interview type is required"],
      enum: ["technical", "behavioral"],
      default: "technical",
    },
    level: {
      type: String,
      required: [true, "Experience level is required"],
      enum: ["0-2", "3-4", "5-6", "7-8", "9-10"],
    },
    difficultyLevel: {
      type: String,
      required: [true, "Difficulty level is required"],
      enum: ["beginner", "intermediate", "expert"],
      default: "beginner",
    },
    jobRole: {
      type: String,
      required: [true, "Job role is required"],
      trim: true,
      maxlength: [100, "Job role cannot be more than 100 characters"],
    },
    interviewerId: {
      type: String,
      required: [true, "Interviewer ID is required"],
      trim: true,
    },
    // Interviewer Details
    interviewer: {
      name: {
        type: String,
        required: [true, "Interviewer name is required"],
        trim: true,
        maxlength: [100, "Interviewer name cannot be more than 100 characters"],
      },
      numberOfInterviewers: {
        type: Number,
        required: [true, "Number of interviewers is required"],
        min: [1, "At least 1 interviewer is required"],
        max: [10, "Maximum 10 interviewers allowed"],
        default: 1,
      },
      experience: {
        type: String,
        required: [true, "Interviewer experience is required"],
        trim: true,
        maxlength: [100, "Experience cannot be more than 100 characters"],
      },
      bio: {
        type: String,
        required: [true, "Interviewer bio is required"],
        trim: true,
        maxlength: [500, "Bio cannot be more than 500 characters"],
      },
      introduction: {
        type: String,
        required: false,
        trim: true,
        maxlength: [1000, "Introduction cannot be more than 1000 characters"],
      },
    },
    companyName: {
      type: String,
      default: "",
      trim: true,
      maxlength: [100, "Company name cannot be more than 100 characters"],
    },
    experienceLevel: {
      type: String,
      default: "",
      trim: true,
      maxlength: [50, "Experience level cannot be more than 50 characters"],
    },
    skills: {
      type: [String],
      default: [],
    },
    additionalNotes: {
      type: String,
      default: "",
      maxlength: [1000, "Additional notes cannot be more than 1000 characters"],
    },
    // Scheduling
    scheduled: {
      type: Boolean,
      default: false,
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
    scheduledTime: {
      type: String,
      default: "",
    },
    // Interview Status
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled", "paused"],
      default: "scheduled",
    },
    // Timing
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    totalDuration: {
      type: Number, // in minutes
      default: 0,
    },
    timeRemaining: {
      type: Number, // in seconds
      default: 2700, // 45 minutes = 2700 seconds
    },
    lastTimeUpdate: {
      type: Date,
      default: null,
    },
    // Questions and Answers
    questions: [
      {
        questionId: {
          type: String,
          required: true,
        },
        question: {
          type: String,
          required: true,
          maxlength: [1000, "Question cannot be more than 1000 characters"],
        },
        category: {
          type: String,
          required: true,
          trim: true,
        },
        difficulty: {
          type: String,
          enum: ["easy", "medium", "hard"],
          default: "medium",
        },
        questionType: {
          type: String,
          enum: ["pool", "followup"],
          default: "pool",
        },
        expectedAnswer: {
          type: String,
          default: "",
          maxlength: [
            2000,
            "Expected answer cannot be more than 2000 characters",
          ],
        },
        // Answer provided by candidate
        answer: {
          type: String,
          default: "",
          maxlength: [5000, "Answer cannot be more than 5000 characters"],
        },
        // Answer Analysis
        answerAnalysis: {
          relevance: {
            type: Number,
            min: 0,
            max: 10,
            default: 0,
          },
          completeness: {
            type: Number,
            min: 0,
            max: 10,
            default: 0,
          },
          technicalAccuracy: {
            type: Number,
            min: 0,
            max: 10,
            default: 0,
          },
          communication: {
            type: Number,
            min: 0,
            max: 10,
            default: 0,
          },
          overallRating: {
            type: Number,
            min: 0,
            max: 10,
            default: 0,
          },
          feedback: {
            type: String,
            default: "",
            maxlength: [1000, "Feedback cannot be more than 1000 characters"],
          },
          strengths: {
            type: [String],
            default: [],
          },
          areasForImprovement: {
            type: [String],
            default: [],
          },
        },
        // Timing for each question
        timeSpent: {
          type: Number, // in seconds
          default: 0,
        },
        answeredAt: {
          type: Date,
          default: null,
        },
        isAnswered: {
          type: Boolean,
          default: false,
        },
        // Sentiment analysis for this specific question
        sentiment: {
          type: String,
          enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"],
          default: "NEUTRAL",
        },
        sentimentAnalyzedAt: {
          type: Date,
          default: null,
        },
        // Track if user viewed the expected answer (copilot hint)
        answerViewed: {
          type: Boolean,
          default: false,
        },
        answerViewedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    // Warning System
    warningCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    lastWarningAt: {
      type: Date,
      default: null,
    },
    isTerminated: {
      type: Boolean,
      default: false,
    },
    terminationReason: {
      type: String,
      default: "",
      maxlength: [500, "Termination reason cannot be more than 500 characters"],
    },
    // Overall Interview Analysis
    overallAnalysis: {
      totalQuestions: {
        type: Number,
        default: 0,
      },
      answeredQuestions: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
      strengths: {
        type: [String],
        default: [],
      },
      areasForImprovement: {
        type: [String],
        default: [],
      },
      overallFeedback: {
        type: String,
        default: "",
        maxlength: [
          2000,
          "Overall feedback cannot be more than 2000 characters",
        ],
      },
      recommendation: {
        type: String,
        enum: ["strong_hire", "hire", "no_hire", "strong_no_hire"],
        default: "no_hire",
      },
      confidenceScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },
    // Proctoring Data (for tracking violations during interview)
    proctoringData: {
      tabSwitches: {
        type: Number,
        default: 0,
        min: 0,
      },
      copyPasteCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      faceDetectionIssues: {
        type: Number,
        default: 0,
        min: 0,
      },
      multiplePersonDetections: {
        type: Number,
        default: 0,
        min: 0,
      },
      phoneDetections: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastTabSwitchAt: {
        type: Date,
        default: null,
      },
      lastViolationAt: {
        type: Date,
        default: null,
      },
    },
    // Metadata
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
interviewSchema.index({ candidateId: 1, status: 1 });
interviewSchema.index({ createdAt: -1 });
interviewSchema.index({ startedAt: -1 });
interviewSchema.index({ status: 1, scheduledDate: 1 });

// Virtual for candidate information
interviewSchema.virtual("candidate", {
  ref: "User",
  localField: "candidateId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for resume information
interviewSchema.virtual("resume", {
  ref: "Resume",
  localField: "resumeId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for interview duration
interviewSchema.virtual("duration").get(function () {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / 1000 / 60); // in minutes
  }
  return 0;
});

// Static method to find interviews by candidate
interviewSchema.statics.findByCandidate = function (
  candidateId,
  includeInactive = false
) {
  const query = { candidateId };
  if (!includeInactive) {
    query.isActive = true;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find interviews by status
interviewSchema.statics.findByStatus = function (
  status,
  includeInactive = false
) {
  const query = { status };
  if (!includeInactive) {
    query.isActive = true;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find active interviews
interviewSchema.statics.findActiveInterviews = function () {
  return this.find({
    status: { $in: ["scheduled", "in_progress"] },
    isActive: true,
  }).sort({ createdAt: -1 });
};

// Instance method to start interview
interviewSchema.methods.startInterview = function () {
  this.status = "in_progress";
  this.startedAt = new Date();
  return this.save();
};

// Instance method to complete interview
interviewSchema.methods.completeInterview = function () {
  this.status = "completed";
  this.completedAt = new Date();
  if (this.startedAt) {
    this.totalDuration = Math.round(
      (this.completedAt - this.startedAt) / 1000 / 60
    );
  }
  return this.save();
};

// Instance method to pause interview
interviewSchema.methods.pauseInterview = function () {
  this.status = "paused";
  return this.save();
};

// Instance method to resume interview
interviewSchema.methods.resumeInterview = function () {
  this.status = "in_progress";
  return this.save();
};

// Instance method to cancel interview
interviewSchema.methods.cancelInterview = function () {
  this.status = "cancelled";
  return this.save();
};

// Instance method to add question
interviewSchema.methods.addQuestion = function (questionData) {
  console.log(`🔍 DEBUG: Adding question to interview ${this._id}:`, {
    questionId: questionData.questionId,
    questionType: questionData.questionType || "pool",
    currentQuestionCount: this.questions.length,
    stackTrace: new Error().stack.split("\n")[1].trim(),
  });

  this.questions.push({
    ...questionData,
    questionType: questionData.questionType || "pool",
  });
  this.overallAnalysis.totalQuestions = this.questions.length;
  return this.save();
};

// Instance method to update answer
interviewSchema.methods.updateAnswer = function (
  questionId,
  answer,
  timeSpent,
  sentiment = "NEUTRAL"
) {
  const question = this.questions.find((q) => q.questionId === questionId);
  if (question) {
    question.answer = answer;
    question.timeSpent = timeSpent || 0;
    question.answeredAt = new Date();
    question.isAnswered = true;
    question.sentiment = sentiment; // NEW: Update sentiment
    question.sentimentAnalyzedAt = new Date(); // NEW: Update sentiment analyzed time

    // Update overall stats
    this.overallAnalysis.answeredQuestions = this.questions.filter(
      (q) => q.isAnswered
    ).length;

    return this.save();
  }
  throw new Error("Question not found");
};

// Instance method to update answer analysis
interviewSchema.methods.updateAnswerAnalysis = function (questionId, analysis) {
  const question = this.questions.find((q) => q.questionId === questionId);
  if (question) {
    question.answerAnalysis = { ...question.answerAnalysis, ...analysis };

    // Recalculate overall analysis
    this.calculateOverallAnalysis();

    return this.save();
  }
  throw new Error("Question not found");
};

// Instance method to calculate overall analysis
interviewSchema.methods.calculateOverallAnalysis = function () {
  const answeredQuestions = this.questions.filter(
    (q) => q.isAnswered && q.answerAnalysis.overallRating > 0
  );

  if (answeredQuestions.length > 0) {
    const totalRating = answeredQuestions.reduce(
      (sum, q) => sum + q.answerAnalysis.overallRating,
      0
    );
    this.overallAnalysis.averageRating =
      Math.round((totalRating / answeredQuestions.length) * 10) / 10;

    // Collect all strengths and areas for improvement
    const allStrengths = [];
    const allAreasForImprovement = [];

    answeredQuestions.forEach((q) => {
      allStrengths.push(...(q.answerAnalysis.strengths || []));
      allAreasForImprovement.push(
        ...(q.answerAnalysis.areasForImprovement || [])
      );
    });

    // Remove duplicates and limit to top items
    this.overallAnalysis.strengths = [...new Set(allStrengths)].slice(0, 5);
    this.overallAnalysis.areasForImprovement = [
      ...new Set(allAreasForImprovement),
    ].slice(0, 5);

    // Determine recommendation based on average rating
    if (this.overallAnalysis.averageRating >= 8) {
      this.overallAnalysis.recommendation = "strong_hire";
    } else if (this.overallAnalysis.averageRating >= 6) {
      this.overallAnalysis.recommendation = "hire";
    } else if (this.overallAnalysis.averageRating >= 4) {
      this.overallAnalysis.recommendation = "no_hire";
    } else {
      this.overallAnalysis.recommendation = "strong_no_hire";
    }

    // Calculate confidence score based on number of answered questions and rating consistency
    const ratingVariance = this.calculateRatingVariance(answeredQuestions);
    this.overallAnalysis.confidenceScore = Math.max(
      0,
      Math.min(100, 100 - ratingVariance * 10 + answeredQuestions.length * 5)
    );
  }

  this.overallAnalysis.answeredQuestions = answeredQuestions.length;
};

// Instance method to update proctoring data
interviewSchema.methods.updateProctoringData = function (proctoringUpdates) {
  if (!this.proctoringData) {
    this.proctoringData = {
      tabSwitches: 0,
      copyPasteCount: 0,
      faceDetectionIssues: 0,
      multiplePersonDetections: 0,
      phoneDetections: 0,
      lastTabSwitchAt: null,
      lastViolationAt: null,
    };
  }

  // Update tab switches
  if (proctoringUpdates.tabSwitches !== undefined) {
    this.proctoringData.tabSwitches = proctoringUpdates.tabSwitches;
    this.proctoringData.lastTabSwitchAt = new Date();
    this.proctoringData.lastViolationAt = new Date();
  }

  // Update copy/paste count
  if (proctoringUpdates.copyPasteCount !== undefined) {
    this.proctoringData.copyPasteCount = proctoringUpdates.copyPasteCount;
    this.proctoringData.lastViolationAt = new Date();
  }

  // Update face detection issues
  if (proctoringUpdates.faceDetectionIssues !== undefined) {
    this.proctoringData.faceDetectionIssues = proctoringUpdates.faceDetectionIssues;
    this.proctoringData.lastViolationAt = new Date();
  }

  // Update multiple person detections
  if (proctoringUpdates.multiplePersonDetections !== undefined) {
    this.proctoringData.multiplePersonDetections = proctoringUpdates.multiplePersonDetections;
    this.proctoringData.lastViolationAt = new Date();
  }

  // Update phone detections
  if (proctoringUpdates.phoneDetections !== undefined) {
    this.proctoringData.phoneDetections = proctoringUpdates.phoneDetections;
    this.proctoringData.lastViolationAt = new Date();
  }

  return this.save();
};

// Helper method to calculate rating variance
interviewSchema.methods.calculateRatingVariance = function (answeredQuestions) {
  if (answeredQuestions.length < 2) return 0;

  const ratings = answeredQuestions.map((q) => q.answerAnalysis.overallRating);
  const mean =
    ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  const variance =
    ratings.reduce((sum, rating) => sum + Math.pow(rating - mean, 2), 0) /
    ratings.length;

  return Math.sqrt(variance);
};

// Pre-save middleware to update timestamps
interviewSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "in_progress" && !this.startedAt) {
      this.startedAt = new Date();
    } else if (this.status === "completed" && !this.completedAt) {
      this.completedAt = new Date();
      if (this.startedAt) {
        this.totalDuration = Math.round(
          (this.completedAt - this.startedAt) / 1000 / 60
        );
      }
    }
  }
  next();
});

module.exports = mongoose.model("Interview", interviewSchema);
