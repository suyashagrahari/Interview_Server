const { TopicInterview, logger } = require("./dependencies");
const InterviewStateService = require("../../interviewStateService");

/**
 * End interview and calculate final analysis
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} End result with analysis
 */
const endInterview = async (interviewId, userId) => {
  try {
    const interview = await TopicInterview.findOne({
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

    // Mark as completed
    interview.status = "completed";
    interview.completedAt = new Date();

    if (interview.startedAt) {
      interview.totalDuration = Math.round(
        (interview.completedAt - interview.startedAt) / 1000 / 60
      );
    }

    // Calculate overall analysis
    interview.calculateOverallAnalysis();

    await interview.save();

    // Clear user's active interview state
    try {
      await InterviewStateService.markInterviewCompleted(userId, interviewId);
      logger.info(
        `✅ [Topic Interview] User interview state cleared for user ${userId}, interview ${interviewId}`
      );
    } catch (stateError) {
      logger.error(
        "❌ [Topic Interview] Error clearing user interview state:",
        stateError
      );
    }

    logger.info(`✅ [Topic Interview] Ended interview ${interviewId}`);

    return {
      success: true,
      interview,
      overallAnalysis: interview.overallAnalysis,
    };
  } catch (error) {
    logger.error("❌ [Topic Interview] Error ending interview:", error);
    throw error;
  }
};

module.exports = endInterview;
