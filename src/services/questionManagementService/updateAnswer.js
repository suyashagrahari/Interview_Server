const { Interview, logger } = require("./dependencies");

/**
 * Update answer for a question
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @param {string} questionId - Question ID
 * @param {string} answer - Answer text
 * @param {number} timeSpent - Time spent on question
 * @returns {Promise<Object>} Result
 */
const updateAnswer = async (
  interviewId,
  userId,
  questionId,
  answer,
  timeSpent
) => {
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
};

module.exports = updateAnswer;



