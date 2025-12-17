const {
  QuestionManagementService,
  sendAuthRequiredError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Get first question (introduction) from question pool for interview
 */
const generateFirstQuestion = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result = await QuestionManagementService.getFirstQuestion(
      req.params.id,
      req.user.id
    );
    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(res, 200, result.message, result.data);
  } catch (error) {
    logger.error("Error getting first question:", error);
    return sendInternalServerError(
      res,
      "Internal server error while getting first question"
    );
  }
};

module.exports = generateFirstQuestion;

