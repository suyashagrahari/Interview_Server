const { TopicInterview, logger } = require("./dependencies");

/**
 * Check if user has an active topic interview
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Check result with interview data if found
 */
const checkActiveInterview = async (userId) => {
  try {
    const activeInterview = await TopicInterview.findOne({
      candidateId: userId,
      status: { $in: ["scheduled", "in_progress", "paused"] },
      isActive: true,
    }).sort({ createdAt: -1 });

    if (activeInterview) {
      return {
        success: true,
        hasActiveInterview: true,
        interview: activeInterview,
      };
    }

    return {
      success: true,
      hasActiveInterview: false,
      interview: null,
    };
  } catch (error) {
    logger.error("❌ [Topic Interview] Error checking active interview:", error);
    throw error;
  }
};

module.exports = checkActiveInterview;
