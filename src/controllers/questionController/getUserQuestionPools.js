const { QuestionPool, logger } = require("./dependencies");

/**
 * Get user's question pools
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserQuestionPools = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const questionPools = await QuestionPool.findByUser(
      req.user.id,
      parseInt(limit)
    );

    const totalQuestionPools = await QuestionPool.countDocuments({
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "Question pools retrieved successfully",
      data: {
        questionPools: questionPools.map((pool) => ({
          id: pool._id,
          resumeId: pool.resumeId,
          interviewId: pool.interviewId,
          jobRole: pool.jobRole,
          interviewType: pool.interviewType,
          level: pool.level,
          difficultyLevel: pool.difficultyLevel,
          questionCount: pool.questionCount,
          totalTokensUsed: pool.totalTokensUsed,
          createdAt: pool.createdAt,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalQuestionPools / limit),
          totalQuestionPools,
          hasNext: page * limit < totalQuestionPools,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Error retrieving question pools:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving question pools",
    });
  }
};

module.exports = getUserQuestionPools;



