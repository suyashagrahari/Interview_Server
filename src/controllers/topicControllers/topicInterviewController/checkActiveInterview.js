const {
  TopicInterviewService,
  logger,
  sendAuthRequiredError,
  sendInternalServerError,
  sendSuccessResponse,
} = require("./dependencies");

/**
 * Check if user has an active topic interview
 */
const checkActiveInterview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result = await TopicInterviewService.checkActiveInterview(req.user.id);

    if (result.hasActiveInterview) {
      return sendSuccessResponse(res, "Active interview found", {
        hasActiveInterview: true,
        interview: {
          interviewId: result.interview._id,
          topicName: result.interview.topicName,
          status: result.interview.status,
          startedAt: result.interview.startedAt,
          questionCount: result.interview.questions.length,
        },
      });
    }

    return sendSuccessResponse(res, "No active interview", {
      hasActiveInterview: false,
    });
  } catch (error) {
    logger.error(
      "❌ [Topic Interview Controller] Error checking active interview:",
      error
    );
    return sendInternalServerError(
      res,
      "Internal server error while checking active interview"
    );
  }
};

module.exports = checkActiveInterview;
