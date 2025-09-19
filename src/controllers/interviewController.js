const Interview = require("../models/Interview");
const Resume = require("../models/Resume");
const User = require("../models/User");
const logger = require("../utils/logger");
const InterviewService = require("../services/interviewService");
const QuestionGenerationService = require("../services/questionGenerationService");
const QuestionManagementService = require("../services/questionManagementService");
const AnalysisService = require("../services/analysisService");
const chatGPTService = require("../services/chatgptService");
const {
  validateInterviewRequest,
  validateAnswerSubmission,
  validateQuestionAddition,
  validateStatusUpdate,
  validatePaginationParams,
} = require("../utils/validation");
const {
  sendSuccessResponse,
  sendErrorResponse,
  sendAuthRequiredError,
  sendValidationError,
  sendNotFoundError,
  sendConflictError,
  sendInternalServerError,
  sendPaginatedResponse,
  sendCreatedResponse,
} = require("../utils/responseHelpers");

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

/**
 * Update interview status
 */
const updateInterviewStatus = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const validation = validateStatusUpdate(req.body.status);
    if (!validation.isValid) {
      return sendValidationError(res, validation.errors);
    }

    const result = await InterviewService.updateInterviewStatus(
      req.params.id,
      req.user.id,
      req.body.status
    );
    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(
      res,
      200,
      `Interview ${req.body.status} successfully`,
      result.data
    );
  } catch (error) {
    logger.error("Error updating interview status:", error);
    return sendInternalServerError(
      res,
      "Internal server error while updating interview status"
    );
  }
};

/**
 * Add question to interview
 */
const addQuestion = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const validation = validateQuestionAddition(req.body);
    if (!validation.isValid) {
      return sendValidationError(res, validation.errors);
    }

    const { questionId, question, category, difficulty, expectedAnswer } =
      req.body;
    const questionData = {
      questionId,
      question,
      category,
      difficulty: difficulty || "medium",
      expectedAnswer: expectedAnswer || "",
    };

    const result = await QuestionManagementService.addQuestionToInterview(
      req.params.id,
      req.user.id,
      questionData
    );

    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(
      res,
      200,
      "Question added successfully",
      result.data
    );
  } catch (error) {
    logger.error("Error adding question:", error);
    return sendInternalServerError(
      res,
      "Internal server error while adding question"
    );
  }
};

/**
 * Update answer for a question
 */
const updateAnswer = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const validation = validateAnswerSubmission(req.body);
    if (!validation.isValid) {
      return sendValidationError(res, validation.errors);
    }

    const { answer, timeSpent } = req.body;
    const result = await QuestionManagementService.updateAnswer(
      req.params.id,
      req.user.id,
      req.params.questionId,
      answer,
      timeSpent
    );

    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(
      res,
      200,
      "Answer updated successfully",
      result.data
    );
  } catch (error) {
    logger.error("Error updating answer:", error);
    return sendInternalServerError(
      res,
      "Internal server error while updating answer"
    );
  }
};

/**
 * Update answer analysis
 */
const updateAnswerAnalysis = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const analysis = req.body;
    const result = await QuestionManagementService.updateAnswerAnalysis(
      req.params.id,
      req.user.id,
      req.params.questionId,
      analysis
    );

    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(
      res,
      200,
      "Answer analysis updated successfully",
      result.data
    );
  } catch (error) {
    logger.error("Error updating answer analysis:", error);
    return sendInternalServerError(
      res,
      "Internal server error while updating answer analysis"
    );
  }
};

/**
 * Delete interview
 */
const deleteInterview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result = await InterviewService.deleteInterview(
      req.params.id,
      req.user.id
    );
    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(res, 200, "Interview deleted successfully");
  } catch (error) {
    logger.error("Error deleting interview:", error);
    return sendInternalServerError(
      res,
      "Internal server error while deleting interview"
    );
  }
};

/**
 * Get questions for an interview
 */
const getInterviewQuestions = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result = await QuestionGenerationService.getQuestionsForInterview(
      req.params.id,
      req.user.id
    );

    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(res, 200, result.message, result.data);
  } catch (error) {
    logger.error("Error retrieving interview questions:", error);
    return sendInternalServerError(
      res,
      "Internal server error while retrieving interview questions"
    );
  }
};

/**
 * Generate questions for an interview (manual trigger)
 */
const generateInterviewQuestions = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result =
      await QuestionGenerationService.generateQuestionsForInterview(
        req.params.id,
        req.user.id
      );

    if (!result.success) {
      return sendConflictError(res, result.message, result.data);
    }

    return sendCreatedResponse(res, result.message, result.data);
  } catch (error) {
    logger.error("Error generating interview questions:", error);
    return sendInternalServerError(
      res,
      "Internal server error while generating interview questions"
    );
  }
};

/**
 * Test ChatGPT API connection
 */
const testChatGPTConnection = async (req, res) => {
  try {
    const isWorking = await chatGPTService.testConnection();

    return sendSuccessResponse(
      res,
      200,
      isWorking ? "ChatGPT API is working" : "ChatGPT API is not working",
      {
        isWorking,
      }
    );
  } catch (error) {
    logger.error("Error testing ChatGPT connection:", error);
    return sendInternalServerError(
      res,
      "Internal server error while testing ChatGPT connection"
    );
  }
};

/**
 * Get first question (introduction) from question pool for interview
 */
const generateFirstQuestion = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result = await QuestionManagementService.getFirstQuestion(
      req.params.id,
      req.user.id
    );
    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(res, 200, result.message, result.data);
  } catch (error) {
    logger.error("Error getting first question:", error);
    return sendInternalServerError(
      res,
      "Internal server error while getting first question"
    );
  }
};

/**
 * Submit answer and get analysis + next question
 */
const submitAnswer = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const {
      answer,
      timeSpent,
      startTime,
      endTime,
      tabSwitches,
      copyPasteCount,
      faceDetection,
      mobileDetection,
      laptopDetection,
      zoomIn,
      zoomOut,
      questionNumber,
    } = req.body;

    // Find the interview
    const interview = await Interview.findOne({
      _id: req.params.id,
      candidateId: req.user.id,
      isActive: true,
    }).populate("resumeId", "resumeText resumeName");

    if (!interview) {
      return sendNotFoundError(res, "Interview not found");
    }

    // Find the question
    const question = interview.questions.find(
      (q) => q.questionId === req.params.questionId
    );
    if (!question) {
      return sendNotFoundError(res, "Question not found");
    }

    // Update answer with proctoring data
    await interview.updateAnswer(req.params.questionId, answer, timeSpent);

    // Mark question as completed in question pool
    await QuestionManagementService.markQuestionCompleted(
      req.params.id,
      req.user.id,
      req.params.questionId
    );

    // Process answer analysis and next question generation in parallel
    const [analysisResult, nextQuestionResult] = await Promise.allSettled([
      AnalysisService.analyzeAnswer(interview, question, answer, {
        timeSpent,
        startTime,
        endTime,
        tabSwitches,
        copyPasteCount,
        faceDetection,
        mobileDetection,
        laptopDetection,
        zoomIn,
        zoomOut,
      }),
      QuestionManagementService.getNextQuestionFromPool(
        interview,
        questionNumber
      ),
    ]);

    // Update answer analysis if successful
    if (analysisResult.status === "fulfilled" && analysisResult.value.success) {
      await interview.updateAnswerAnalysis(
        req.params.questionId,
        analysisResult.value.analysis
      );
    }

    // Add next question if found
    let nextQuestion = null;
    if (
      nextQuestionResult.status === "fulfilled" &&
      nextQuestionResult.value.success &&
      nextQuestionResult.value.question
    ) {
      nextQuestion = nextQuestionResult.value.question;
      await interview.addQuestion({
        questionId: nextQuestion.questionId,
        question: nextQuestion.question,
        category: nextQuestion.category,
        difficulty: nextQuestion.difficulty || "medium",
        expectedAnswer: nextQuestion.expectedAnswer,
      });
    }

    logger.info(
      `Answer submitted for interview ${req.params.id}, question ${req.params.questionId}`
    );

    return sendSuccessResponse(res, 200, "Answer submitted successfully", {
      questionId: req.params.questionId,
      answer,
      analysis:
        analysisResult.status === "fulfilled"
          ? analysisResult.value.analysis
          : null,
      nextQuestion: nextQuestion,
      questionNumber: questionNumber + 1,
    });
  } catch (error) {
    logger.error("Error submitting answer:", error);
    return sendInternalServerError(
      res,
      "Internal server error while submitting answer"
    );
  }
};

/**
 * End interview and mark as completed
 */
const endInterview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const result = await InterviewService.endInterview(
      req.params.id,
      req.user.id
    );
    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(
      res,
      200,
      "Interview ended successfully",
      result.data
    );
  } catch (error) {
    logger.error("Error ending interview:", error);
    return sendInternalServerError(
      res,
      "Internal server error while ending interview"
    );
  }
};

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

module.exports = {
  startInterview,
  getUserInterviews,
  getInterviewById,
  updateInterviewStatus,
  addQuestion,
  updateAnswer,
  updateAnswerAnalysis,
  deleteInterview,
  getInterviewQuestions,
  generateInterviewQuestions,
  testChatGPTConnection,
  generateFirstQuestion,
  submitAnswer,
  endInterview,
  testing,
};
