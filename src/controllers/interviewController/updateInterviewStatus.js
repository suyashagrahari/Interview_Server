const {
  InterviewService,
  validateStatusUpdate,
  sendAuthRequiredError,
  sendValidationError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Update interview status
 */
const updateInterviewStatus = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const validation = validateStatusUpdate(req.body.status);
    if (!validation.isValid) {
      return sendValidationError(res, validation.errors);
    }

    const result = await InterviewService.updateInterviewStatus(
      req.params.id,
      req.user.id,
      req.body.status
    );
    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(
      res,
      200,
      `Interview ${req.body.status} successfully`,
      result.data
    );
  } catch (error) {
    logger.error("Error updating interview status:", error);
    return sendInternalServerError(
      res,
      "Internal server error while updating interview status"
    );
  }
};

module.exports = updateInterviewStatus;

