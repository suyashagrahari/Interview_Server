const { QuestionPool, logger } = require("./dependencies");
const generateFollowUpQuestion = require("./generateFollowUpQuestion");

/**
 * Get next question from question pool based on alternating pattern
 * @param {Object} interview - Interview object
 * @param {number} currentQuestionNumber - Current question number
 * @returns {Promise<Object>} Next question result
 */
const getNextQuestionFromPool = async (interview, currentQuestionNumber) => {
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
      const followUpQuestion = await generateFollowUpQuestion(
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
};

module.exports = getNextQuestionFromPool;



