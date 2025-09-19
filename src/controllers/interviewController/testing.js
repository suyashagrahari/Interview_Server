const {
  Interview,
  User,
  AnalysisService,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Testing endpoint
 */
const testing = async (req, res) => {
  try {
    const { interviewId, userId } = req.body;

    const interview = await Interview.findOne({
      _id: interviewId,
      candidateId: userId,
      isActive: true,
    })
      .populate("resumeId", "resumeText resumeName")
      .populate(
        "interviewerId",
        "name role experience bio introduction specialties"
      );

    if (!interview) {
      return sendNotFoundError(res, "Interview not found or not active");
    }

    // Get candidate's name from user data
    const candidate = await User.findById(userId);
    const candidateName = candidate
      ? `${candidate.firstName} ${candidate.lastName}`.trim()
      : "Candidate";

    // Generate introduction question
    const introductionQuestion =
      await AnalysisService.generateIntroductionQuestion(
        interview,
        candidateName
      );

    return sendSuccessResponse(res, 200, "Test successful", {
      interview: {
        id: interview._id,
        jobRole: interview.jobRole,
        interviewType: interview.interviewType,
        level: interview.level,
        difficultyLevel: interview.difficultyLevel,
      },
      candidate: {
        name: candidateName,
        id: userId,
      },
      introductionQuestion: introductionQuestion,
    });
  } catch (error) {
    logger.error("Error testing:", error);
    return sendInternalServerError(res, "Internal server error", error.message);
  }
};

module.exports = testing;

