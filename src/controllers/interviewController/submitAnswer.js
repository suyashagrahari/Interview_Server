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

// Import sentiment analysis service
const sentimentAnalysisService = require("../../services/sentimentAnalysisService");

/**
 * Submit answer and get analysis + next question with sentiment analysis and warning system
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

    // Check if interview is already terminated
    if (interview.isTerminated) {
      return sendSuccessResponse(res, 200, "Interview already terminated", {
        questionId: req.params.questionId,
        answer,
        analysis: null,
        nextQuestion: null,
        questionNumber: questionNumber,
        isInterviewComplete: true,
        totalQuestionsAsked: interview.questions.length,
        warningIssued: false,
        warningCount: interview.warningCount,
        interviewTerminated: true,
        canContinue: false,
        lastWarningAt: interview.lastWarningAt,
        questionSentiment: "NEUTRAL",
      });
    }

    // Find the question
    const question = interview.questions.find(
      (q) => q.questionId === req.params.questionId
    );
    if (!question) {
      return sendNotFoundError(res, "Question not found");
    }

    // Perform sentiment analysis on the answer
    logger.info(
      `[SubmitAnswer] Analyzing sentiment for answer: "${answer.substring(
        0,
        100
      )}..."`
    );
    const sentimentResult = await sentimentAnalysisService.analyzeSentiment(
      answer
    );

    const currentSentiment = sentimentResult.success
      ? sentimentResult.sentiment
      : "NEUTRAL";
    logger.info(
      `[SubmitAnswer] Sentiment analysis result: ${currentSentiment}`
    );

    // Update answer with sentiment
    await interview.updateAnswer(
      req.params.questionId,
      answer,
      timeSpent,
      currentSentiment
    );

    // Update the question's sentiment in the interview
    const questionToUpdate = interview.questions.find(
      (q) => q.questionId === req.params.questionId
    );
    if (questionToUpdate) {
      questionToUpdate.sentiment = currentSentiment;
      questionToUpdate.sentimentAnalyzedAt = new Date();
    }

    // Handle warning system for negative sentiment
    let warningIssued = false;
    let interviewTerminated = false;
    let canContinue = true;

    if (currentSentiment === "NEGATIVE") {
      logger.warn(
        `[SubmitAnswer] Negative sentiment detected, current warning count: ${interview.warningCount}`
      );

      if (interview.warningCount === 0) {
        // First warning
        interview.warningCount = 1;
        interview.lastWarningAt = new Date();
        warningIssued = true;
        logger.warn(
          `[SubmitAnswer] First warning issued for negative sentiment`
        );
      } else if (interview.warningCount === 1) {
        // Second warning - terminate interview
        interview.warningCount = 2;
        interview.lastWarningAt = new Date();
        interview.isTerminated = true;
        interview.terminationReason =
          "Professional conduct violation - multiple inappropriate responses";
        interviewTerminated = true;
        canContinue = false;
        warningIssued = true;
        logger.error(
          `[SubmitAnswer] Interview terminated due to second negative sentiment`
        );
      }
    }

    // Save interview with updated warning data
    await interview.save();

    // Mark question as completed in question pool
    await QuestionManagementService.markQuestionCompleted(
      req.params.id,
      req.user.id,
      req.params.questionId
    );

    // Process answer analysis
    const analysisResult = await AnalysisService.analyzeAnswer(
      interview,
      question,
      answer,
      {
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
      }
    );

    // Update answer analysis if successful
    if (analysisResult.success) {
      await interview.updateAnswerAnalysis(
        req.params.questionId,
        analysisResult.analysis
      );
    }

    // Determine next question based on current question type and pattern
    let nextQuestion = null;
    const lastAskedQuestion = interview.questions.find(
      (q) => q.questionId === req.params.questionId
    );

    // Check if we should generate next question (max 18 questions total) and interview not terminated
    if (interview.questions.length < 18 && !interview.isTerminated) {
      if (lastAskedQuestion.questionType === "pool") {
        // Last question was from pool, generate follow-up question
        nextQuestion = await AnalysisService.generateFollowUpQuestion(
          interview,
          lastAskedQuestion,
          answer,
          interview.questions.length,
          currentSentiment // Pass sentiment to follow-up generation
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
      } else if (lastAskedQuestion.questionType === "followup") {
        // Last question was follow-up, get next question from pool
        const poolQuestionIndex = Math.floor(
          (interview.questions.length + 1) / 2
        );

        // Get question pool
        const QuestionPool = require("../../models/QuestionPool");
        const questionPool = await QuestionPool.findOne({
          interviewId: interview._id,
          userId: interview.candidateId,
        });

        if (questionPool && questionPool.questions[poolQuestionIndex]) {
          const poolQuestion = questionPool.questions[poolQuestionIndex];

          // Personalize the pool question based on previous answer and sentiment
          let personalizedQuestion;
          if (currentSentiment === "NEGATIVE") {
            // Add warning to the question
            personalizedQuestion =
              await AnalysisService.rephraseQuestionWithWarning(
                poolQuestion.question,
                currentSentiment
              );
          } else {
            // Personalize based on previous answer
            personalizedQuestion =
              await AnalysisService.rephraseQuestionWithPersonalization(
                poolQuestion.question,
                answer,
                currentSentiment
              );
          }

          nextQuestion = {
            questionId: poolQuestion.questionId,
            question: personalizedQuestion,
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
      `Answer submitted for interview ${req.params.id}, question ${req.params.questionId}, sentiment: ${currentSentiment}, warning count: ${interview.warningCount}`
    );

    // Check if interview should be completed (18 questions reached and no next question)
    const isInterviewComplete =
      interview.questions.length >= 18 && !nextQuestion;

    return sendSuccessResponse(res, 200, "Answer submitted successfully", {
      questionId: req.params.questionId,
      answer,
      analysis:
        analysisResult.status === "fulfilled"
          ? analysisResult.value.analysis
          : null,
      nextQuestion: nextQuestion,
      questionNumber: questionNumber + 1,
      isInterviewComplete: isInterviewComplete,
      totalQuestionsAsked: interview.questions.length,
      warningIssued: warningIssued,
      warningCount: interview.warningCount,
      interviewTerminated: interviewTerminated,
      canContinue: canContinue,
      lastWarningAt: interview.lastWarningAt,
      questionSentiment: currentSentiment,
      debug: {
        sentimentAnalysis: sentimentResult,
        warningSystem: {
          currentCount: interview.warningCount,
          isTerminated: interview.isTerminated,
          terminationReason: interview.terminationReason,
        },
      },
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
