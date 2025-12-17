const {
  InterviewService,
  sendAuthRequiredError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * End interview and mark as completed
 */
const endInterview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result = await InterviewService.endInterview(
      req.params.id,
      req.user.id
    );
    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(
      res,
      200,
      "Interview ended successfully",
      result.data
    );
  } catch (error) {
    logger.error("Error ending interview:", error);
    return sendInternalServerError(
      res,
      "Internal server error while ending interview"
    );
  }
};

module.exports = endInterview;

