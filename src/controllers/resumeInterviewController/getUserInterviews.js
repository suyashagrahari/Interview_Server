const {
  InterviewService,
  validatePaginationParams,
  sendAuthRequiredError,
  sendValidationError,
  sendInternalServerError,
  sendPaginatedResponse,
  logger,
} = require("./dependencies");

/**
 * Get all interviews for authenticated user
 */
const getUserInterviews = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const paginationValidation = validatePaginationParams(req.query);
    if (!paginationValidation.isValid) {
      return sendValidationError(res, paginationValidation.errors);
    }

    const result = await InterviewService.getUserInterviews(req.user.id, {
      status: req.query.status,
      limit: paginationValidation.limit,
      page: paginationValidation.page,
    });

    if (!result.success) {
      return sendInternalServerError(res, "Failed to retrieve interviews");
    }

    return sendPaginatedResponse(
      res,
      result.data.interviews,
      result.data.pagination,
      "Interviews retrieved successfully"
    );
  } catch (error) {
    logger.error("Error retrieving interviews:", error);
    return sendInternalServerError(
      res,
      "Internal server error while retrieving interviews"
    );
  }
};

module.exports = getUserInterviews;

