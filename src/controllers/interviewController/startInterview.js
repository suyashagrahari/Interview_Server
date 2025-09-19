const {
  InterviewService,
  QuestionGenerationService,
  validateInterviewRequest,
  sendAuthRequiredError,
  sendValidationError,
  sendConflictError,
  sendNotFoundError,
  sendInternalServerError,
  sendCreatedResponse,
  logger,
} = require("./dependencies");

/**
 * Start a new interview session
 */
const startInterview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const validation = validateInterviewRequest(req.body);
    if (!validation.isValid) {
      return sendValidationError(res, validation.errors);
    }

    // Check for active interview
    const activeInterviewCheck = await InterviewService.checkActiveInterview(
      req.user.id
    );
    if (activeInterviewCheck.hasActive) {
      return sendConflictError(
        res,
        "You already have an active interview session. Please complete or cancel it before starting a new one.",
        {
          interviewId: activeInterviewCheck.interview._id,
          status: activeInterviewCheck.interview.status,
        }
      );
    }

    // Verify resume ownership
    const resumeCheck = await InterviewService.verifyResumeOwnership(
      req.body.resumeId,
      req.user.id
    );
    if (!resumeCheck.isValid) {
      return sendNotFoundError(res, "Resume not found or access denied");
    }

    // Create interview
    const interviewResult = await InterviewService.createInterview(
      req.user.id,
      req.body
    );
    if (!interviewResult.success) {
      return sendInternalServerError(res, "Failed to create interview");
    }

    // Generate questions asynchronously
    QuestionGenerationService.generateQuestionsForInterview(
      interviewResult.interview._id,
      req.user.id
    )
      .then((result) => {
        if (result.success) {
          logger.info("Questions generated successfully for interview:", {
            interviewId: interviewResult.interview._id,
            questionCount: result.data.questionCount,
          });
        }
      })
      .catch((error) => {
        logger.error("Error generating questions asynchronously:", error);
      });

    const responseData = {
      interviewId: interviewResult.interview._id,
      status: interviewResult.interview.status,
      startedAt: interviewResult.interview.startedAt,
      scheduledDate: interviewResult.interview.scheduledDate,
      scheduledTime: interviewResult.interview.scheduledTime,
      resumeName: resumeCheck.resume.resumeName,
      jobRole: interviewResult.interview.jobRole,
      interviewType: interviewResult.interview.interviewType,
      level: interviewResult.interview.level,
      difficultyLevel: interviewResult.interview.difficultyLevel,
      interviewer: {
        name: interviewResult.interview.interviewer.name,
        numberOfInterviewers:
          interviewResult.interview.interviewer.numberOfInterviewers,
        experience: interviewResult.interview.interviewer.experience,
        bio: interviewResult.interview.interviewer.bio,
      },
      questionsGenerating: true,
    };

    return sendCreatedResponse(
      res,
      "Interview started successfully",
      responseData
    );
  } catch (error) {
    logger.error("Error starting interview:", error);
    return sendInternalServerError(
      res,
      "Internal server error while starting interview"
    );
  }
};

module.exports = startInterview;

