const { TopicInterview, logger } = require("./dependencies");

/**
 * Get interview by ID
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Interview data
 */
const getInterviewById = async (interviewId, userId) => {
  try {
    const interview = await TopicInterview.findOne({
      _id: interviewId,
      candidateId: userId,
      isActive: true,
    })
      .populate("candidateId", "firstName lastName email")
      .populate("resumeId", "resumeText resumeName")
      .populate("jobDescriptionId", "description title");

    if (!interview) {
      return {
        success: false,
        message: "Interview not found",
      };
    }

    return {
      success: true,
      interview,
    };
  } catch (error) {
    logger.error("❌ [Topic Interview] Error getting interview by ID:", error);
    throw error;
  }
};

module.exports = getInterviewById;
