const {
  JobDescriptionInterview,
  JobDescription,
  validateInterviewRequest,
  sendAuthRequiredError,
  sendValidationError,
  sendConflictError,
  sendNotFoundError,
  sendInternalServerError,
  sendCreatedResponse,
  logger,
} = require("./dependencies");

const JobDescriptionQuestionGenerationService = require("../../../services/jobDescriptionServices/jobDescriptionQuestionGenerationService");
const mongoose = require("mongoose");

/**
 * Start a new job description interview session
 * POST /api/job-description-interview/start
 */
const startInterview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    console.log("request bopdy --->", req.body);
    // Validate with 'jobDescription' source
    const validation = validateInterviewRequest(req.body, "jobDescription");
    if (!validation.isValid) {
      return sendValidationError(res, validation.errors);
    }

    // Validate jobDescriptionId format
    if (!mongoose.Types.ObjectId.isValid(req.body.jobDescriptionId)) {
      return sendValidationError(res, ["Invalid jobDescriptionId format"]);
    }

    // Check for active interview
    const activeInterview = await JobDescriptionInterview.findOne({
      candidateId: req.user.id,
      status: { $in: ["in_progress"] },
      isActive: true,
    });

    if (activeInterview) {
      return sendConflictError(
        res,
        "You already have an active interview session. Please complete or cancel it before starting a new one.",
        {
          interviewId: activeInterview._id,
          status: activeInterview.status,
        }
      );
    }

    // Verify job description exists and belongs to user
    const jobDescription = await JobDescription.findOne({
      _id: req.body.jobDescriptionId,
      userId: req.user.id,
      isActive: true,
    });

    if (!jobDescription) {
      return sendNotFoundError(
        res,
        "Job description not found or access denied"
      );
    }

    logger.info(
      `Job Description found: ${jobDescription.jdName} for user: ${req.user.id}`
    );

    // Create interview with proper data mapping
    const interviewData = {
      candidateId: req.user.id,
      jobDescriptionId: req.body.jobDescriptionId,
      interviewType: req.body.interviewType,
      level: req.body.experienceLevel || req.body.level, // Use experienceLevel if provided, fallback to level
      difficultyLevel: req.body.difficultyLevel,
      jobRole: req.body.jobRole || jobDescription.jdName, // Extract from JD name if not provided
      interviewerId: req.body.interviewerId,
      interviewer: {
        name: req.body.interviewer.name,
        numberOfInterviewers: req.body.interviewer.numberOfInterviewers || 1,
        experience: req.body.interviewer.experience,
        bio: req.body.interviewer.bio,
        introduction: req.body.interviewer.introduction || "",
      },
      companyName: req.body.companyName || "",
      experienceLevel: req.body.experienceLevel || req.body.level || "",
      skills: req.body.skills || [],
      additionalNotes: req.body.additionalNotes || "",
      scheduled: req.body.scheduled || false,
      scheduledDate: req.body.scheduledDate || null,
      scheduledTime: req.body.scheduledTime || "",
      status: "in_progress",
      createdBy: req.user.id,
    };

    const interview = new JobDescriptionInterview(interviewData);
    await interview.save();

    logger.info(
      `Job Description Interview created: ${interview._id} for user: ${req.user.id}`
    );

    // Generate complete question set asynchronously (1 introduction + 8 regular questions)
    JobDescriptionQuestionGenerationService.generateCompleteQuestionSet(
      interview._id,
      req.user.id,
      jobDescription
    )
      .then((result) => {
        if (result.success) {
          logger.info(
            "Complete question set generated successfully for JD interview:",
            {
              interviewId: interview._id,
              questionCount: result.data.questionCount,
              introductionQuestion:
                result.data.introductionQuestion?.questionId,
              regularQuestionsCount: result.data.regularQuestions?.length || 0,
            }
          );
        } else {
          logger.warn("Failed to generate complete question set:", {
            interviewId: interview._id,
            message: result.message,
          });
        }
      })
      .catch((error) => {
        logger.error(
          "Error generating complete question set asynchronously:",
          error
        );
      });

    const responseData = {
      interviewId: interview._id,
      status: interview.status,
      startedAt: interview.startedAt,
      scheduledDate: interview.scheduledDate,
      scheduledTime: interview.scheduledTime,
      jdName: jobDescription.jdName,
      jobRole: interview.jobRole,
      interviewType: interview.interviewType,
      level: interview.level,
      difficultyLevel: interview.difficultyLevel,
      interviewer: {
        name: interview.interviewer.name,
        numberOfInterviewers: interview.interviewer.numberOfInterviewers,
        experience: interview.interviewer.experience,
        bio: interview.interviewer.bio,
      },
      questionsGenerating: true,
    };

    return sendCreatedResponse(
      res,
      "Job Description Interview started successfully",
      responseData
    );
  } catch (error) {
    logger.error("Error starting JD interview:", error);
    return sendInternalServerError(
      res,
      "Internal server error while starting interview"
    );
  }
};

module.exports = startInterview;
