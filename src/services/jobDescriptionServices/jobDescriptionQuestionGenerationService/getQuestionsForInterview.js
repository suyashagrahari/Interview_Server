const { logger } = require("./dependencies");
const JobDescriptionInterviewQuestionPool = require("../../../models/JobDescriptionInterviewQuestionPool");

/**
 * Get questions for a job description interview
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Questions result
 */
const getQuestionsForInterview = async (interviewId, userId) => {
  try {
    const questionPool = await JobDescriptionInterviewQuestionPool.findOne({
      interviewId: interviewId,
      userId: userId,
    });

    if (!questionPool) {
      return {
        success: false,
        message: "Question pool not found",
      };
    }

    return {
      success: true,
      message: "Questions retrieved successfully",
      data: {
        questions: questionPool.questions,
        totalQuestions: questionPool.questions.length,
      },
    };
  } catch (error) {
    logger.error("Error getting questions for JD interview:", error);
    return {
      success: false,
      message: "Error retrieving questions",
    };
  }
};

module.exports = getQuestionsForInterview;



