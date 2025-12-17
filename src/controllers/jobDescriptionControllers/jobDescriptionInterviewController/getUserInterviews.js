const {
  JobDescriptionInterview,
  sendAuthRequiredError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Get all interviews for the current user
 */
const getUserInterviews = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const { status, limit = 10, page = 1 } = req.query;

    const query = {
      candidateId: req.user.id,
      isActive: true,
    };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const interviews = await JobDescriptionInterview.find(query)
      .populate("jobDescriptionId", "jdName")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await JobDescriptionInterview.countDocuments(query);

    return sendSuccessResponse(res, 200, "Interviews retrieved successfully", {
      interviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error getting user interviews:", error);
    return sendInternalServerError(
      res,
      "Internal server error while fetching interviews"
    );
  }
};

module.exports = getUserInterviews;
