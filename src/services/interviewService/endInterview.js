const { Interview, logger } = require("./dependencies");

/**
 * End interview and calculate final analysis
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} End interview result
 */
const endInterview = async (interviewId, userId) => {
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
};

module.exports = endInterview;

