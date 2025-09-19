const { Interview, logger } = require("./dependencies");

/**
 * Update interview status
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Update result
 */
const updateInterviewStatus = async (interviewId, userId, status) => {
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
};

module.exports = updateInterviewStatus;

