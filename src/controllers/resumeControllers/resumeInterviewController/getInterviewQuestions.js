const {
  QuestionGenerationService,
  sendAuthRequiredError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Get questions for an interview
 */
const getInterviewQuestions = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result = await QuestionGenerationService.getQuestionsForInterview(
      req.params.id,
      req.user.id
    );

    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(res, 200, result.message, result.data);
  } catch (error) {
    logger.error("Error retrieving interview questions:", error);
    return sendInternalServerError(
      res,
      "Internal server error while retrieving interview questions"
    );
  }
};

module.exports = getInterviewQuestions;

