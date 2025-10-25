const UserInterviewState = require("../models/UserInterviewState");
const Interview = require("../models/ResumeInterview");
const logger = require("../utils/logger");

/**
 * Interview State Tracking Service
 * Manages user-level interview state tracking for cross-device support
 * and interview continuation
 */
class InterviewStateService {
  /**
   * Update user's active interview state
   * @param {String} userId - User ID
   * @param {Object} interviewData - Interview data
   * @returns {Promise<Object>} Updated user state
   */
  static async updateUserInterviewState(userId, interviewData) {
    try {
      const {
        interviewId,
        status,
        startedAt,
        completedAt,
        currentQuestionNumber,
        totalQuestions,
        timeRemaining,
        interviewType = "resume",
      } = interviewData;

      // Calculate expected end time (assuming 45 minutes default)
      const expectedEndTime = startedAt
        ? new Date(
            new Date(startedAt).getTime() + (timeRemaining || 2700) * 1000
          )
        : null;

      const userState = await UserInterviewState.updateActiveInterview(userId, {
        interviewId,
        interviewType,
        status,
        startedAt,
        completedAt,
        expectedEndTime,
        currentQuestionNumber,
        totalQuestions,
        timeRemaining,
      });

      logger.info(`Updated interview state for user ${userId}`, {
        interviewId,
        status,
        isActive: userState.latestInterview.isActive,
      });

      return userState;
    } catch (error) {
      logger.error("Error updating user interview state:", error);
      throw error;
    }
  }

  /**
   * Get user's active interview
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} Active interview data or null
   */
  static async getUserActiveInterview(userId) {
    try {
      const userState = await UserInterviewState.getActiveInterview(userId);

      if (!userState || !userState.latestInterview.interviewId) {
        return null;
      }

      const interview = userState.latestInterview.interviewId;

      // Check if interview is still valid (not expired)
      const now = new Date();
      const expectedEndTime = userState.latestInterview.expectedEndTime;
      const isExpired =
        expectedEndTime && now > new Date(expectedEndTime)
          ? true
          : false;

      // If expired and still marked as active, clean it up
      if (isExpired && userState.latestInterview.isActive) {
        await this.clearUserActiveInterview(userId);
        return null;
      }

      // Check if interview is completed - should not be returned as active
      if (userState.latestInterview.isCompleted || userState.latestInterview.status === 'completed') {
        await this.clearUserActiveInterview(userId);
        logger.info(`Cleared completed interview state for user ${userId}`);
        return null;
      }

      return {
        interviewId: interview._id || userState.latestInterview.interviewId,
        interviewType: userState.latestInterview.interviewType,
        status: userState.latestInterview.status,
        startedAt: userState.latestInterview.startedAt,
        completedAt: userState.latestInterview.completedAt,
        expectedEndTime: userState.latestInterview.expectedEndTime,
        currentQuestionNumber: userState.latestInterview.currentQuestionNumber,
        totalQuestions: userState.latestInterview.totalQuestions,
        timeRemaining: userState.latestInterview.timeRemaining,
        isActive: userState.latestInterview.isActive,
        isCompleted: userState.latestInterview.isCompleted,
        isExpired,
        lastActivityAt: userState.latestInterview.lastActivityAt,
      };
    } catch (error) {
      logger.error("Error getting user active interview:", error);
      throw error;
    }
  }

  /**
   * Check if user has an active interview
   * @param {String} userId - User ID
   * @returns {Promise<Boolean>} True if user has active interview
   */
  static async hasActiveInterview(userId) {
    try {
      const activeInterview = await this.getUserActiveInterview(userId);
      return !!activeInterview;
    } catch (error) {
      logger.error("Error checking active interview:", error);
      return false;
    }
  }

  /**
   * Clear user's active interview state
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated user state
   */
  static async clearUserActiveInterview(userId) {
    try {
      const userState = await UserInterviewState.clearActiveInterview(userId);

      logger.info(`Cleared active interview for user ${userId}`);

      return userState;
    } catch (error) {
      logger.error("Error clearing user active interview:", error);
      throw error;
    }
  }

  /**
   * Mark interview as completed for user
   * @param {String} userId - User ID
   * @param {String} interviewId - Interview ID
   * @returns {Promise<Object>} Updated user state
   */
  static async markInterviewCompleted(userId, interviewId) {
    try {
      // First verify this is the user's current interview
      const userState = await UserInterviewState.findOne({ userId });

      if (
        !userState ||
        userState.latestInterview.interviewId.toString() !==
          interviewId.toString()
      ) {
        logger.warn(
          `Attempted to complete interview ${interviewId} but it's not user ${userId}'s active interview`
        );
        return null;
      }

      // Mark as completed
      const updatedState = await userState.markInterviewCompleted();

      logger.info(`Marked interview ${interviewId} as completed for user ${userId}`);

      return updatedState;
    } catch (error) {
      logger.error("Error marking interview as completed:", error);
      throw error;
    }
  }

  /**
   * Sync interview state from interview document
   * Useful for webhooks or external updates
   * @param {String} interviewId - Interview ID
   * @returns {Promise<Object>} Updated user state
   */
  static async syncInterviewState(interviewId) {
    try {
      const interview = await Interview.findById(interviewId).select(
        "candidateId status startedAt completedAt questions timeRemaining"
      );

      if (!interview) {
        logger.warn(`Interview ${interviewId} not found for sync`);
        return null;
      }

      const userId = interview.candidateId;
      const currentQuestionNumber = interview.questions.filter(
        (q) => q.isAnswered
      ).length;
      const totalQuestions = interview.questions.length;

      return await this.updateUserInterviewState(userId, {
        interviewId: interview._id,
        status: interview.status,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        currentQuestionNumber,
        totalQuestions,
        timeRemaining: interview.timeRemaining,
        interviewType: "resume", // Default for now
      });
    } catch (error) {
      logger.error("Error syncing interview state:", error);
      throw error;
    }
  }

  /**
   * Get user's recent interviews
   * @param {String} userId - User ID
   * @param {Number} limit - Number of interviews to return (default: 5)
   * @returns {Promise<Array>} Recent interviews
   */
  static async getUserRecentInterviews(userId, limit = 5) {
    try {
      const userState = await UserInterviewState.findOne({ userId })
        .populate({
          path: "recentInterviews.interviewId",
          select:
            "status startedAt completedAt interviewType jobRole level difficultyLevel",
        })
        .lean();

      if (!userState || !userState.recentInterviews) {
        return [];
      }

      return userState.recentInterviews
        .slice(0, limit)
        .filter((ri) => ri.interviewId); // Filter out any null references
    } catch (error) {
      logger.error("Error getting user recent interviews:", error);
      throw error;
    }
  }

  /**
   * Update activity timestamp for user's current interview
   * @param {String} userId - User ID
   * @returns {Promise<void>}
   */
  static async updateActivity(userId) {
    try {
      const userState = await UserInterviewState.findOne({ userId });

      if (userState && userState.latestInterview.isActive) {
        await userState.updateActivity();
      }
    } catch (error) {
      logger.error("Error updating activity:", error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Clean up expired interviews
   * This can be run periodically (e.g., via cron job)
   * @returns {Promise<Number>} Number of cleaned up interviews
   */
  static async cleanupExpiredInterviews() {
    try {
      const now = new Date();

      const expiredStates = await UserInterviewState.find({
        "latestInterview.isActive": true,
        "latestInterview.expectedEndTime": { $lt: now },
      });

      let cleanedCount = 0;

      for (const state of expiredStates) {
        await this.clearUserActiveInterview(state.userId);
        cleanedCount++;
      }

      logger.info(`Cleaned up ${cleanedCount} expired interviews`);

      return cleanedCount;
    } catch (error) {
      logger.error("Error cleaning up expired interviews:", error);
      return 0;
    }
  }
}

module.exports = InterviewStateService;
