const { Interview, logger } = require("./dependencies");

/**
 * Update answer analysis
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @param {string} questionId - Question ID
 * @param {Object} analysis - Analysis data
 * @returns {Promise<Object>} Result
 */
const updateAnswerAnalysis = async (
  interviewId,
  userId,
  questionId,
  analysis
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
};

module.exports = updateAnswerAnalysis;

