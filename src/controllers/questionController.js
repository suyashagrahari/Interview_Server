const QuestionPool = require("../models/QuestionPool");
const Resume = require("../models/Resume");
const Interview = require("../models/Interview");
const chatGPTService = require("../services/chatgptService");
const logger = require("../utils/logger");

/**
 * Generate questions for an interview based on resume
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateQuestions = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { interviewId } = req.params;

    // Get interview details
    const interview = await Interview.findOne({
      _id: interviewId,
      candidateId: req.user.id,
      isActive: true,
    }).populate("resumeId", "resumeText resumeName");

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Check if questions already exist for this interview
    const existingQuestionPool = await QuestionPool.findOne({
      interviewId: interviewId,
    });

    if (existingQuestionPool) {
      return res.status(409).json({
        success: false,
        message: "Questions already generated for this interview",
        data: {
          questionPoolId: existingQuestionPool._id,
          questionCount: existingQuestionPool.questionCount,
        },
      });
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
      return res.status(500).json({
        success: false,
        message: "Failed to generate questions",
      });
    }

    // Create question pool
    const questionPool = new QuestionPool({
      resumeId: interview.resumeId._id,
      interviewId: interviewId,
      userId: req.user.id,
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

    res.status(201).json({
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
    });
  } catch (error) {
    logger.error("Error generating questions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while generating questions",
    });
  }
};

/**
 * Get questions for an interview
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQuestions = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { interviewId } = req.params;

    // Get question pool
    const questionPool = await QuestionPool.findOne({
      interviewId: interviewId,
      userId: req.user.id,
    });

    if (!questionPool) {
      return res.status(404).json({
        success: false,
        message: "Questions not found for this interview",
      });
    }

    res.status(200).json({
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
    });
  } catch (error) {
    logger.error("Error retrieving questions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving questions",
    });
  }
};

/**
 * Get question by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQuestionById = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { interviewId, questionId } = req.params;

    // Get question pool
    const questionPool = await QuestionPool.findOne({
      interviewId: interviewId,
      userId: req.user.id,
    });

    if (!questionPool) {
      return res.status(404).json({
        success: false,
        message: "Questions not found for this interview",
      });
    }

    // Get specific question
    const question = questionPool.getQuestionById(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Question retrieved successfully",
      data: {
        questionId: question.questionId,
        question: question.question,
        category: question.category,
        expectedAnswer: question.expectedAnswer,
        keywords: question.keywords,
      },
    });
  } catch (error) {
    logger.error("Error retrieving question:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving question",
    });
  }
};

/**
 * Get user's question pools
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserQuestionPools = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const questionPools = await QuestionPool.findByUser(
      req.user.id,
      parseInt(limit)
    );

    const totalQuestionPools = await QuestionPool.countDocuments({
      userId: req.user.id,
    });

    res.status(200).json({
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
    });
  } catch (error) {
    logger.error("Error retrieving question pools:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving question pools",
    });
  }
};

/**
 * Test ChatGPT API connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const testChatGPTConnection = async (req, res) => {
  try {
    const isWorking = await chatGPTService.testConnection();

    res.status(200).json({
      success: true,
      message: isWorking
        ? "ChatGPT API is working"
        : "ChatGPT API is not working",
      data: {
        isWorking,
      },
    });
  } catch (error) {
    logger.error("Error testing ChatGPT connection:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while testing ChatGPT connection",
    });
  }
};

module.exports = {
  generateQuestions,
  getQuestions,
  getQuestionById,
  getUserQuestionPools,
  testChatGPTConnection,
};
