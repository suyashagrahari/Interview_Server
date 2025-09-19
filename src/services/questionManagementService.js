const QuestionPool = require("../models/QuestionPool");
const Interview = require("../models/Interview");
const logger = require("../utils/logger");

/**
 * Question Management Service - Handles question operations
 */
class QuestionManagementService {
  /**
   * Add question to interview
   * @param {string} interviewId - Interview ID
   * @param {string} userId - User ID
   * @param {Object} questionData - Question data
   * @returns {Promise<Object>} Result
   */
  static async addQuestionToInterview(interviewId, userId, questionData) {
    try {
      const interview = await Interview.findOne({
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

      await interview.addQuestion(questionData);

      return {
        success: true,
        message: "Question added successfully",
        data: {
          questionId: questionData.questionId,
          question: questionData.question,
          category: questionData.category,
          difficulty: questionData.difficulty,
        },
      };
    } catch (error) {
      logger.error("Error adding question to interview:", error);
      return {
        success: false,
        message: "Error adding question",
      };
    }
  }

  /**
   * Update answer for a question
   * @param {string} interviewId - Interview ID
   * @param {string} userId - User ID
   * @param {string} questionId - Question ID
   * @param {string} answer - Answer text
   * @param {number} timeSpent - Time spent on question
   * @returns {Promise<Object>} Result
   */
  static async updateAnswer(
    interviewId,
    userId,
    questionId,
    answer,
    timeSpent
  ) {
    try {
      const interview = await Interview.findOne({
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

      await interview.updateAnswer(questionId, answer, timeSpent);

      return {
        success: true,
        message: "Answer updated successfully",
        data: {
          questionId,
          answer,
          timeSpent: timeSpent || 0,
          answeredAt: new Date(),
        },
      };
    } catch (error) {
      logger.error("Error updating answer:", error);
      if (error.message === "Question not found") {
        return {
          success: false,
          message: "Question not found",
        };
      }
      return {
        success: false,
        message: "Error updating answer",
      };
    }
  }

  /**
   * Update answer analysis
   * @param {string} interviewId - Interview ID
   * @param {string} userId - User ID
   * @param {string} questionId - Question ID
   * @param {Object} analysis - Analysis data
   * @returns {Promise<Object>} Result
   */
  static async updateAnswerAnalysis(interviewId, userId, questionId, analysis) {
    try {
      const interview = await Interview.findOne({
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

      await interview.updateAnswerAnalysis(questionId, analysis);

      return {
        success: true,
        message: "Answer analysis updated successfully",
        data: {
          questionId,
          analysis,
        },
      };
    } catch (error) {
      logger.error("Error updating answer analysis:", error);
      if (error.message === "Question not found") {
        return {
          success: false,
          message: "Question not found",
        };
      }
      return {
        success: false,
        message: "Error updating answer analysis",
      };
    }
  }

  /**
   * Get first question from question pool
   * @param {string} interviewId - Interview ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result
   */
  static async getFirstQuestion(interviewId, userId) {
    try {
      const interview = await Interview.findOne({
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
      if (interview.questions.length > 0) {
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
      const questionPool = await QuestionPool.findOne({
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

      // Add question to interview (only when asked)
      await interview.addQuestion({
        questionId: firstQuestion.questionId,
        question: firstQuestion.question,
        category: firstQuestion.category,
        difficulty: "easy",
        expectedAnswer: firstQuestion.expectedAnswer,
      });

      logger.info(
        `First question retrieved from pool for interview ${interviewId}`
      );

      return {
        success: true,
        message: "First question retrieved successfully",
        data: {
          question: {
            questionId: firstQuestion.questionId,
            question: firstQuestion.question,
            category: firstQuestion.category,
            difficulty: "easy",
            expectedAnswer: firstQuestion.expectedAnswer,
          },
          interviewId: interview._id,
          questionNumber: 1,
        },
      };
    } catch (error) {
      logger.error("Error getting first question:", error);
      return {
        success: false,
        message: "Error getting first question",
      };
    }
  }

  /**
   * Get next question from question pool
   * @param {Object} interview - Interview object
   * @param {number} currentQuestionNumber - Current question number
   * @returns {Promise<Object>} Next question result
   */
  static async getNextQuestionFromPool(interview, currentQuestionNumber) {
    try {
      // Get question pool for this interview
      const questionPool = await QuestionPool.findOne({
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
        const AnalysisService = require("./analysisService");
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
        message: "Error getting next question",
      };
    }
  }

  /**
   * Mark question as completed in question pool
   * @param {string} interviewId - Interview ID
   * @param {string} userId - User ID
   * @param {string} questionId - Question ID
   * @returns {Promise<Object>} Result
   */
  static async markQuestionCompleted(interviewId, userId, questionId) {
    try {
      const questionPool = await QuestionPool.findOne({
        interviewId: interviewId,
        userId: userId,
      });

      if (questionPool) {
        await questionPool.markQuestionCompleted(questionId);
      }

      return {
        success: true,
        message: "Question marked as completed",
      };
    } catch (error) {
      logger.error("Error marking question as completed:", error);
      return {
        success: false,
        message: "Error marking question as completed",
      };
    }
  }
}

module.exports = QuestionManagementService;
