const {
  QuestionGenerationService,
  sendAuthRequiredError,
  sendConflictError,
  sendInternalServerError,
  sendCreatedResponse,
  logger,
} = require("./dependencies");

/**
 * Generate questions for an interview (manual trigger)
 */
const generateInterviewQuestions = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result =
      await QuestionGenerationService.generateQuestionsForInterview(
        req.params.id,
        req.user.id
      );

    if (!result.success) {
      return sendConflictError(res, result.message, result.data);
    }

    return sendCreatedResponse(res, result.message, result.data);
  } catch (error) {
    logger.error("Error generating interview questions:", error);
    return sendInternalServerError(
      res,
      "Internal server error while generating interview questions"
    );
  }
};

module.exports = generateInterviewQuestions;

