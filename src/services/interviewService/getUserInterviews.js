const { Interview, logger } = require("./dependencies");

/**
 * Get user interviews with pagination
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} User interviews result
 */
const getUserInterviews = async (userId, options = {}) => {
  try {
    const { status, limit = 10, page = 1 } = options;
    const skip = (page - 1) * limit;

    let query = { candidateId: userId, isActive: true };
    if (status) {
      query.status = status;
    }

    const [interviews, totalInterviews] = await Promise.all([
      Interview.find(query)
        .populate("resumeId", "resumeName originalFileName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Interview.countDocuments(query),
    ]);

    const interviewList = interviews.map((interview) => ({
      id: interview._id,
      status: interview.status,
      interviewType: interview.interviewType,
      jobRole: interview.jobRole,
      level: interview.level,
      difficultyLevel: interview.difficultyLevel,
      companyName: interview.companyName,
      resumeName: interview.resumeId?.resumeName || "Unknown Resume",
      startedAt: interview.startedAt,
      completedAt: interview.completedAt,
      totalDuration: interview.totalDuration,
      scheduledDate: interview.scheduledDate,
      scheduledTime: interview.scheduledTime,
      overallAnalysis: interview.overallAnalysis,
      createdAt: interview.createdAt,
    }));

    return {
      success: true,
      data: {
        interviews: interviewList,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalInterviews / limit),
          totalInterviews,
          hasNext: page * limit < totalInterviews,
          hasPrev: page > 1,
        },
      },
    };
  } catch (error) {
    logger.error("Error retrieving user interviews:", error);
    throw error;
  }
};

module.exports = getUserInterviews;



