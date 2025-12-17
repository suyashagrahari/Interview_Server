const { TopicInterview, logger } = require("./dependencies");

/**
 * Delete (soft delete) interview
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteInterview = async (interviewId, userId) => {
  try {
    const interview = await TopicInterview.findOne({
      _id: interviewId,
      candidateId: userId,
    });

    if (!interview) {
      return {
        success: false,
        message: "Interview not found",
      };
    }

    interview.isActive = false;
    await interview.save();

    logger.info(`✅ [Topic Interview] Deleted interview ${interviewId}`);

    return {
      success: true,
      message: "Interview deleted successfully",
    };
  } catch (error) {
    logger.error("❌ [Topic Interview] Error deleting interview:", error);
    throw error;
  }
};

module.exports = deleteInterview;
