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

    // Process answer analysis
    const analysisResult = await AnalysisService.analyzeAnswer(interview, question, answer, {
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
    });

    // Update answer analysis if successful
    if (analysisResult.success) {
      await interview.updateAnswerAnalysis(
        req.params.questionId,
        analysisResult.analysis
      );
    }

    // Determine next question based on current question type and pattern
    let nextQuestion = null;
    const currentQuestion = interview.questions.find(
      (q) => q.questionId === req.params.questionId
    );

    // Check if we should generate next question (max 18 questions total)
    if (interview.questions.length < 18) {
      if (currentQuestion.questionType === "pool") {
        // Current question is from pool, generate follow-up question
        nextQuestion = await AnalysisService.generateFollowUpQuestion(
          interview,
          currentQuestion,
          answer,
          interview.questions.length
        );

        if (nextQuestion) {
          await interview.addQuestion({
            questionId: nextQuestion.questionId,
            question: nextQuestion.question,
            category: nextQuestion.category,
            difficulty: nextQuestion.difficulty || "medium",
            expectedAnswer: nextQuestion.expectedAnswer,
            questionType: "followup",
          });
        }
      } else if (currentQuestion.questionType === "followup") {
        // Current question is follow-up, get next question from pool
        // Calculate correct pool question index: after introduction (0), next pool questions are at 1, 2, 3...
        const poolQuestionIndex = Math.floor((interview.questions.length + 1) / 2);

        // Get question pool
        const QuestionPool = require("../../models/QuestionPool");
        const questionPool = await QuestionPool.findOne({
          interviewId: interview._id,
          userId: interview.candidateId,
        });

        if (questionPool && questionPool.questions[poolQuestionIndex]) {
          const poolQuestion = questionPool.questions[poolQuestionIndex];
          nextQuestion = {
            questionId: poolQuestion.questionId,
            question: poolQuestion.question,
            category: poolQuestion.category,
            difficulty: poolQuestion.difficulty || "medium",
            expectedAnswer: poolQuestion.expectedAnswer,
          };

          await interview.addQuestion({
            questionId: nextQuestion.questionId,
            question: nextQuestion.question,
            category: nextQuestion.category,
            difficulty: nextQuestion.difficulty,
            expectedAnswer: nextQuestion.expectedAnswer,
            questionType: "pool",
          });

          // Mark question as asked in question pool
          await questionPool.markQuestionAsked(poolQuestion.questionId);
        }
      }
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

