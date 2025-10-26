// Unified Question Management Service
// Handles both resume-based and job description-based interviews
const ResumeInterview = require("../../models/ResumeInterview");
const JobDescriptionInterview = require("../../models/JobDescriptionInterview");
const ResumeQuestionPool = require("../../models/ResumeInterviewQuestionPool");
const JobDescriptionInterviewQuestionPool = require("../../models/JobDescriptionInterviewQuestionPool");
const JobDescriptionQuestionManagementService = require("../jobDescriptionServices/jobDescriptionQuestionManagementService");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");

/**
 * Get the appropriate interview model and question pool model based on interview type
 */
const getInterviewModels = (interviewType) => {
  switch (interviewType) {
    case "job-description":
      return {
        InterviewModel: JobDescriptionInterview,
        QuestionPoolModel: JobDescriptionInterviewQuestionPool,
        interviewIdField: "jobDescriptionId",
      };
    case "resume":
    default:
      return {
        InterviewModel: ResumeInterview,
        QuestionPoolModel: ResumeQuestionPool,
        interviewIdField: "resumeId",
      };
  }
};

/**
 * Detect interview type from interview ID by checking both models
 */
const detectInterviewType = async (interviewId) => {
  try {
    // Check if it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return null;
    }

    // Check job description interview first
    const jdInterview = await JobDescriptionInterview.findOne({
      _id: interviewId,
    });
    if (jdInterview) {
      return "job-description";
    }

    // Check resume interview
    const resumeInterview = await ResumeInterview.findOne({ _id: interviewId });
    if (resumeInterview) {
      return "resume";
    }

    return null;
  } catch (error) {
    logger.error("Error detecting interview type:", error);
    return null;
  }
};

/**
 * Get first question from question pool (unified for all interview types)
 */
const getFirstQuestion = async (interviewId, userId) => {
  try {
    logger.info("🔍 DEBUG: Starting getFirstQuestion with:", {
      interviewId,
      userId,
    });

    // Detect interview type
    const interviewType = await detectInterviewType(interviewId);
    logger.info("🔍 DEBUG: Detected interview type:", interviewType);

    if (!interviewType) {
      logger.error(
        "❌ No interview type detected for interviewId:",
        interviewId
      );
      return {
        success: false,
        message: "Interview not found",
      };
    }

    // Route to dedicated service for job description interviews
    if (interviewType === "job-description") {
      return await JobDescriptionQuestionManagementService.getFirstQuestion(
        interviewId,
        userId
      );
    }

    logger.info("🔍 DEBUG: Getting interview models for type:", interviewType);

    let InterviewModel, QuestionPoolModel;
    try {
      const models = getInterviewModels(interviewType);
      InterviewModel = models.InterviewModel;
      QuestionPoolModel = models.QuestionPoolModel;
      logger.info("🔍 DEBUG: Interview models retrieved:", {
        InterviewModel: InterviewModel ? InterviewModel.modelName : "UNDEFINED",
        QuestionPoolModel: QuestionPoolModel
          ? QuestionPoolModel.modelName
          : "UNDEFINED",
      });
    } catch (modelError) {
      logger.error("❌ Error getting interview models:", modelError);
      return {
        success: false,
        message: "Error getting interview models",
        error: modelError.message,
      };
    }

    // Get interview details
    const interview = await InterviewModel.findOne({
      _id: interviewId,
      candidateId: userId,
      isActive: true,
    });

    if (!interview) {
      return {
        success: false,
        message: "Interview not found",
      };
    }

    if (interview.status !== "in_progress") {
      return {
        success: false,
        message: "Interview is not in progress",
      };
    }

    // Check if first question already exists in interview
    if (interview.questions && interview.questions.length > 0) {
      return {
        success: true,
        message: "First question already exists, returning existing question",
        data: {
          question: interview.questions[0],
          interviewId: interview._id,
          questionNumber: 1,
        },
      };
    }

    // Get question pool for this interview
    const questionPool = await QuestionPoolModel.findOne({
      interviewId: interviewId,
      userId: userId,
    });

    if (!questionPool || questionPool.questions.length === 0) {
      return {
        success: false,
        message:
          "Question pool not found. Please ensure questions are generated first.",
      };
    }

    // Get the first question (introduction question) from the pool
    const firstQuestion = questionPool.questions[0];

    // Debug logging
    console.log("🔍 DEBUG: Question pool ID:", questionPool._id);
    console.log(
      "🔍 DEBUG: Total questions in pool:",
      questionPool.questions.length
    );
    console.log(
      "🔍 DEBUG: First question from pool:",
      JSON.stringify(firstQuestion, null, 2)
    );
    console.log(
      "🔍 DEBUG: All questions in pool:",
      JSON.stringify(questionPool.questions, null, 2)
    );

    // Validate first question data
    if (
      !firstQuestion ||
      !firstQuestion.question ||
      !firstQuestion.questionId
    ) {
      logger.error("❌ Invalid first question data in question pool:", {
        firstQuestion,
        questionPoolId: questionPool._id,
        totalQuestions: questionPool.questions.length,
        allQuestions: questionPool.questions.map((q) => ({
          questionId: q.questionId,
          question: q.question
            ? q.question.substring(0, 50) + "..."
            : "UNDEFINED",
          category: q.category,
        })),
      });
      return {
        success: false,
        message: "Invalid question data in question pool",
      };
    }

    // Validate question text
    if (
      typeof firstQuestion.question !== "string" ||
      firstQuestion.question.trim() === ""
    ) {
      logger.error("❌ Empty or invalid question text:", {
        questionText: firstQuestion.question,
        questionId: firstQuestion.questionId,
        type: typeof firstQuestion.question,
        length: firstQuestion.question ? firstQuestion.question.length : 0,
      });
      return {
        success: false,
        message: "Question text is empty or invalid",
      };
    }

    // Add question to interview (only when asked)
    await interview.addQuestion({
      questionId: firstQuestion.questionId,
      question: firstQuestion.question,
      category: firstQuestion.category,
      difficulty: "easy",
      expectedAnswer: firstQuestion.expectedAnswer,
      questionType: "pool",
    });

    // Mark question as asked in question pool
    if (questionPool.markQuestionAsked) {
      await questionPool.markQuestionAsked(firstQuestion.questionId);
    }

    logger.info(
      `First question retrieved from pool for ${interviewType} interview ${interviewId} (question ID: ${firstQuestion.questionId})`
    );

    return {
      success: true,
      message: "First question retrieved successfully",
      data: {
        question: firstQuestion,
        interviewId: interview._id,
        questionNumber: 1,
      },
    };
  } catch (error) {
    logger.error("Error getting first question:", error);
    return {
      success: false,
      message: "Internal server error while retrieving first question",
      error: error.message,
    };
  }
};

/**
 * Get next question from question pool (unified for all interview types)
 */
const getNextQuestionFromPool = async (interview, currentQuestionNumber) => {
  try {
    // Detect interview type from interview object
    const interviewType =
      interview.constructor.modelName === "JobDescriptionInterview"
        ? "job-description"
        : "resume";
    const { QuestionPoolModel } = getInterviewModels(interviewType);

    // Get question pool for this interview
    const questionPool = await QuestionPoolModel.findOne({
      interviewId: interview._id,
      userId: interview.candidateId,
    });

    if (!questionPool || questionPool.questions.length === 0) {
      return {
        success: false,
        message: "Question pool not found",
      };
    }

    // Determine next question index based on alternating pattern
    const nextQuestionIndex = currentQuestionNumber - 1; // Convert to 0-based index
    const nextQuestion = questionPool.questions[nextQuestionIndex];

    if (!nextQuestion) {
      return {
        success: false,
        message: "No more questions available",
      };
    }

    // Check if this is a follow-up question (odd indices: 2, 4, 6, 8)
    if (nextQuestionIndex % 2 === 0 && nextQuestionIndex > 0) {
      // Generate follow-up question based on previous answer
      const previousQuestion =
        interview.questions[interview.questions.length - 1];

      // Use appropriate analysis service based on interview type
      const AnalysisService = interviewType === "job-description"
        ? require("../jobDescriptionServices/jobDescriptionAnalysisService")
        : require("../resumeServices/resumeAnalysisService");

      const followUpQuestion = await AnalysisService.generateFollowUpQuestion(
        interview,
        previousQuestion,
        previousQuestion.answer,
        nextQuestionIndex
      );

      return {
        success: true,
        question: followUpQuestion,
      };
    } else {
      // Use question from pool
      return {
        success: true,
        question: {
          questionId: nextQuestion.questionId,
          question: nextQuestion.question,
          category: nextQuestion.category,
          difficulty: nextQuestion.difficulty || "medium",
          expectedAnswer: nextQuestion.expectedAnswer,
        },
      };
    }
  } catch (error) {
    logger.error("Error getting next question from pool:", error);
    return {
      success: false,
      message: "Internal server error while retrieving next question",
      error: error.message,
    };
  }
};

/**
 * Submit answer (unified for all interview types)
 */
const submitAnswer = async (
  interviewId,
  questionId,
  userId,
  answer,
  proctoringData
) => {
  try {
    // Detect interview type
    const interviewType = await detectInterviewType(interviewId);
    if (!interviewType) {
      return {
        success: false,
        message: "Interview not found",
      };
    }

    // Route to dedicated service for job description interviews
    if (interviewType === "job-description") {
      return await JobDescriptionQuestionManagementService.submitAnswer(
        interviewId,
        questionId,
        userId,
        answer,
        proctoringData
      );
    }

    const { InterviewModel } = getInterviewModels(interviewType);

    // Get interview details
    const interview = await InterviewModel.findOne({
      _id: interviewId,
      candidateId: userId,
      isActive: true,
    });

    if (!interview) {
      return {
        success: false,
        message: "Interview not found",
      };
    }

    if (interview.status !== "in_progress") {
      return {
        success: false,
        message: "Interview is not in progress",
      };
    }

    // Find the question in the interview
    const questionIndex = interview.questions.findIndex(
      (q) => q.questionId === questionId
    );
    if (questionIndex === -1) {
      return {
        success: false,
        message: "Question not found in interview",
      };
    }

    // Update the answer
    interview.questions[questionIndex].answer = answer;
    interview.questions[questionIndex].timeSpent =
      proctoringData?.timeSpent || 0;
    interview.questions[questionIndex].answeredAt = new Date();

    // Update proctoring data
    if (proctoringData) {
      interview.questions[questionIndex].proctoringData = {
        tabSwitches: proctoringData.tabSwitches || 0,
        copyPasteCount: proctoringData.copyPasteCount || 0,
        faceDetection: proctoringData.faceDetection || false,
        mobileDetection: proctoringData.mobileDetection || false,
        laptopDetection: proctoringData.laptopDetection || false,
        zoomIn: proctoringData.zoomIn || false,
        zoomOut: proctoringData.zoomOut || false,
      };
    }

    await interview.save();

    logger.info(
      `Answer submitted for ${interviewType} interview ${interviewId}, question ${questionId}`
    );

    return {
      success: true,
      message: "Answer submitted successfully",
      data: {
        questionId,
        answer,
        timeSpent: proctoringData?.timeSpent || 0,
      },
    };
  } catch (error) {
    logger.error("Error submitting answer:", error);
    return {
      success: false,
      message: "Internal server error while submitting answer",
      error: error.message,
    };
  }
};

// Create a class-like structure for backward compatibility
class UnifiedQuestionManagementService {
  static async getFirstQuestion(interviewId, userId) {
    return await getFirstQuestion(interviewId, userId);
  }

  static async getNextQuestion(interviewId, userId) {
    // Detect interview type
    const interviewType = await detectInterviewType(interviewId);
    if (!interviewType) {
      return {
        success: false,
        message: "Interview not found",
      };
    }

    // Route to dedicated service for job description interviews
    if (interviewType === "job-description") {
      return await JobDescriptionQuestionManagementService.getNextQuestion(
        interviewId,
        userId
      );
    }

    // For resume interviews, we need to get the interview first
    const { InterviewModel } = getInterviewModels(interviewType);
    const interview = await InterviewModel.findOne({
      _id: interviewId,
      candidateId: userId,
      isActive: true,
    });

    if (!interview) {
      return {
        success: false,
        message: "Interview not found",
      };
    }

    return await getNextQuestionFromPool(interview, interview.questions.length);
  }

  static async getNextQuestionFromPool(interview, currentQuestionNumber) {
    return await getNextQuestionFromPool(interview, currentQuestionNumber);
  }

  static async submitAnswer(
    interviewId,
    questionId,
    userId,
    answer,
    proctoringData
  ) {
    return await submitAnswer(
      interviewId,
      questionId,
      userId,
      answer,
      proctoringData
    );
  }

  static async detectInterviewType(interviewId) {
    return await detectInterviewType(interviewId);
  }
}

// Export both the class and individual functions
module.exports = UnifiedQuestionManagementService;
