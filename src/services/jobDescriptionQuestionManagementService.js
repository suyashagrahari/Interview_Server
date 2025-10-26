const JobDescriptionInterview = require("../models/JobDescriptionInterview");
const JobDescriptionInterviewQuestionPool = require("../models/JobDescriptionInterviewQuestionPool");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

/**
 * Job Description Question Management Service
 * Dedicated service for managing questions in job description interviews
 */
class JobDescriptionQuestionManagementService {
  /**
   * Get first question for job description interview
   */
  async getFirstQuestion(interviewId, userId) {
    try {
      logger.info("🔍 [JD] Starting getFirstQuestion with:", {
        interviewId,
        userId,
      });

      // Get interview details
      const interview = await JobDescriptionInterview.findOne({
        _id: interviewId,
        candidateId: userId,
        isActive: true,
      });

      if (!interview) {
        logger.error(
          "❌ [JD] No interview found for interviewId:",
          interviewId
        );
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
      const questionPool = await JobDescriptionInterviewQuestionPool.findOne({
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
      console.log("🔍 [JD] DEBUG: Question pool ID:", questionPool._id);
      console.log(
        "🔍 [JD] DEBUG: Total questions in pool:",
        questionPool.questions.length
      );
      console.log(
        "🔍 [JD] DEBUG: First question from pool:",
        JSON.stringify(firstQuestion, null, 2)
      );
      console.log(
        "🔍 [JD] DEBUG: All questions in pool:",
        JSON.stringify(questionPool.questions, null, 2)
      );

      // Validate first question data
      if (
        !firstQuestion ||
        !firstQuestion.question ||
        !firstQuestion.questionId
      ) {
        logger.error("❌ [JD] Invalid first question data in question pool:", {
          firstQuestion,
          questionPoolId: questionPool._id,
          totalQuestions: questionPool.questions.length,
          allQuestions: questionPool.questions.map((q) => ({
            questionId: q.questionId,
            question: q.question
              ? q.question.substring(0, 50) + "..."
              : "UNDEFINED",
            category: q.category,
            hasExpectedAnswer: !!q.expectedAnswer,
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
        logger.error("❌ [JD] Empty or invalid question text:", {
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
        `First question retrieved from pool for job-description interview ${interviewId} (question ID: ${firstQuestion.questionId})`
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
  }

  /**
   * Get next question for job description interview
   */
  async getNextQuestion(interviewId, userId) {
    try {
      logger.info("🔍 [JD] Getting next question for interview:", interviewId);

      // Get interview details
      const interview = await JobDescriptionInterview.findOne({
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

      // Get question pool for this interview
      const questionPool = await JobDescriptionInterviewQuestionPool.findOne({
        interviewId: interviewId,
        userId: userId,
      });

      if (!questionPool || questionPool.questions.length === 0) {
        return {
          success: false,
          message: "Question pool not found",
        };
      }

      // Find next unanswered question
      const nextQuestion = questionPool.questions.find((q) => !q.isAsked);

      // Debug logging
      console.log(
        "🔍 [JD] DEBUG: Total questions in pool:",
        questionPool.questions.length
      );
      console.log(
        "🔍 [JD] DEBUG: Questions asked status:",
        questionPool.questions.map((q) => ({
          questionId: q.questionId,
          isAsked: q.isAsked,
        }))
      );
      console.log(
        "🔍 [JD] DEBUG: Next question found:",
        nextQuestion ? nextQuestion.questionId : "NONE"
      );

      if (!nextQuestion) {
        // No more questions available
        console.log(
          "🔍 [JD] DEBUG: No more questions available, ending interview"
        );
        return {
          success: false,
          message: "No more questions available",
        };
      }

      // Add question to interview
      await interview.addQuestion({
        questionId: nextQuestion.questionId,
        question: nextQuestion.question,
        category: nextQuestion.category,
        difficulty: nextQuestion.difficulty || "medium",
        expectedAnswer: nextQuestion.expectedAnswer,
        questionType: "pool",
      });

      // Mark question as asked in question pool
      if (questionPool.markQuestionAsked) {
        await questionPool.markQuestionAsked(nextQuestion.questionId);
      }

      logger.info(
        `Next question retrieved for job-description interview ${interviewId} (question ID: ${nextQuestion.questionId})`
      );

      return {
        success: true,
        message: "Next question retrieved successfully",
        data: {
          question: nextQuestion,
          interviewId: interview._id,
          questionNumber: interview.questions.length,
        },
      };
    } catch (error) {
      logger.error("Error getting next question:", error);
      return {
        success: false,
        message: "Internal server error while retrieving next question",
        error: error.message,
      };
    }
  }

  /**
   * Submit answer for job description interview
   */
  async submitAnswer(interviewId, questionId, userId, answer, proctoringData) {
    try {
      logger.info("🔍 [JD] Submitting answer for interview:", interviewId);

      // Get interview details
      const interview = await JobDescriptionInterview.findOne({
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
      interview.questions[questionIndex].isAnswered = true;

      // Update proctoring data if provided
      if (proctoringData) {
        await interview.updateProctoringData(proctoringData);
      }

      // Save the interview
      await interview.save();

      logger.info(
        `Answer submitted for job-description interview ${interviewId}, question ${questionId}`
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
  }

  /**
   * Detect interview type (always returns 'job-description' for this service)
   */
  async detectInterviewType(interviewId) {
    try {
      // Check if it's a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(interviewId)) {
        return null;
      }

      // Check job description interview
      const jdInterview = await JobDescriptionInterview.findOne({
        _id: interviewId,
      });
      if (jdInterview) {
        return "job-description";
      }

      return null;
    } catch (error) {
      logger.error("Error detecting interview type:", error);
      return null;
    }
  }
}

module.exports = new JobDescriptionQuestionManagementService();
