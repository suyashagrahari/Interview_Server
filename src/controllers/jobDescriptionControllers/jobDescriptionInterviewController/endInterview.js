const JobDescriptionInterviewService = require("../../../services/jobDescriptionServices/jobDescriptionInterviewService");
const {
  sendAuthRequiredError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * End job description interview and mark as completed
 */
const endInterview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result = await JobDescriptionInterviewService.endInterview(
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
    logger.error("Error ending job description interview:", error);
    return sendInternalServerError(
      res,
      "Internal server error while ending interview"
    );
  }
};

module.exports = endInterview;
