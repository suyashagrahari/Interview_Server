const { TopicInterview, logger } = require("./dependencies");

/**
 * Get user's topic interviews with optional filters
 * @param {string} userId - User ID
 * @param {Object} options - Query options (status, limit, skip, sort)
 * @returns {Promise<Object>} User interviews
 */
const getUserInterviews = async (userId, options = {}) => {
  try {
    const {
      status,
      limit = 10,
      skip = 0,
      sort = { createdAt: -1 },
      includeInactive = false,
    } = options;

    const query = { candidateId: userId };

    if (status) {
      query.status = status;
    }

    if (!includeInactive) {
      query.isActive = true;
    }

    const interviews = await TopicInterview.find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .populate("candidateId", "firstName lastName email")
      .populate("resumeId", "resumeName")
      .populate("jobDescriptionId", "title");

    const total = await TopicInterview.countDocuments(query);

    return {
      success: true,
      interviews,
      total,
      limit,
      skip,
    };
  } catch (error) {
    logger.error("❌ [Topic Interview] Error getting user interviews:", error);
    throw error;
  }
};

module.exports = getUserInterviews;
