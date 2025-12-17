const { JobDescriptionInterview, logger } = require("./dependencies");
const InterviewStateService = require("../../interviewStateService");

/**
 * End interview and calculate final analysis
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} End interview result
 */
const endInterview = async (interviewId, userId) => {
  try {
    const interview = await JobDescriptionInterview.findOne({
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

    logger.info(
      `Job Description Interview ${interviewId} ended by user ${userId}`
    );

    // Clear user's active interview state
    try {
      await InterviewStateService.markInterviewCompleted(userId, interviewId);
      logger.info(
        `User interview state cleared for user ${userId}, interview ${interviewId}`
      );
    } catch (stateError) {
      // Log error but don't fail the interview ending
      logger.error("Error clearing user interview state:", stateError);
    }

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
    logger.error("Error ending job description interview:", error);
    throw error;
  }
};

module.exports = endInterview;


