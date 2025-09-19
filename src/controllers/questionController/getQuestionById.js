const { QuestionPool, logger } = require("./dependencies");

/**
 * Get question by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQuestionById = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { interviewId, questionId } = req.params;

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

    // Get specific question
    const question = questionPool.getQuestionById(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Question retrieved successfully",
      data: {
        questionId: question.questionId,
        question: question.question,
        category: question.category,
        expectedAnswer: question.expectedAnswer,
        keywords: question.keywords,
      },
    });
  } catch (error) {
    logger.error("Error retrieving question:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving question",
    });
  }
};

module.exports = getQuestionById;



