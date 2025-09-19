const { Interview, logger } = require("./dependencies");

/**
 * Check if user has active interview
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Active interview check result
 */
const checkActiveInterview = async (userId) => {
  try {
    const existingInterview = await Interview.findOne({
      candidateId: userId,
      status: { $in: ["in_progress"] },
      isActive: true,
    });

    return {
      hasActive: !!existingInterview,
      interview: existingInterview,
    };
  } catch (error) {
    logger.error("Error checking active interview:", error);
    throw error;
  }
};

module.exports = checkActiveInterview;

