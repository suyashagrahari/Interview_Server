const mongoose = require("mongoose");

/**
 * UserInterviewState Model
 * Tracks the active/latest interview state for each user
 * This allows quick lookup of user's current interview status across devices
 */
const userInterviewStateSchema = new mongoose.Schema(
  {
    // User reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true, // One state record per user
      index: true,
    },

    // Current/Latest Interview Information
    latestInterview: {
      // Interview ID reference
      interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ResumeInterview",
        default: null,
      },

      // Interview type for routing
      interviewType: {
        type: String,
        enum: [
          "resume",
          "job-description",
          "topic",
          "company",
        ],
        default: "resume",
      },

      // Interview status
      status: {
        type: String,
        enum: ["scheduled", "in_progress", "completed", "cancelled", "paused"],
        default: null,
      },

      // Timing information
      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      expectedEndTime: {
        type: Date,
        default: null, // Calculated as startedAt + interview duration
      },

      // Current state
      isActive: {
        type: Boolean,
        default: false, // True if interview is in progress or paused
      },

      isCompleted: {
        type: Boolean,
        default: false,
      },

      // Interview details for quick access
      currentQuestionNumber: {
        type: Number,
        default: 0,
      },

      totalQuestions: {
        type: Number,
        default: 0,
      },

      timeRemaining: {
        type: Number, // in seconds
        default: 0,
      },

      lastActivityAt: {
        type: Date,
        default: null,
      },
    },

    // Interview history tracking (keep last 5 interviews for quick access)
    recentInterviews: [
      {
        interviewId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ResumeInterview",
        },
        interviewType: {
          type: String,
          enum: [
            "resume",
            "job-description",
            "topic",
            "company",
          ],
        },
        status: {
          type: String,
          enum: [
            "scheduled",
            "in_progress",
            "completed",
            "cancelled",
            "paused",
          ],
        },
        startedAt: Date,
        completedAt: Date,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Metadata
    lastCheckedAt: {
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

// Indexes for performance
userInterviewStateSchema.index({ "latestInterview.isActive": 1 });
userInterviewStateSchema.index({ "latestInterview.interviewId": 1 });
userInterviewStateSchema.index({ lastCheckedAt: -1 });

// Static method to find or create user state
userInterviewStateSchema.statics.findOrCreate = async function (userId) {
  let userState = await this.findOne({ userId });

  if (!userState) {
    userState = await this.create({
      userId,
      latestInterview: {
        isActive: false,
        isCompleted: false,
      },
      recentInterviews: [],
    });
  }

  return userState;
};

// Static method to update user's active interview
userInterviewStateSchema.statics.updateActiveInterview = async function (
  userId,
  interviewData
) {
  const {
    interviewId,
    interviewType,
    status,
    startedAt,
    completedAt,
    expectedEndTime,
    currentQuestionNumber,
    totalQuestions,
    timeRemaining,
  } = interviewData;

  const isActive = ["in_progress", "paused"].includes(status);
  const isCompleted = status === "completed" || status === "cancelled";

  const updateData = {
    "latestInterview.interviewId": interviewId,
    "latestInterview.interviewType": interviewType || "resume",
    "latestInterview.status": status,
    "latestInterview.startedAt": startedAt,
    "latestInterview.completedAt": completedAt,
    "latestInterview.expectedEndTime": expectedEndTime,
    "latestInterview.isActive": isActive,
    "latestInterview.isCompleted": isCompleted,
    "latestInterview.currentQuestionNumber": currentQuestionNumber || 0,
    "latestInterview.totalQuestions": totalQuestions || 0,
    "latestInterview.timeRemaining": timeRemaining || 0,
    "latestInterview.lastActivityAt": new Date(),
    lastCheckedAt: new Date(),
  };

  const userState = await this.findOneAndUpdate(
    { userId },
    { $set: updateData },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Add to recent interviews if not already there
  if (userState) {
    const existingIndex = userState.recentInterviews.findIndex(
      (ri) => ri.interviewId.toString() === interviewId.toString()
    );

    if (existingIndex === -1) {
      // Add new interview to recent list
      userState.recentInterviews.unshift({
        interviewId,
        interviewType: interviewType || "resume",
        status,
        startedAt,
        completedAt,
        createdAt: new Date(),
      });

      // Keep only last 5 interviews
      if (userState.recentInterviews.length > 5) {
        userState.recentInterviews = userState.recentInterviews.slice(0, 5);
      }
    } else {
      // Update existing interview in recent list
      userState.recentInterviews[existingIndex] = {
        ...userState.recentInterviews[existingIndex],
        status,
        completedAt,
      };
    }

    await userState.save();
  }

  return userState;
};

// Static method to clear active interview
userInterviewStateSchema.statics.clearActiveInterview = async function (
  userId
) {
  return await this.findOneAndUpdate(
    { userId },
    {
      $set: {
        "latestInterview.isActive": false,
        "latestInterview.isCompleted": true,
        lastCheckedAt: new Date(),
      },
    },
    { new: true }
  );
};

// Static method to get active interview for user
userInterviewStateSchema.statics.getActiveInterview = async function (userId) {
  const userState = await this.findOne({
    userId,
    "latestInterview.isActive": true,
  })
    .populate({
      path: "latestInterview.interviewId",
      select:
        "status startedAt completedAt questions timeRemaining interviewType level jobRole",
    })
    .lean();

  return userState;
};

// Instance method to mark interview as completed
userInterviewStateSchema.methods.markInterviewCompleted = function () {
  this.latestInterview.isActive = false;
  this.latestInterview.isCompleted = true;
  this.latestInterview.completedAt = new Date();
  this.lastCheckedAt = new Date();
  return this.save();
};

// Instance method to update last activity
userInterviewStateSchema.methods.updateActivity = function () {
  this.latestInterview.lastActivityAt = new Date();
  this.lastCheckedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("UserInterviewState", userInterviewStateSchema);
