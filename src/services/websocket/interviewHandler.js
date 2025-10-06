const Interview = require("../../models/Interview");
const QuestionPool = require("../../models/QuestionPool");
const QuestionManagementService = require("../questionManagementService");
const AnalysisService = require("../analysisService");
const sentimentAnalysisService = require("../sentimentAnalysisService");
const ttsService = require("../ttsService");
const logger = require("../../utils/logger");

/**
 * WebSocket Interview Handler Service
 * Handles real-time interview question generation and answer submission
 * SECURITY: Never sends expectedAnswer or full analysis to client
 */
class InterviewHandlerService {
  constructor(io) {
    this.io = io;
    this.activeConnections = new Map(); // userId -> { socketId, interviewId }
  }

  /**
   * Register user connection for interview
   */
  registerConnection(userId, socketId, interviewId) {
    this.activeConnections.set(userId, { socketId, interviewId });
    logger.info(`📝 User ${userId} connected for interview ${interviewId}`);
  }

  /**
   * Unregister user connection
   */
  unregisterConnection(userId) {
    this.activeConnections.delete(userId);
    logger.info(`📝 User ${userId} disconnected`);
  }

  /**
   * Get connection info for user
   */
  getConnection(userId) {
    return this.activeConnections.get(userId);
  }

  /**
   * Handle generating first question via WebSocket
   */
  async handleGenerateFirstQuestion(socket, { interviewId, userId }) {
    try {
      logger.info(`🎯 Generating first question for interview ${interviewId}, userId: ${userId}`);

      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith('interview-')) {
        logger.info('⚠️ Fallback userId detected, fetching actual candidateId from interview');
        const interview = await Interview.findById(interviewId);
        if (interview) {
          effectiveUserId = interview.candidateId.toString();
          logger.info(`✅ Using actual candidateId: ${effectiveUserId}`);
        }
      }

      // Get first question from service
      const result = await QuestionManagementService.getFirstQuestion(
        interviewId,
        effectiveUserId
      );

      if (!result.success) {
        socket.emit("question:error", {
          success: false,
          message: result.message,
          code: "QUESTION_GENERATION_FAILED",
        });
        return;
      }

      // SECURITY: Remove expectedAnswer from response
      const { expectedAnswer, ...questionWithoutAnswer } = result.data.question;

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
          logger.info(`✅ TTS audio generated: ${audioResult.fileName}, base64 length: ${audioResult.audioBase64?.length || 0}`);
        } else {
          logger.warn(`⚠️ TTS generation failed: ${audioResult.message}`);
        }
      } catch (audioError) {
        logger.error("Error generating TTS audio:", audioError);
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
        `✅ First question emitted to user ${userId} (question ID: ${result.data.question.questionId}) with ${audioData ? 'audio' : 'no audio'}`
      );
    } catch (error) {
      logger.error("Error generating first question:", error);
      socket.emit("question:error", {
        success: false,
        message: "Internal server error while generating first question",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Handle answer submission via WebSocket
   */
  async handleSubmitAnswer(socket, {
    interviewId,
    questionId,
    userId,
    answer,
    proctoringData,
  }) {
    try {
      logger.info(
        `📤 Processing answer submission for interview ${interviewId}, question ${questionId}, userId: ${userId}`
      );

      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith('interview-')) {
        logger.info('⚠️ Fallback userId detected, fetching actual candidateId from interview');
        const tempInterview = await Interview.findById(interviewId);
        if (tempInterview) {
          effectiveUserId = tempInterview.candidateId.toString();
          logger.info(`✅ Using actual candidateId: ${effectiveUserId}`);
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
      const interview = await Interview.findOne({
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
          message: "Interview was terminated due to professional conduct violations",
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
        questionId,
        answer,
        timeSpent,
        currentSentiment
      );

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
        interviewId,
        effectiveUserId,
        questionId
      );

      // Process answer analysis in background (don't wait)
      const analysisPromise = AnalysisService.analyzeAnswer(
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
          logger.info(`✅ Analysis completed for question ${questionId}`);
        }
      } catch (error) {
        logger.error("Error processing analysis:", error);
      }

      // If interview terminated, don't generate next question
      if (interviewTerminated) {
        socket.emit("interview:complete", {
          success: true,
          message: "Interview terminated",
          data: {
            totalQuestionsAsked: interview.questions.length,
            isInterviewComplete: true,
            reason: "terminated",
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
      logger.error("Error submitting answer:", error);
      socket.emit("answer:error", {
        success: false,
        message: "Internal server error while submitting answer",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Generate next question based on current question type
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
        logger.info("🔄 Generating follow-up question...");

        nextQuestion = await AnalysisService.generateFollowUpQuestion(
          interview,
          currentQuestion,
          answer,
          interview.questions.length,
          currentSentiment
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
        logger.info("🔄 Getting next question from pool...");

        const poolQuestionIndex = Math.floor(
          (interview.questions.length + 1) / 2
        );

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

      if (nextQuestion) {
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

          if (audioResult.success) {
            audioData = {
              audioBase64: audioResult.audioBase64,
              url: audioResult.url,
              fileName: audioResult.fileName,
              mimeType: "audio/mpeg",
            };
            logger.info(`✅ TTS audio generated for next question: ${audioResult.fileName}, base64 length: ${audioResult.audioBase64?.length || 0}`);
          } else {
            logger.warn(`⚠️ TTS generation failed for next question: ${audioResult.message}`);
          }
        } catch (audioError) {
          logger.error("Error generating TTS audio for next question:", audioError);
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
          `✅ Next question emitted (question ID: ${nextQuestion.questionId}) with ${audioData ? 'audio' : 'no audio'}`
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
      logger.error("Error generating next question:", error);
      socket.emit("question:error", {
        success: false,
        message: "Error generating next question",
        code: "NEXT_QUESTION_ERROR",
      });
    }
  }

  /**
   * Handle interview reconnection (page reload, etc.)
   */
  async handleReconnection(socket, { interviewId, userId }) {
    try {
      logger.info(`🔄 Handling reconnection for user ${userId}`);

      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith('interview-')) {
        logger.info('⚠️ Fallback userId detected, fetching actual candidateId from interview');
        const tempInterview = await Interview.findById(interviewId);
        if (tempInterview) {
          effectiveUserId = tempInterview.candidateId.toString();
          logger.info(`✅ Using actual candidateId: ${effectiveUserId}`);
        }
      }

      const interview = await Interview.findOne({
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

      logger.info(`✅ Reconnection successful for user ${userId}`);
    } catch (error) {
      logger.error("Error handling reconnection:", error);
      socket.emit("reconnection:error", {
        success: false,
        message: "Error restoring interview state",
      });
    }
  }

  /**
   * Handle proctoring data updates (tab switches, copy/paste, etc.)
   */
  async handleProctoringUpdate(socket, { interviewId, userId, proctoringData }) {
    try {
      logger.info(`🔍 Updating proctoring data for interview ${interviewId}`);

      // If userId is a fallback, fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith('interview-')) {
        const tempInterview = await Interview.findById(interviewId);
        if (tempInterview) {
          effectiveUserId = tempInterview.candidateId.toString();
        }
      }

      const interview = await Interview.findOne({
        _id: interviewId,
        candidateId: effectiveUserId,
        isActive: true,
      });

      if (!interview) {
        socket.emit("proctoring:error", {
          success: false,
          message: "Interview not found",
        });
        return;
      }

      // Update proctoring data in database
      await interview.updateProctoringData(proctoringData);

      logger.info(`✅ Proctoring data updated for interview ${interviewId}:`, proctoringData);

      // Acknowledge update
      socket.emit("proctoring:updated", {
        success: true,
        message: "Proctoring data updated successfully",
        data: {
          proctoringData: interview.proctoringData,
        },
      });
    } catch (error) {
      logger.error("Error updating proctoring data:", error);
      socket.emit("proctoring:error", {
        success: false,
        message: "Error updating proctoring data",
      });
    }
  }

  /**
   * Get current proctoring data for an interview
   */
  async handleGetProctoringData(socket, { interviewId, userId }) {
    try {
      logger.info(`📊 Fetching proctoring data for interview ${interviewId}`);

      // If userId is a fallback, fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith('interview-')) {
        const tempInterview = await Interview.findById(interviewId);
        if (tempInterview) {
          effectiveUserId = tempInterview.candidateId.toString();
        }
      }

      const interview = await Interview.findOne({
        _id: interviewId,
        candidateId: effectiveUserId,
        isActive: true,
      });

      if (!interview) {
        socket.emit("proctoring:error", {
          success: false,
          message: "Interview not found",
        });
        return;
      }

      const proctoringData = interview.proctoringData || {
        tabSwitches: 0,
        copyPasteCount: 0,
        faceDetectionIssues: 0,
        multiplePersonDetections: 0,
        phoneDetections: 0,
      };

      logger.info(`✅ Proctoring data retrieved:`, proctoringData);

      socket.emit("proctoring:data", {
        success: true,
        data: {
          proctoringData,
          warningCount: interview.warningCount,
        },
      });
    } catch (error) {
      logger.error("Error fetching proctoring data:", error);
      socket.emit("proctoring:error", {
        success: false,
        message: "Error fetching proctoring data",
      });
    }
  }
}

module.exports = InterviewHandlerService;
