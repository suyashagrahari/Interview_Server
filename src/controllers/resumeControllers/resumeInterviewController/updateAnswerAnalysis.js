const {
  QuestionManagementService,
  sendAuthRequiredError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Update answer analysis
 */
const updateAnswerAnalysis = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const analysis = req.body;
    const result = await QuestionManagementService.updateAnswerAnalysis(
      req.params.id,
      req.user.id,
      req.params.questionId,
      analysis
    );

    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(
      res,
      200,
      "Answer analysis updated successfully",
      result.data
    );
  } catch (error) {
    logger.error("Error updating answer analysis:", error);
    return sendInternalServerError(
      res,
      "Internal server error while updating answer analysis"
    );
  }
};

module.exports = updateAnswerAnalysis;

