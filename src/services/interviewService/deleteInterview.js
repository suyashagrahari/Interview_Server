const { Interview, logger } = require("./dependencies");

/**
 * Delete interview (soft delete)
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteInterview = async (interviewId, userId) => {
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
};

module.exports = deleteInterview;



