const {
  QuestionManagementService,
  validateAnswerSubmission,
  sendAuthRequiredError,
  sendValidationError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Update answer for a question
 */
const updateAnswer = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const validation = validateAnswerSubmission(req.body);
    if (!validation.isValid) {
      return sendValidationError(res, validation.errors);
    }

    const { answer, timeSpent } = req.body;
    const result = await QuestionManagementService.updateAnswer(
      req.params.id,
      req.user.id,
      req.params.questionId,
      answer,
      timeSpent
    );

    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(
      res,
      200,
      "Answer updated successfully",
      result.data
    );
  } catch (error) {
    logger.error("Error updating answer:", error);
    return sendInternalServerError(
      res,
      "Internal server error while updating answer"
    );
  }
};

module.exports = updateAnswer;

