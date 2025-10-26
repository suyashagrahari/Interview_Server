const {
  JobDescriptionInterview,
  sendAuthRequiredError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Check if user has an active interview
 */
const checkActiveInterview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const activeInterview = await JobDescriptionInterview.findOne({
      candidateId: req.user.id,
      status: { $in: ["scheduled", "in_progress"] },
      isActive: true,
    })
      .populate("jobDescriptionId", "jdName")
      .sort({ createdAt: -1 });

    if (activeInterview) {
      return sendSuccessResponse(res, 200, "Active interview found", {
        hasActive: true,
        interview: {
          _id: activeInterview._id,
          jobDescriptionId: activeInterview.jobDescriptionId,
          status: activeInterview.status,
          jobRole: activeInterview.jobRole,
          interviewType: activeInterview.interviewType,
          level: activeInterview.level,
          startedAt: activeInterview.startedAt,
          timeRemaining: activeInterview.timeRemaining,
          questionCount: activeInterview.questions.length,
        },
      });
    }

    return sendSuccessResponse(res, 200, "No active interview found", {
      hasActive: false,
      interview: null,
    });
  } catch (error) {
    logger.error("Error checking active interview:", error);
    return sendInternalServerError(
      res,
      "Internal server error while checking for active interview"
    );
  }
};

module.exports = checkActiveInterview;
