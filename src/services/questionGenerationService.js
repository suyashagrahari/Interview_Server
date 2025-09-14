const QuestionPool = require("../models/QuestionPool");
const Resume = require("../models/Resume");
const Interview = require("../models/Interview");
const chatGPTService = require("./chatgptService");
const logger = require("../utils/logger");

/**
 * Generate questions for an interview based on resume
 * @param {string} interviewId - The interview ID
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Generated questions result
 */
async function generateQuestionsForInterview(interviewId, userId) {
  try {
    // Get interview details
    const interview = await Interview.findOne({
      _id: interviewId,
      candidateId: userId,
      isActive: true,
    }).populate("resumeId", "resumeText resumeName");

    if (!interview) {
      throw new Error("Interview not found");
    }

    // Check if questions already exist for this interview
    const existingQuestionPool = await QuestionPool.findOne({
      interviewId: interviewId,
    });

    if (existingQuestionPool) {
      return {
        success: false,
        message: "Questions already generated for this interview",
        data: {
          questionPoolId: existingQuestionPool._id,
          questionCount: existingQuestionPool.questionCount,
        },
      };
    }

    // Generate questions using ChatGPT
    logger.info("Generating questions for interview:", {
      interviewId,
      resumeId: interview.resumeId._id,
      jobRole: interview.jobRole,
      interviewType: interview.interviewType,
      level: interview.level,
      difficultyLevel: interview.difficultyLevel,
    });

    const chatGPTResponse = await chatGPTService.generateInterviewQuestions({
      resumeText: interview.resumeId.resumeText,
      interviewType: interview.interviewType,
      level: interview.level,
      difficultyLevel: interview.difficultyLevel,
      jobRole: interview.jobRole,
    });

    if (!chatGPTResponse.success) {
      throw new Error("Failed to generate questions from ChatGPT");
    }

    // Create question pool
    const questionPool = new QuestionPool({
      resumeId: interview.resumeId._id,
      interviewId: interviewId,
      userId: userId,
      interviewType: interview.interviewType,
      level: interview.level,
      difficultyLevel: interview.difficultyLevel,
      jobRole: interview.jobRole,
      questions: chatGPTResponse.questions,
      totalTokensUsed: chatGPTResponse.totalTokensUsed,
    });

    await questionPool.save();

    // Add questions to the interview
    for (const questionData of chatGPTResponse.questions) {
      await interview.addQuestion({
        questionId: questionData.questionId,
        question: questionData.question,
        category: questionData.category,
        difficulty: "medium", // Default difficulty
        expectedAnswer: questionData.expectedAnswer,
      });
    }

    logger.info("Questions generated successfully", {
      interviewId,
      questionPoolId: questionPool._id,
      questionCount: chatGPTResponse.questions.length,
      totalTokensUsed: chatGPTResponse.totalTokensUsed,
    });

    return {
      success: true,
      message: "Questions generated successfully",
      data: {
        questionPoolId: questionPool._id,
        questionCount: chatGPTResponse.questions.length,
        totalTokensUsed: chatGPTResponse.totalTokensUsed,
        questions: chatGPTResponse.questions.map((q) => ({
          questionId: q.questionId,
          question: q.question,
          category: q.category,
          keywords: q.keywords,
        })),
      },
    };
  } catch (error) {
    logger.error("Error generating questions:", error);
    throw error;
  }
}

/**
 * Get questions for an interview
 * @param {string} interviewId - The interview ID
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Questions data
 */
async function getQuestionsForInterview(interviewId, userId) {
  try {
    // Get question pool
    const questionPool = await QuestionPool.findOne({
      interviewId: interviewId,
      userId: userId,
    });

    if (!questionPool) {
      return {
        success: false,
        message: "Questions not found for this interview",
        data: null,
      };
    }

    return {
      success: true,
      message: "Questions retrieved successfully",
      data: {
        questionPoolId: questionPool._id,
        questionCount: questionPool.questionCount,
        totalTokensUsed: questionPool.totalTokensUsed,
        questions: questionPool.questions.map((q) => ({
          questionId: q.questionId,
          question: q.question,
          category: q.category,
          expectedAnswer: q.expectedAnswer,
          keywords: q.keywords,
        })),
        createdAt: questionPool.createdAt,
      },
    };
  } catch (error) {
    logger.error("Error retrieving questions:", error);
    throw error;
  }
}

/**
 * Get a specific question by ID
 * @param {string} interviewId - The interview ID
 * @param {string} questionId - The question ID
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Question data
 */
async function getQuestionById(interviewId, questionId, userId) {
  try {
    // Get question pool
    const questionPool = await QuestionPool.findOne({
      interviewId: interviewId,
      userId: userId,
    });

    if (!questionPool) {
      return {
        success: false,
        message: "Questions not found for this interview",
        data: null,
      };
    }

    // Get specific question
    const question = questionPool.getQuestionById(questionId);

    if (!question) {
      return {
        success: false,
        message: "Question not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Question retrieved successfully",
      data: {
        questionId: question.questionId,
        question: question.question,
        category: question.category,
        expectedAnswer: question.expectedAnswer,
        keywords: question.keywords,
      },
    };
  } catch (error) {
    logger.error("Error retrieving question:", error);
    throw error;
  }
}

/**
 * Get user's question pools
 * @param {string} userId - The user ID
 * @param {number} limit - Number of results to return
 * @param {number} page - Page number
 * @returns {Promise<Object>} Question pools data
 */
async function getUserQuestionPools(userId, limit = 10, page = 1) {
  try {
    const skip = (page - 1) * limit;

    const questionPools = await QuestionPool.findByUser(
      userId,
      parseInt(limit)
    );

    const totalQuestionPools = await QuestionPool.countDocuments({
      userId: userId,
    });

    return {
      success: true,
      message: "Question pools retrieved successfully",
      data: {
        questionPools: questionPools.map((pool) => ({
          id: pool._id,
          resumeId: pool.resumeId,
          interviewId: pool.interviewId,
          jobRole: pool.jobRole,
          interviewType: pool.interviewType,
          level: pool.level,
          difficultyLevel: pool.difficultyLevel,
          questionCount: pool.questionCount,
          totalTokensUsed: pool.totalTokensUsed,
          createdAt: pool.createdAt,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalQuestionPools / limit),
          totalQuestionPools,
          hasNext: page * limit < totalQuestionPools,
          hasPrev: page > 1,
        },
      },
    };
  } catch (error) {
    logger.error("Error retrieving question pools:", error);
    throw error;
  }
}

/**
 * Check if questions exist for an interview
 * @param {string} interviewId - The interview ID
 * @returns {Promise<boolean>} Whether questions exist
 */
async function questionsExistForInterview(interviewId) {
  try {
    const questionPool = await QuestionPool.findOne({
      interviewId: interviewId,
    });

    return !!questionPool;
  } catch (error) {
    logger.error("Error checking if questions exist:", error);
    return false;
  }
}

/**
 * Get question pool by interview ID
 * @param {string} interviewId - The interview ID
 * @returns {Promise<Object|null>} Question pool or null
 */
async function getQuestionPoolByInterview(interviewId) {
  try {
    const questionPool = await QuestionPool.findByInterview(interviewId);
    return questionPool;
  } catch (error) {
    logger.error("Error getting question pool by interview:", error);
    return null;
  }
}

module.exports = {
  generateQuestionsForInterview,
  getQuestionsForInterview,
  getQuestionById,
  getUserQuestionPools,
  questionsExistForInterview,
  getQuestionPoolByInterview,
};
