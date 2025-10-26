const {
  JobDescriptionInterview,
  sendAuthRequiredError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Get job description interview by ID
 */
const getInterviewById = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const interview = await JobDescriptionInterview.findOne({
      _id: req.params.id,
      candidateId: req.user.id,
      isActive: true,
    })
      .populate("jobDescriptionId", "jdName jdText")
      .populate("candidateId", "name email");

    if (!interview) {
      return sendNotFoundError(res, "Interview not found");
    }

    return sendSuccessResponse(
      res,
      200,
      "Interview retrieved successfully",
      interview
    );
  } catch (error) {
    logger.error("Error getting interview by ID:", error);
    return sendInternalServerError(
      res,
      "Internal server error while fetching interview"
    );
  }
};

module.exports = getInterviewById;
