const { Interview, QuestionPool, logger } = require("./dependencies");

/**
 * Get first question from question pool
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result
 */
const getFirstQuestion = async (interviewId, userId) => {
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
};

module.exports = getFirstQuestion;



