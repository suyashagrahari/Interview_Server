const { Interview, logger } = require("./dependencies");

/**
 * Add question to interview
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @param {Object} questionData - Question data
 * @returns {Promise<Object>} Result
 */
const addQuestionToInterview = async (interviewId, userId, questionData) => {
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
};

module.exports = addQuestionToInterview;



