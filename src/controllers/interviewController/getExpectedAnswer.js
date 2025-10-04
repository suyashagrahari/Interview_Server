const Interview = require("../../models/Interview");
const logger = require("../../utils/logger");

/**
 * @route   GET /api/interview/:id/questions/:questionId/hint
 * @desc    Get expected answer (hint) for a specific question
 * @access  Private
 */
const getExpectedAnswer = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;
    const userId = req.user._id || req.user.id;

    logger.info(
      `Fetching expected answer for interview ${interviewId}, question ${questionId}, user ${userId}`
    );

    // Find the interview by ID only (no candidateId check for hint access)
    const interview = await Interview.findById(interviewId);

    if (!interview) {
      logger.error(`Interview not found: ${interviewId}`);
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Verify user has access to this interview
    if (interview.candidateId.toString() !== userId.toString()) {
      logger.warn(`User ${userId} tried to access interview ${interviewId} owned by ${interview.candidateId}`);
      return res.status(403).json({
        success: false,
        message: "Access denied to this interview",
      });
    }

    // Find the question
    const question = interview.questions.find(
      (q) => q.questionId === questionId
    );

    if (!question) {
      logger.error(`Question not found: ${questionId} in interview ${interviewId}`);
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Security: Only allow hints for the CURRENT/LAST question
    // The current question is the last one in the questions array
    const lastQuestion = interview.questions[interview.questions.length - 1];

    if (!lastQuestion || lastQuestion.questionId !== questionId) {
      logger.warn(`User ${userId} attempted to get hint for non-current question ${questionId}. Current question: ${lastQuestion?.questionId}`);
      return res.status(403).json({
        success: false,
        message: "Hint only available for the current question",
      });
    }

    logger.info(`Hint requested for current question ${questionId} by user ${userId}`);

    // Mark that the user viewed the answer for this question
    question.answerViewed = true;
    question.answerViewedAt = new Date();
    await interview.save();

    logger.info(`Marked question ${questionId} as answerViewed for user ${userId}`);

    // Return the expected answer
    return res.status(200).json({
      success: true,
      data: {
        questionId: question.questionId,
        question: question.question,
        expectedAnswer: question.expectedAnswer || "No hint available for this question.",
        difficulty: question.difficulty,
      },
    });
  } catch (error) {
    logger.error("Error fetching expected answer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = getExpectedAnswer;
