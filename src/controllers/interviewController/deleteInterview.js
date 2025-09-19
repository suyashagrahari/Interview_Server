const {
  InterviewService,
  sendAuthRequiredError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Delete interview
 */
const deleteInterview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result = await InterviewService.deleteInterview(
      req.params.id,
      req.user.id
    );
    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(res, 200, "Interview deleted successfully");
  } catch (error) {
    logger.error("Error deleting interview:", error);
    return sendInternalServerError(
      res,
      "Internal server error while deleting interview"
    );
  }
};

module.exports = deleteInterview;

