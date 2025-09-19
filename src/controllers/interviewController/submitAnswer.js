const {
  Interview,
  QuestionManagementService,
  AnalysisService,
  sendAuthRequiredError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Submit answer and get analysis + next question
 */
const submitAnswer = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const {
      answer,
      timeSpent,
      startTime,
      endTime,
      tabSwitches,
      copyPasteCount,
      faceDetection,
      mobileDetection,
      laptopDetection,
      zoomIn,
      zoomOut,
      questionNumber,
    } = req.body;

    // Find the interview
    const interview = await Interview.findOne({
      _id: req.params.id,
      candidateId: req.user.id,
      isActive: true,
    }).populate("resumeId", "resumeText resumeName");

    if (!interview) {
      return sendNotFoundError(res, "Interview not found");
    }

    // Find the question
    const question = interview.questions.find(
      (q) => q.questionId === req.params.questionId
    );
    if (!question) {
      return sendNotFoundError(res, "Question not found");
    }

    // Update answer with proctoring data
    await interview.updateAnswer(req.params.questionId, answer, timeSpent);

    // Mark question as completed in question pool
    await QuestionManagementService.markQuestionCompleted(
      req.params.id,
      req.user.id,
      req.params.questionId
    );

    // Process answer analysis and next question generation in parallel
    const [analysisResult, nextQuestionResult] = await Promise.allSettled([
      AnalysisService.analyzeAnswer(interview, question, answer, {
        timeSpent,
        startTime,
        endTime,
        tabSwitches,
        copyPasteCount,
        faceDetection,
        mobileDetection,
        laptopDetection,
        zoomIn,
        zoomOut,
      }),
      QuestionManagementService.getNextQuestionFromPool(
        interview,
        questionNumber
      ),
    ]);

    // Update answer analysis if successful
    if (analysisResult.status === "fulfilled" && analysisResult.value.success) {
      await interview.updateAnswerAnalysis(
        req.params.questionId,
        analysisResult.value.analysis
      );
    }

    // Add next question if found
    let nextQuestion = null;
    if (
      nextQuestionResult.status === "fulfilled" &&
      nextQuestionResult.value.success &&
      nextQuestionResult.value.question
    ) {
      nextQuestion = nextQuestionResult.value.question;
      await interview.addQuestion({
        questionId: nextQuestion.questionId,
        question: nextQuestion.question,
        category: nextQuestion.category,
        difficulty: nextQuestion.difficulty || "medium",
        expectedAnswer: nextQuestion.expectedAnswer,
      });
    }

    logger.info(
      `Answer submitted for interview ${req.params.id}, question ${req.params.questionId}`
    );

    return sendSuccessResponse(res, 200, "Answer submitted successfully", {
      questionId: req.params.questionId,
      answer,
      analysis:
        analysisResult.status === "fulfilled"
          ? analysisResult.value.analysis
          : null,
      nextQuestion: nextQuestion,
      questionNumber: questionNumber + 1,
    });
  } catch (error) {
    logger.error("Error submitting answer:", error);
    return sendInternalServerError(
      res,
      "Internal server error while submitting answer"
    );
  }
};

module.exports = submitAnswer;

