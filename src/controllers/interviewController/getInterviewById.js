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

    // Safety check: if ID is "active", "resume", or "check-active", this is a route conflict
    // These should be handled by specific routes, not this generic handler
    if (
      req.params.id === "active" ||
      req.params.id === "resume" ||
      req.params.id === "check-active"
    ) {
      logger.error(
        `Route conflict: ${req.params.id} hit getInterviewById instead of specific route`
      );
      return sendNotFoundError(res, "Invalid interview ID");
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
