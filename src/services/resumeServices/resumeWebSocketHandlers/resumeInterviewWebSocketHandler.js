const ResumeInterview = require("../../../models/ResumeInterview");
const ResumeQuestionPool = require("../../../models/ResumeInterviewQuestionPool");

// Use resume-specific services
const ResumeQuestionManagementService = require("../resumeQuestionManagementService");
const UnifiedQuestionManagementService = require("../../unifiedQuestionManagementService");
const ResumeAnalysisService = require("../resumeAnalysisService");

// Shared services
const sentimentAnalysisService = require("../../sentimentAnalysisService");
const ttsService = require("../../ttsService");
const logger = require("../../../utils/logger");
const mongoose = require("mongoose");

/**
 * Resume Interview WebSocket Handler Service
 * Handles all real-time WebSocket operations for resume-based interviews
 * - First question generation
 * - Answer submission and analysis
 * - Follow-up question generation
 * - Sentiment analysis and warning system
 * - Question personalization based on answers
 */
class ResumeInterviewWebSocketHandler {
  constructor(io) {
    this.io = io;
    this.activeConnections = new Map(); // userId -> { socketId, interviewId }
  }

  /**
   * Register user connection for resume interview
   */
  registerConnection(userId, socketId, interviewId) {
    this.activeConnections.set(userId, { socketId, interviewId });
    logger.info(
      `📝 [Resume Interview] User ${userId} connected for interview ${interviewId}`
    );
  }

  /**
   * Unregister user connection
   */
  unregisterConnection(userId) {
    this.activeConnections.delete(userId);
    logger.info(`📝 [Resume Interview] User ${userId} disconnected`);
  }

  /**
   * Get connection info for user
   */
  getConnection(userId) {
    return this.activeConnections.get(userId);
  }

  /**
   * Handle generating first question for resume interview via WebSocket
   */
  async handleGenerateFirstQuestion(socket, { interviewId, userId }) {
    try {
      logger.info(
        `🎯 [Resume Interview] Generating first question for interview ${interviewId}, userId: ${userId}`
      );

      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        logger.info(
          "⚠️ [Resume Interview] Fallback userId detected, fetching actual candidateId from interview"
        );

        // Validate ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(interviewId)) {
          const interview = await ResumeInterview.findById(interviewId);
          if (interview) {
            effectiveUserId = interview.candidateId.toString();
            logger.info(
              `✅ [Resume Interview] Using actual candidateId: ${effectiveUserId}`
            );
          }
        } else {
          logger.error(
            `❌ [Resume Interview] Invalid interview ID format: ${interviewId}`
          );
        }
      }

      // Get first question from unified service
      let result;
      try {
        result = await UnifiedQuestionManagementService.getFirstQuestion(
          interviewId,
          effectiveUserId
        );
      } catch (error) {
        logger.error(
          "❌ [Resume Interview] Error calling getFirstQuestion:",
          error
        );
        socket.emit("question:error", {
          success: false,
          message: "Internal server error while generating first question",
          code: "INTERNAL_ERROR",
          details: {
            error: error.message,
            stack: error.stack,
          },
        });
        return;
      }

      if (!result.success) {
        logger.error("❌ [Resume Interview] getFirstQuestion failed:", result);
        socket.emit("question:error", {
          success: false,
          message: result.message,
          code: "QUESTION_GENERATION_FAILED",
          details: result.error ? { error: result.error } : undefined,
        });
        return;
      }

      // SECURITY: Remove expectedAnswer from response
      // Convert Mongoose subdocument to plain object first
      const questionObj = result.data.question.toObject
        ? result.data.question.toObject()
        : result.data.question;
      const { expectedAnswer, ...questionWithoutAnswer } = questionObj;

      logger.info(
        `🔍 [Resume Interview] Generated question: ${questionWithoutAnswer.questionId}`
      );

      // Validate question text before TTS generation
      if (
        !questionWithoutAnswer.question ||
        typeof questionWithoutAnswer.question !== "string" ||
        questionWithoutAnswer.question.trim() === ""
      ) {
        logger.error(
          "❌ [Resume Interview] Invalid question text for TTS generation:",
          {
            questionWithoutAnswer,
            originalQuestion: result.data.question,
            interviewId,
          }
        );
        socket.emit("question:error", {
          success: false,
          message: "Invalid question text received",
          code: "INVALID_QUESTION_TEXT",
          details: {
            questionId: questionWithoutAnswer.questionId,
            questionType: typeof questionWithoutAnswer.question,
            questionLength: questionWithoutAnswer.question
              ? questionWithoutAnswer.question.length
              : 0,
          },
        });
        return;
      }

      // Generate TTS audio for the question
      let audioData = null;
      try {
        const audioResult = await ttsService.generateSpeechStream(
          questionWithoutAnswer.question,
          null, // Let the service generate the filename
          effectiveUserId, // Pass userId for cleanup
          result.data.question.questionId // Pass questionId
        );

        if (audioResult.success) {
          audioData = {
            audioBase64: audioResult.audioBase64,
            url: audioResult.url,
            fileName: audioResult.fileName,
            mimeType: "audio/mpeg",
          };
          logger.info(
            `✅ [Resume Interview] TTS audio generated: ${
              audioResult.fileName
            }, base64 length: ${audioResult.audioBase64?.length || 0}`
          );
        } else {
          logger.warn(
            `⚠️ [Resume Interview] TTS generation failed: ${audioResult.message}`
          );
        }
      } catch (audioError) {
        logger.error(
          "[Resume Interview] Error generating TTS audio:",
          audioError
        );
      }

      // Emit question to client (without expectedAnswer) with audio
      socket.emit("question:first", {
        success: true,
        message: "First question generated successfully",
        data: {
          question: questionWithoutAnswer,
          interviewId: result.data.interviewId,
          questionNumber: result.data.questionNumber,
          audio: audioData,
        },
      });

      logger.info(
        `✅ [Resume Interview] First question emitted to user ${userId} (question ID: ${
          result.data.question.questionId
        }) with ${audioData ? "audio" : "no audio"}`
      );
    } catch (error) {
      logger.error(
        "[Resume Interview] Error generating first question:",
        error
      );
      socket.emit("question:error", {
        success: false,
        message: "Internal server error while generating first question",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Handle answer submission for resume interview via WebSocket
   */
  async handleSubmitAnswer(
    socket,
    { interviewId, questionId, userId, answer, proctoringData }
  ) {
    try {
      logger.info(
        `📤 [Resume Interview] Processing answer submission for interview ${interviewId}, question ${questionId}, userId: ${userId}`
      );

      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        logger.info(
          "⚠️ [Resume Interview] Fallback userId detected, fetching actual candidateId from interview"
        );

        // Validate ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(interviewId)) {
          const tempInterview = await ResumeInterview.findById(interviewId);
          if (tempInterview) {
            effectiveUserId = tempInterview.candidateId.toString();
            logger.info(
              `✅ [Resume Interview] Using actual candidateId: ${effectiveUserId}`
            );
          }
        } else {
          logger.error(
            `❌ [Resume Interview] Invalid interview ID format: ${interviewId}`
          );
        }
      }

      const {
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
      } = proctoringData;

      // Emit analyzing status
      socket.emit("answer:analyzing", {
        questionId,
        message: "Analyzing your answer...",
      });

      // Find the interview
      const interview = await ResumeInterview.findOne({
        _id: interviewId,
        candidateId: effectiveUserId,
        isActive: true,
      }).populate("resumeId", "resumeText resumeName");

      if (!interview) {
        socket.emit("answer:error", {
          success: false,
          message: "Interview not found",
          code: "INTERVIEW_NOT_FOUND",
        });
        return;
      }

      // Check if interview is already terminated
      if (interview.isTerminated) {
        socket.emit("interview:terminated", {
          success: true,
          message:
            "Interview was terminated due to professional conduct violations",
          data: {
            questionId,
            questionNumber,
            warningCount: interview.warningCount,
            interviewTerminated: true,
            canContinue: false,
            lastWarningAt: interview.lastWarningAt,
            terminationReason: interview.terminationReason,
          },
        });
        return;
      }

      // Find the question
      const question = interview.questions.find(
        (q) => q.questionId === questionId
      );

      if (!question) {
        socket.emit("answer:error", {
          success: false,
          message: "Question not found",
          code: "QUESTION_NOT_FOUND",
        });
        return;
      }

      // Perform sentiment analysis on the answer
      logger.info(
        `[Resume Interview - SubmitAnswer] Analyzing sentiment for answer: "${answer.substring(
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
        `[Resume Interview - SubmitAnswer] Sentiment analysis result: ${currentSentiment}`
      );

      // Update answer using unified service
      const updateResult = await UnifiedQuestionManagementService.submitAnswer(
        interviewId,
        questionId,
        effectiveUserId,
        answer,
        proctoringData
      );

      if (!updateResult.success) {
        socket.emit("answer:error", {
          success: false,
          message: updateResult.message,
          code: "ANSWER_UPDATE_FAILED",
        });
        return;
      }

      // Update the question's sentiment in the interview
      const questionToUpdate = interview.questions.find(
        (q) => q.questionId === questionId
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
          `[Resume Interview - SubmitAnswer] Negative sentiment detected, current warning count: ${interview.warningCount}`
        );

        if (interview.warningCount === 0) {
          // First warning
          interview.warningCount = 1;
          interview.lastWarningAt = new Date();
          warningIssued = true;
          logger.warn(
            `[Resume Interview - SubmitAnswer] First warning issued for negative sentiment`
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
            `[Resume Interview - SubmitAnswer] Interview terminated due to second negative sentiment`
          );
        }
      }

      // Save interview with updated warning data
      await interview.save();

      // Mark question as completed in question pool
      await ResumeQuestionManagementService.markQuestionCompleted(
        interviewId,
        effectiveUserId,
        questionId
      );

      // Process answer analysis in background (don't wait)
      const analysisPromise = ResumeAnalysisService.analyzeAnswer(
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

      // Emit answer submitted confirmation (NO analysis sent to client)
      socket.emit("answer:submitted", {
        success: true,
        message: "Answer submitted successfully",
        data: {
          questionId,
          questionNumber,
          totalQuestionsAsked: interview.questions.length,
          warningIssued,
          warningCount: interview.warningCount,
          interviewTerminated,
          canContinue,
          lastWarningAt: interview.lastWarningAt,
          questionSentiment: currentSentiment,
        },
      });

      // If warning issued, emit warning event
      if (warningIssued) {
        socket.emit("interview:warning", {
          success: true,
          message: interviewTerminated
            ? "Interview terminated due to professional conduct violations"
            : "Warning issued for inappropriate content",
          data: {
            warningCount: interview.warningCount,
            isTerminated: interviewTerminated,
            canContinue,
            lastWarningAt: interview.lastWarningAt,
            sentiment: currentSentiment,
          },
        });
      }

      // Wait for analysis to complete before proceeding
      try {
        const analysisResult = await analysisPromise;
        if (analysisResult.success) {
          await interview.updateAnswerAnalysis(
            questionId,
            analysisResult.analysis
          );
          logger.info(
            `✅ [Resume Interview] Analysis completed for question ${questionId}`
          );
        }
      } catch (error) {
        logger.error("[Resume Interview] Error processing analysis:", error);
      }

      // If interview terminated, end the interview properly
      if (interviewTerminated) {
        logger.info(
          `[Resume Interview] Ending terminated interview ${interviewId}`
        );

        // Mark interview as completed
        interview.status = "completed";
        interview.completedAt = new Date();
        if (interview.startedAt) {
          interview.totalDuration = Math.round(
            (interview.completedAt - interview.startedAt) / 1000 / 60
          );
        }

        // Calculate overall analysis
        await interview.calculateOverallAnalysis();

        // Save the interview
        await interview.save();

        logger.info(
          `[Resume Interview] Interview ${interviewId} completed due to termination`
        );

        // Clear user's active interview state
        try {
          const InterviewStateService = require("../../interviewStateService");
          await InterviewStateService.markInterviewCompleted(
            effectiveUserId,
            interviewId
          );
          logger.info(
            `[Resume Interview] User interview state cleared for user ${effectiveUserId}, interview ${interviewId}`
          );
        } catch (stateError) {
          logger.error(
            "[Resume Interview] Error clearing user interview state:",
            stateError
          );
        }

        socket.emit("interview:complete", {
          success: true,
          message:
            "Interview terminated due to professional conduct violations",
          data: {
            interviewId: interview._id,
            status: interview.status,
            totalQuestionsAsked: interview.questions.length,
            isInterviewComplete: true,
            reason: "terminated",
            terminationReason: interview.terminationReason,
            completedAt: interview.completedAt,
            totalDuration: interview.totalDuration,
            overallAnalysis: interview.overallAnalysis,
          },
        });
        return;
      }

      // Determine and generate next question (after analysis is saved)
      await this.generateNextQuestion(
        socket,
        interview,
        question,
        answer,
        effectiveUserId, // Use the actual userId, not the fallback
        questionNumber,
        currentSentiment
      );
    } catch (error) {
      logger.error("[Resume Interview] Error submitting answer:", error);
      socket.emit("answer:error", {
        success: false,
        message: "Internal server error while submitting answer",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Generate next question based on current question type and sentiment
   */
  async generateNextQuestion(
    socket,
    interview,
    currentQuestion,
    answer,
    userId,
    currentQuestionNumber,
    currentSentiment
  ) {
    try {
      let nextQuestion = null;

      // Check if we should generate next question (max 18 questions total)
      if (interview.questions.length >= 18) {
        socket.emit("interview:complete", {
          success: true,
          message: "Interview completed - maximum questions reached",
          data: {
            totalQuestionsAsked: interview.questions.length,
            isInterviewComplete: true,
          },
        });
        return;
      }

      socket.emit("question:generating", {
        message: "Generating next question...",
      });

      if (currentQuestion.questionType === "pool") {
        // Current question is from pool, generate follow-up question
        logger.info("🔄 [Resume Interview] Generating follow-up question...");

        nextQuestion = await ResumeAnalysisService.generateFollowUpQuestion(
          interview,
          currentQuestion,
          answer,
          interview.questions.length,
          currentSentiment
        );

        if (nextQuestion) {
          try {
            await interview.addQuestion({
              questionId: nextQuestion.questionId,
              question: nextQuestion.question,
              category: nextQuestion.category,
              difficulty: nextQuestion.difficulty || "medium",
              expectedAnswer: nextQuestion.expectedAnswer,
              questionType: "followup",
            });
          } catch (addQuestionError) {
            logger.error(
              "[Resume Interview] Error adding follow-up question to interview:",
              addQuestionError
            );
            throw addQuestionError;
          }
        }
      } else if (currentQuestion.questionType === "followup") {
        // Current question is follow-up, get next question from pool
        logger.info("🔄 [Resume Interview] Getting next question from pool...");

        const poolQuestionIndex = Math.floor(
          (interview.questions.length + 1) / 2
        );

        const questionPool = await ResumeQuestionPool.findOne({
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
              await ResumeAnalysisService.rephraseQuestionWithWarning(
                poolQuestion.question,
                currentSentiment
              );
          } else {
            // Personalize based on previous answer
            personalizedQuestion =
              await ResumeAnalysisService.rephraseQuestionWithPersonalization(
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

          try {
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
          } catch (addQuestionError) {
            logger.error(
              "[Resume Interview] Error adding pool question to interview:",
              addQuestionError
            );
            throw addQuestionError;
          }
        }
      }

      if (nextQuestion) {
        // Validate nextQuestion before processing
        if (
          !nextQuestion.question ||
          typeof nextQuestion.question !== "string"
        ) {
          logger.error(
            "[Resume Interview] Invalid nextQuestion data:",
            nextQuestion
          );
          socket.emit("question:error", {
            success: false,
            message: "Invalid question data received",
            code: "INVALID_QUESTION_DATA",
          });
          return;
        }

        // SECURITY: Remove expectedAnswer from response
        const { expectedAnswer, ...questionWithoutAnswer } = nextQuestion;

        // Generate TTS audio for the next question
        let audioData = null;
        try {
          const audioResult = await ttsService.generateSpeechStream(
            questionWithoutAnswer.question,
            null, // Let the service generate the filename
            userId, // Pass userId for cleanup (this is the actual userId passed to this function)
            nextQuestion.questionId // Pass questionId
          );

          if (audioResult && audioResult.success) {
            audioData = {
              audioBase64: audioResult.audioBase64,
              url: audioResult.url,
              fileName: audioResult.fileName,
              mimeType: "audio/mpeg",
            };
            logger.info(
              `✅ [Resume Interview] TTS audio generated for next question: ${
                audioResult.fileName
              }, base64 length: ${audioResult.audioBase64?.length || 0}`
            );
          } else {
            logger.warn(
              `⚠️ [Resume Interview] TTS generation failed for next question: ${
                audioResult?.message || "Unknown error"
              }`
            );
          }
        } catch (audioError) {
          logger.error(
            "[Resume Interview] Error generating TTS audio for next question:",
            audioError
          );
          // Don't throw - continue without audio
        }

        // Emit next question to client (without expectedAnswer) with audio
        socket.emit("question:next", {
          success: true,
          message: "Next question generated successfully",
          data: {
            question: questionWithoutAnswer,
            questionNumber: currentQuestionNumber + 1,
            totalQuestionsAsked: interview.questions.length,
            isInterviewComplete: false,
            audio: audioData,
          },
        });

        logger.info(
          `✅ [Resume Interview] Next question emitted (question ID: ${
            nextQuestion.questionId
          }) with ${audioData ? "audio" : "no audio"}`
        );
      } else {
        // No more questions, interview complete
        socket.emit("interview:complete", {
          success: true,
          message: "Interview completed",
          data: {
            totalQuestionsAsked: interview.questions.length,
            isInterviewComplete: true,
          },
        });
      }
    } catch (error) {
      logger.error("[Resume Interview] Error generating next question:", error);
      socket.emit("question:error", {
        success: false,
        message: "Error generating next question",
        code: "NEXT_QUESTION_ERROR",
      });
    }
  }

  /**
   * Handle resume interview reconnection (page reload, etc.)
   */
  async handleReconnection(socket, { interviewId, userId }) {
    try {
      logger.info(
        `🔄 [Resume Interview] Handling reconnection for user ${userId}`
      );

      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        logger.info(
          "⚠️ [Resume Interview] Fallback userId detected, fetching actual candidateId from interview"
        );

        // Validate ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(interviewId)) {
          const tempInterview = await ResumeInterview.findById(interviewId);
          if (tempInterview) {
            effectiveUserId = tempInterview.candidateId.toString();
            logger.info(
              `✅ [Resume Interview] Using actual candidateId: ${effectiveUserId}`
            );
          }
        } else {
          logger.error(
            `❌ [Resume Interview] Invalid interview ID format: ${interviewId}`
          );
        }
      }

      const interview = await ResumeInterview.findOne({
        _id: interviewId,
        candidateId: effectiveUserId,
        isActive: true,
      });

      if (!interview) {
        socket.emit("reconnection:error", {
          success: false,
          message: "Interview not found or no longer active",
        });
        return;
      }

      // Get current question (last unanswered question)
      const currentQuestion = interview.questions
        .filter((q) => !q.isAnswered)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];

      if (!currentQuestion) {
        socket.emit("reconnection:error", {
          success: false,
          message: "No active question found",
        });
        return;
      }

      // SECURITY: Remove expectedAnswer
      const { expectedAnswer, ...questionWithoutAnswer } =
        currentQuestion.toObject();

      // Build chat history (questions and answers) - NO expectedAnswer or analysis
      const chatHistory = interview.questions
        .filter(
          (q) => q.isAnswered || q.questionId === currentQuestion.questionId
        )
        .map((q) => ({
          questionId: q.questionId,
          question: q.question,
          answer: q.answer || null,
          isAnswered: q.isAnswered,
          questionNumber: interview.questions.indexOf(q) + 1,
          // NO expectedAnswer or analysis sent
        }));

      socket.emit("reconnection:success", {
        success: true,
        message: "Interview state restored",
        data: {
          interviewId: interview._id,
          currentQuestion: questionWithoutAnswer,
          questionNumber: interview.questions.length,
          totalQuestionsAsked: interview.questions.length,
          chatHistory,
          timeRemaining: interview.timeRemaining,
          warningCount: interview.warningCount,
          isTerminated: interview.isTerminated,
          proctoringData: interview.proctoringData || {
            tabSwitches: 0,
            copyPasteCount: 0,
            faceDetectionIssues: 0,
            multiplePersonDetections: 0,
            phoneDetections: 0,
          },
        },
      });

      logger.info(
        `✅ [Resume Interview] Reconnection successful for user ${userId}`
      );
    } catch (error) {
      logger.error("[Resume Interview] Error handling reconnection:", error);
      socket.emit("reconnection:error", {
        success: false,
        message: "Error restoring interview state",
      });
    }
  }
}

module.exports = ResumeInterviewWebSocketHandler;
