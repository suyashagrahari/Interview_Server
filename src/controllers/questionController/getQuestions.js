const { QuestionPool, logger } = require("./dependencies");

/**
 * Get questions for an interview
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQuestions = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { interviewId } = req.params;

    // Get question pool
    const questionPool = await QuestionPool.findOne({
      interviewId: interviewId,
      userId: req.user.id,
    });

    if (!questionPool) {
      return res.status(404).json({
        success: false,
        message: "Questions not found for this interview",
      });
    }

    res.status(200).json({
      success: true,
      message: "Questions retrieved successfully",
      data: {
        questionPoolId: questionPool._id,
        questionCount: questionPool.questionCount,
        totalTokensUsed: questionPool.totalTokensUsed,
        questions: questionPool.questions.map((q) => ({
          questionId: q.questionId,
          question: q.question,
          category: q.category,
          expectedAnswer: q.expectedAnswer,
          keywords: q.keywords,
        })),
        createdAt: questionPool.createdAt,
      },
    });
  } catch (error) {
    logger.error("Error retrieving questions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving questions",
    });
  }
};

module.exports = getQuestions;

