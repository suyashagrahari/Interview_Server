const {
  QuestionManagementService,
  validateQuestionAddition,
  sendAuthRequiredError,
  sendValidationError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Add question to interview
 */
const addQuestion = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const validation = validateQuestionAddition(req.body);
    if (!validation.isValid) {
      return sendValidationError(res, validation.errors);
    }

    const { questionId, question, category, difficulty, expectedAnswer } =
      req.body;
    const questionData = {
      questionId,
      question,
      category,
      difficulty: difficulty || "medium",
      expectedAnswer: expectedAnswer || "",
    };

    const result = await QuestionManagementService.addQuestionToInterview(
      req.params.id,
      req.user.id,
      questionData
    );

    if (!result.success) {
      return sendNotFoundError(res, result.message);
    }

    return sendSuccessResponse(
      res,
      200,
      "Question added successfully",
      result.data
    );
  } catch (error) {
    logger.error("Error adding question:", error);
    return sendInternalServerError(
      res,
      "Internal server error while adding question"
    );
  }
};

module.exports = addQuestion;

