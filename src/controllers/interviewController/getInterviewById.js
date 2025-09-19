const {
  InterviewService,
  sendAuthRequiredError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Get specific interview by ID
 */
const getInterviewById = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result = await InterviewService.getInterviewById(
      req.params.id,
      req.user.id
    );
    if (!result.success) {
      return sendNotFoundError(res, "Interview not found");
    }

    return sendSuccessResponse(
      res,
      200,
      "Interview retrieved successfully",
      result.data
    );
  } catch (error) {
    logger.error("Error retrieving interview:", error);
    return sendInternalServerError(
      res,
      "Internal server error while retrieving interview"
    );
  }
};

module.exports = getInterviewById;

