const Interview = require("../models/Interview");
const Resume = require("../models/Resume");
const User = require("../models/User");
const logger = require("../utils/logger");

/**
 * Interview Service - Handles all interview-related business logic
 */
class InterviewService {
  /**
   * Validate interview creation request
   */
  static validateInterviewRequest(reqBody) {
    const {
      resumeId,
      interviewType,
      level,
      difficultyLevel,
      jobRole,
      interviewerId,
      interviewer,
    } = reqBody;

    const errors = [];

    // Validate required fields
    if (
      !resumeId ||
      !interviewType ||
      !level ||
      !difficultyLevel ||
      !jobRole ||
      !interviewerId
    ) {
      errors.push(
        "Missing required fields: resumeId, interviewType, level, difficultyLevel, jobRole, interviewerId"
      );
    }

    // Validate interviewer details
    if (
      !interviewer ||
      !interviewer.name ||
      !interviewer.experience ||
      !interviewer.bio
    ) {
      errors.push(
        "Missing required interviewer details: name, experience, and bio are required"
      );
    }

    // Validate number of interviewers
    if (
      interviewer?.numberOfInterviewers &&
      (interviewer.numberOfInterviewers < 1 ||
        interviewer.numberOfInterviewers > 10)
    ) {
      errors.push("Number of interviewers must be between 1 and 10");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if user has active interview
   */
  static async checkActiveInterview(userId) {
    try {
      const existingInterview = await Interview.findOne({
        candidateId: userId,
        status: { $in: ["in_progress"] },
        isActive: true,
      });

      return {
        hasActive: !!existingInterview,
        interview: existingInterview,
      };
    } catch (error) {
      logger.error("Error checking active interview:", error);
      throw error;
    }
  }

  /**
   * Verify resume ownership
   */
  static async verifyResumeOwnership(resumeId, userId) {
    try {
      const resume = await Resume.findOne({
        _id: resumeId,
        userId: userId,
        isActive: true,
      });

      return {
        isValid: !!resume,
        resume: resume,
      };
    } catch (error) {
      logger.error("Error verifying resume ownership:", error);
      throw error;
    }
  }

  /**
   * Create new interview
   */
  static async createInterview(userId, interviewData) {
    try {
      const {
        resumeId,
        interviewType,
        level,
        difficultyLevel,
        jobRole,
        interviewerId,
        interviewer,
        companyName,
        experienceLevel,
        skills,
        additionalNotes,
        scheduled,
        scheduledDate,
        scheduledTime,
      } = interviewData;

      const interview = new Interview({
        candidateId: userId,
        resumeId,
        interviewType,
        level,
        difficultyLevel,
        jobRole,
        interviewerId,
        interviewer: {
          name: interviewer.name,
          numberOfInterviewers: interviewer.numberOfInterviewers || 1,
          experience: interviewer.experience,
          bio: interviewer.bio,
          introduction: interviewer.introduction || "",
        },
        companyName: companyName || "",
        experienceLevel: experienceLevel || "",
        skills: skills || [],
        additionalNotes: additionalNotes || "",
        scheduled: scheduled || false,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        scheduledTime: scheduledTime || "",
        status: scheduled ? "scheduled" : "in_progress",
        createdBy: userId,
      });

      if (!scheduled) {
        interview.startedAt = new Date();
      }

      await interview.save();
      logger.info(`Interview created for user ${userId}: ${interview._id}`);

      return {
        success: true,
        interview,
      };
    } catch (error) {
      logger.error("Error creating interview:", error);
      throw error;
    }
  }

  /**
   * Get user interviews with pagination
   */
  static async getUserInterviews(userId, options = {}) {
    try {
      const { status, limit = 10, page = 1 } = options;
      const skip = (page - 1) * limit;

      let query = { candidateId: userId, isActive: true };
      if (status) {
        query.status = status;
      }

      const [interviews, totalInterviews] = await Promise.all([
        Interview.find(query)
          .populate("resumeId", "resumeName originalFileName")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Interview.countDocuments(query),
      ]);

      const interviewList = interviews.map((interview) => ({
        id: interview._id,
        status: interview.status,
        interviewType: interview.interviewType,
        jobRole: interview.jobRole,
        level: interview.level,
        difficultyLevel: interview.difficultyLevel,
        companyName: interview.companyName,
        resumeName: interview.resumeId?.resumeName || "Unknown Resume",
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        totalDuration: interview.totalDuration,
        scheduledDate: interview.scheduledDate,
        scheduledTime: interview.scheduledTime,
        overallAnalysis: interview.overallAnalysis,
        createdAt: interview.createdAt,
      }));

      return {
        success: true,
        data: {
          interviews: interviewList,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalInterviews / limit),
            totalInterviews,
            hasNext: page * limit < totalInterviews,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      logger.error("Error retrieving user interviews:", error);
      throw error;
    }
  }

  /**
   * Get interview by ID
   */
  static async getInterviewById(interviewId, userId) {
    try {
      const interview = await Interview.findOne({
        _id: interviewId,
        candidateId: userId,
        isActive: true,
      }).populate("resumeId", "resumeName originalFileName resumeText");

      if (!interview) {
        return {
          success: false,
          message: "Interview not found",
        };
      }

      return {
        success: true,
        data: {
          id: interview._id,
          status: interview.status,
          interviewType: interview.interviewType,
          level: interview.level,
          difficultyLevel: interview.difficultyLevel,
          jobRole: interview.jobRole,
          interviewerId: interview.interviewerId,
          companyName: interview.companyName,
          experienceLevel: interview.experienceLevel,
          skills: interview.skills,
          additionalNotes: interview.additionalNotes,
          scheduled: interview.scheduled,
          scheduledDate: interview.scheduledDate,
          scheduledTime: interview.scheduledTime,
          startedAt: interview.startedAt,
          completedAt: interview.completedAt,
          totalDuration: interview.totalDuration,
          resume: {
            id: interview.resumeId?._id,
            name: interview.resumeId?.resumeName,
            originalFileName: interview.resumeId?.originalFileName,
            text: interview.resumeId?.resumeText,
          },
          questions: interview.questions.map((q) => ({
            questionId: q.questionId,
            question: q.question,
            category: q.category,
            difficulty: q.difficulty,
            expectedAnswer: q.expectedAnswer,
            answer: q.answer,
            answerAnalysis: q.answerAnalysis,
            timeSpent: q.timeSpent,
            answeredAt: q.answeredAt,
            isAnswered: q.isAnswered,
          })),
          overallAnalysis: interview.overallAnalysis,
          createdAt: interview.createdAt,
          updatedAt: interview.updatedAt,
        },
      };
    } catch (error) {
      logger.error("Error retrieving interview:", error);
      throw error;
    }
  }

  /**
   * Update interview status
   */
  static async updateInterviewStatus(interviewId, userId, status) {
    try {
      const validStatuses = [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "paused",
      ];

      if (!validStatuses.includes(status)) {
        return {
          success: false,
          message: `Invalid status. Valid statuses are: ${validStatuses.join(
            ", "
          )}`,
        };
      }

      const interview = await Interview.findOne({
        _id: interviewId,
        candidateId: userId,
        isActive: true,
      });

      if (!interview) {
        return {
          success: false,
          message: "Interview not found",
        };
      }

      // Update status using appropriate method
      switch (status) {
        case "in_progress":
          await interview.startInterview();
          break;
        case "completed":
          await interview.completeInterview();
          break;
        case "paused":
          await interview.pauseInterview();
          break;
        case "cancelled":
          await interview.cancelInterview();
          break;
        default:
          interview.status = status;
          await interview.save();
      }

      logger.info(
        `Interview ${interviewId} status updated to ${status} by user ${userId}`
      );

      return {
        success: true,
        data: {
          interviewId: interview._id,
          status: interview.status,
          startedAt: interview.startedAt,
          completedAt: interview.completedAt,
          totalDuration: interview.totalDuration,
        },
      };
    } catch (error) {
      logger.error("Error updating interview status:", error);
      throw error;
    }
  }

  /**
   * Delete interview (soft delete)
   */
  static async deleteInterview(interviewId, userId) {
    try {
      const interview = await Interview.findOne({
        _id: interviewId,
        candidateId: userId,
        isActive: true,
      });

      if (!interview) {
        return {
          success: false,
          message: "Interview not found",
        };
      }

      interview.isActive = false;
      await interview.save();

      logger.info(`Interview deleted by user ${userId}: ${interview._id}`);

      return {
        success: true,
        message: "Interview deleted successfully",
      };
    } catch (error) {
      logger.error("Error deleting interview:", error);
      throw error;
    }
  }

  /**
   * End interview and calculate final analysis
   */
  static async endInterview(interviewId, userId) {
    try {
      const interview = await Interview.findOne({
        _id: interviewId,
        candidateId: userId,
        isActive: true,
      });

      if (!interview) {
        return {
          success: false,
          message: "Interview not found",
        };
      }

      await interview.completeInterview();
      await interview.calculateOverallAnalysis();

      logger.info(`Interview ${interviewId} ended by user ${userId}`);

      return {
        success: true,
        data: {
          interviewId: interview._id,
          status: interview.status,
          completedAt: interview.completedAt,
          totalDuration: interview.totalDuration,
          overallAnalysis: interview.overallAnalysis,
        },
      };
    } catch (error) {
      logger.error("Error ending interview:", error);
      throw error;
    }
  }
}

module.exports = InterviewService;
