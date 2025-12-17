const { TopicInterview, logger } = require("./dependencies");

/**
 * Update interview status
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Update result
 */
const updateInterviewStatus = async (interviewId, userId, status) => {
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

    interview.status = status;

    if (status === "completed") {
      interview.completedAt = new Date();
      if (interview.startedAt) {
        interview.totalDuration = Math.round(
          (interview.completedAt - interview.startedAt) / 1000 / 60
        );
      }
    } else if (status === "in_progress" && !interview.startedAt) {
      interview.startedAt = new Date();
    }

    await interview.save();

    logger.info(
      `✅ [Topic Interview] Updated interview ${interviewId} status to ${status}`
    );

    return {
      success: true,
      interview,
    };
  } catch (error) {
    logger.error("❌ [Topic Interview] Error updating interview status:", error);
    throw error;
  }
};

module.exports = updateInterviewStatus;
