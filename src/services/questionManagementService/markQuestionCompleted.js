const { QuestionPool, logger } = require("./dependencies");

/**
 * Mark question as completed in question pool
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @param {string} questionId - Question ID
 * @returns {Promise<Object>} Result
 */
const markQuestionCompleted = async (interviewId, userId, questionId) => {
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
};

module.exports = markQuestionCompleted;



