const { Resume, logger } = require("./dependencies");

/**
 * Verify resume ownership
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Verification result
 */
const verifyResumeOwnership = async (resumeId, userId) => {
  try {
    const resume = await Resume.findOne({
      _id: resumeId,
      userId: userId,
      isActive: true,
    });

    return {
      isValid: !!resume,
      resume: resume,
    };
  } catch (error) {
    logger.error("Error verifying resume ownership:", error);
    throw error;
  }
};

module.exports = verifyResumeOwnership;

