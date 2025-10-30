const TopicInterview = require("../../../models/TopicInterview");
const TopicQuestionModelFactory = require("../../../models/TopicQuestion");
const TopicQuestionsAsked = require("../../../models/TopicQuestionsAsked");

// Services
const TopicAnalysisService = require("../topicAnalysisService");
const sentimentAnalysisService = require("../../sentimentAnalysisService");
const ttsService = require("../../ttsService");
const logger = require("../../../utils/logger");
const mongoose = require("mongoose");

// Re-use resume analysis service for follow-ups and rephrasing
const ResumeAnalysisService = require("../../resumeServices/resumeAnalysisService");

/**
 * Topic Interview WebSocket Handler Service
 * Handles all real-time WebSocket operations for topic-based interviews
 * - Introduction question generation from resume/JD
 * - Follow-up question generation
 * - Pool question retrieval with intelligent selection
 * - Answer submission and analysis
 * - Sentiment analysis and warning system
 * - Question personalization based on answers
 */
class TopicInterviewWebSocketHandler {
  constructor(io) {
    this.io = io;
    this.activeConnections = new Map(); // userId -> { socketId, interviewId }
  }

  /**
   * Register user connection for topic interview
   */
  registerConnection(userId, socketId, interviewId) {
    this.activeConnections.set(userId, { socketId, interviewId });
    logger.info(
      `📚 [Topic Interview] User ${userId} connected for interview ${interviewId}`
    );
  }

  /**
   * Unregister user connection
   */
  unregisterConnection(userId) {
    this.activeConnections.delete(userId);
    logger.info(`📚 [Topic Interview] User ${userId} disconnected`);
  }

  /**
   * Get connection info for user
   */
  getConnection(userId) {
    return this.activeConnections.get(userId);
  }

  /**
   * Handle generating first question (introduction question) for topic interview
   */
  async handleGenerateFirstQuestion(socket, { interviewId, userId }) {
    try {
      logger.info(
        `🎯 [Topic Interview] Generating first question (introduction) for interview ${interviewId}, userId: ${userId}`
      );

      // Fetch interview with populated data
      const interview = await TopicInterview.findById(interviewId)
        .populate("resumeId", "resumeText resumeName")
        .populate("jobDescriptionId", "description title")
        .populate("candidateId", "firstName lastName");

      if (!interview) {
        socket.emit("question:error", {
          success: false,
          message: "Interview not found",
          code: "INTERVIEW_NOT_FOUND",
        });
        return;
      }

      const candidateName =
        interview.candidateId?.firstName ||
        interview.candidateId?.lastName ||
        "Candidate";

      // Check if introduction question already asked
      if (interview.introductionAsked && interview.questions.length > 0) {
        logger.info(
          `✅ [Topic Interview] Introduction already asked, returning existing question`
        );
        const firstQuestion = interview.questions[0];

        // Generate TTS audio
        let audioData = await this.generateTTSAudio(
          firstQuestion.question,
          userId,
          firstQuestion.questionId
        );

        socket.emit("question:first", {
          success: true,
          message: "First question retrieved successfully",
          data: {
            question: {
              questionId: firstQuestion.questionId,
              question: firstQuestion.question,
              category: firstQuestion.category,
              difficulty: firstQuestion.difficulty,
              questionType: firstQuestion.questionType,
            },
            interviewId: interview._id,
            questionNumber: 1,
            audio: audioData,
          },
        });
        return;
      }

      // Generate introduction question using TopicAnalysisService
      logger.info(
        `🔍 [Topic Interview] Generating new introduction question for topic: ${interview.topicName}`
      );

      const introQuestion = await TopicAnalysisService.generateIntroductionQuestion(
        interview,
        candidateName,
        interview.topicName
      );

      // Add question to interview
      await interview.addQuestion({
        questionId: introQuestion.questionId,
        question: introQuestion.question,
        category: introQuestion.category,
        difficulty: introQuestion.difficulty || "easy",
        expectedAnswer: introQuestion.expectedAnswer,
        questionType: "introduction",
      });

      // Mark introduction as asked
      interview.introductionAsked = true;
      interview.introductionQuestionId = introQuestion.questionId;
      await interview.save();

      // Generate TTS audio
      let audioData = await this.generateTTSAudio(
        introQuestion.question,
        userId,
        introQuestion.questionId
      );

      // Emit question to client
      socket.emit("question:first", {
        success: true,
        message: "First question generated successfully",
        data: {
          question: {
            questionId: introQuestion.questionId,
            question: introQuestion.question,
            category: introQuestion.category,
            difficulty: introQuestion.difficulty,
            questionType: "introduction",
          },
          interviewId: interview._id,
          questionNumber: 1,
          audio: audioData,
        },
      });

      logger.info(
        `✅ [Topic Interview] Introduction question emitted to user ${userId}`
      );
    } catch (error) {
      logger.error(
        "[Topic Interview] Error generating first question:",
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
   * Handle answer submission for topic interview
   */
  async handleSubmitAnswer(
    socket,
    { interviewId, questionId, userId, answer, proctoringData }
  ) {
    try {
      logger.info(
        `📤 [Topic Interview] Processing answer submission for interview ${interviewId}, question ${questionId}`
      );

      const {
        timeSpent,
        startTime,
        endTime,
        tabSwitches,
        copyPasteCount,
        questionNumber,
      } = proctoringData || {};

      // Emit analyzing status
      socket.emit("answer:analyzing", {
        questionId,
        message: "Analyzing your answer...",
      });

      // Find the interview
      const interview = await TopicInterview.findById(interviewId)
        .populate("resumeId", "resumeText resumeName")
        .populate("jobDescriptionId", "description title")
        .populate("candidateId", "firstName lastName");

      if (!interview) {
        socket.emit("answer:error", {
          success: false,
          message: "Interview not found",
          code: "INTERVIEW_NOT_FOUND",
        });
        return;
      }

      // Check if terminated
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

      // Perform sentiment analysis
      const sentimentResult = await sentimentAnalysisService.analyzeSentiment(
        answer
      );
      const currentSentiment = sentimentResult.success
        ? sentimentResult.sentiment
        : "NEUTRAL";

      logger.info(
        `[Topic Interview] Sentiment analysis result: ${currentSentiment}`
      );

      // Update answer
      await interview.updateAnswer(questionId, answer, timeSpent, currentSentiment);

      // Handle warning system
      let warningIssued = false;
      let interviewTerminated = false;
      let canContinue = true;

      if (currentSentiment === "NEGATIVE") {
        if (interview.warningCount === 0) {
          interview.warningCount = 1;
          interview.lastWarningAt = new Date();
          warningIssued = true;
        } else if (interview.warningCount === 1) {
          interview.warningCount = 2;
          interview.lastWarningAt = new Date();
          interview.isTerminated = true;
          interview.terminationReason =
            "Professional conduct violation - multiple inappropriate responses";
          interviewTerminated = true;
          canContinue = false;
          warningIssued = true;
        }
      }

      await interview.save();

      // Emit answer submitted confirmation
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
          questionSentiment: currentSentiment,
        },
      });

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
            sentiment: currentSentiment,
          },
        });
      }

      // If terminated, end interview
      if (interviewTerminated) {
        interview.status = "completed";
        interview.completedAt = new Date();
        if (interview.startedAt) {
          interview.totalDuration = Math.round(
            (interview.completedAt - interview.startedAt) / 1000 / 60
          );
        }
        await interview.save();

        socket.emit("interview:complete", {
          success: true,
          message: "Interview terminated due to professional conduct violations",
          data: {
            interviewId: interview._id,
            status: interview.status,
            totalQuestionsAsked: interview.questions.length,
            isInterviewComplete: true,
            reason: "terminated",
          },
        });
        return;
      }

      // Generate next question
      await this.generateNextQuestion(
        socket,
        interview,
        question,
        answer,
        userId,
        questionNumber,
        currentSentiment
      );
    } catch (error) {
      logger.error("[Topic Interview] Error submitting answer:", error);
      socket.emit("answer:error", {
        success: false,
        message: "Internal server error while submitting answer",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Generate next question based on current question type and answer
   * Flow: introduction → followup → pool → followup → pool → ...
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
      // Check max questions limit (18 questions)
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

      let nextQuestion = null;

      if (
        currentQuestion.questionType === "introduction" ||
        currentQuestion.questionType === "pool"
      ) {
        // Generate follow-up question
        logger.info(
          `🔄 [Topic Interview] Generating follow-up question after ${currentQuestion.questionType}...`
        );

        nextQuestion = await ResumeAnalysisService.generateFollowUpQuestion(
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
            parentQuestionId: currentQuestion.questionId,
          });
        }
      } else if (currentQuestion.questionType === "followup") {
        // Get next question from pool
        logger.info(
          `🔄 [Topic Interview] Getting next question from topic pool...`
        );

        nextQuestion = await this.getNextPoolQuestion(
          interview,
          answer,
          currentSentiment
        );

        if (nextQuestion) {
          await interview.addQuestion({
            questionId: nextQuestion.questionId,
            question: nextQuestion.question,
            category: nextQuestion.category,
            difficulty: nextQuestion.difficulty || "medium",
            expectedAnswer: nextQuestion.expectedAnswer,
            questionType: "pool",
            originalPoolQuestionId: nextQuestion.originalQuestionId,
          });

          // Track asked question
          await TopicQuestionsAsked.addAskedQuestion(
            userId,
            interview._id,
            interview.topicName,
            interview.difficultyLevel,
            interview.level,
            interview.interviewType,
            nextQuestion.originalQuestionId,
            "pool"
          );
        }
      }

      if (nextQuestion) {
        // Generate TTS audio
        let audioData = await this.generateTTSAudio(
          nextQuestion.question,
          userId,
          nextQuestion.questionId
        );

        // Emit next question
        socket.emit("question:next", {
          success: true,
          message: "Next question generated successfully",
          data: {
            question: {
              questionId: nextQuestion.questionId,
              question: nextQuestion.question,
              category: nextQuestion.category,
              difficulty: nextQuestion.difficulty,
              questionType: nextQuestion.questionType ||
                (currentQuestion.questionType === "followup" ? "pool" : "followup"),
            },
            questionNumber: interview.questions.length,
            totalQuestions: interview.questions.length,
            audio: audioData,
          },
        });

        logger.info(
          `✅ [Topic Interview] Next question emitted (${nextQuestion.questionId})`
        );
      } else {
        // No more questions available - end interview automatically
        logger.info(
          `🏁 [Topic Interview] No more questions available, ending interview automatically`
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
        interview.calculateOverallAnalysis();
        await interview.save();

        // Clear user's active interview state
        try {
          const InterviewStateService = require("../../interviewStateService");
          await InterviewStateService.markInterviewCompleted(userId, interview._id);
          logger.info(
            `✅ [Topic Interview] User interview state cleared for user ${userId}`
          );
        } catch (stateError) {
          logger.error(
            "❌ [Topic Interview] Error clearing user interview state:",
            stateError
          );
        }

        socket.emit("interview:complete", {
          success: true,
          message: "Interview completed - no more questions available",
          data: {
            interviewId: interview._id,
            status: interview.status,
            totalQuestionsAsked: interview.questions.length,
            isInterviewComplete: true,
            completedAt: interview.completedAt,
            totalDuration: interview.totalDuration,
            overallAnalysis: interview.overallAnalysis,
          },
        });
      }
    } catch (error) {
      logger.error("[Topic Interview] Error generating next question:", error);
      socket.emit("question:error", {
        success: false,
        message: "Error generating next question",
        code: "NEXT_QUESTION_ERROR",
      });
    }
  }

  /**
   * Get next question from topic pool (excluding already asked across ALL interviews)
   */
  async getNextPoolQuestion(interview, previousAnswer, sentiment) {
    try {
      // Get ALL asked question IDs for this user/topic across ALL interviews
      const askedQuestionIds = await TopicQuestionsAsked.getAskedQuestionIds(
        interview.candidateId,
        interview.topicName,
        interview.difficultyLevel,
        interview.level,
        interview.interviewType
      );

      logger.info(
        `📋 [Topic Interview] Found ${askedQuestionIds.length} previously asked questions for ${interview.topicName}`
      );

      // Get topic question model - This creates/gets collection like "ReactQuestions"
      const TopicQuestionModel = TopicQuestionModelFactory.getModel(
        interview.topicName
      );

      logger.info(
        `🔍 [Topic Interview] Querying collection: ${TopicQuestionModel.collection.name}`
      );

      // Build query to exclude already asked questions
      const query = {
        topicName: interview.topicName,
        experienceLevel: interview.level,
        difficultyLevel: interview.difficultyLevel,
        questionType: interview.interviewType,
      };

      // Exclude previously asked questions
      if (askedQuestionIds.length > 0) {
        query._id = {
          $nin: askedQuestionIds.map((id) => {
            try {
              return new mongoose.Types.ObjectId(id);
            } catch (e) {
              logger.warn(`Invalid ObjectId: ${id}`);
              return null;
            }
          }).filter(id => id !== null),
        };
      }

      logger.info(
        `🔍 [Topic Interview] Query: ${JSON.stringify(query)}`
      );

      // Get a random question
      const count = await TopicQuestionModel.countDocuments(query);
      logger.info(
        `📊 [Topic Interview] Found ${count} available questions in pool for ${interview.topicName}`
      );

      if (count === 0) {
        logger.warn(
          `⚠️ [Topic Interview] No more questions available in pool for ${interview.topicName} (${askedQuestionIds.length} questions already asked)`
        );
        return null;
      }

      const random = Math.floor(Math.random() * count);
      const poolQuestion = await TopicQuestionModel.findOne(query).skip(random);

      if (!poolQuestion) {
        logger.error(`❌ [Topic Interview] Failed to retrieve question despite count > 0`);
        return null;
      }

      logger.info(
        `✅ [Topic Interview] Selected question ID: ${poolQuestion._id}`
      );

      // Personalize the pool question based on previous answer and sentiment
      let personalizedQuestion;
      if (sentiment === "NEGATIVE") {
        personalizedQuestion =
          await ResumeAnalysisService.rephraseQuestionWithWarning(
            poolQuestion.questionText,
            sentiment
          );
      } else {
        personalizedQuestion =
          await ResumeAnalysisService.rephraseQuestionWithPersonalization(
            poolQuestion.questionText,
            previousAnswer,
            sentiment
          );
      }

      return {
        questionId: `pool_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        originalQuestionId: poolQuestion._id.toString(),
        question: personalizedQuestion,
        category: poolQuestion.topicName,
        difficulty: poolQuestion.difficultyLevel,
        expectedAnswer: poolQuestion.expectedAnswer,
        questionType: "pool",
      };
    } catch (error) {
      logger.error("[Topic Interview] Error getting pool question:", error);
      return null;
    }
  }

  /**
   * Generate TTS audio for question
   */
  async generateTTSAudio(questionText, userId, questionId) {
    try {
      const audioResult = await ttsService.generateSpeechStream(
        questionText,
        null,
        userId,
        questionId
      );

      if (audioResult.success) {
        return {
          audioBase64: audioResult.audioBase64,
          url: audioResult.url,
          fileName: audioResult.fileName,
          mimeType: "audio/mpeg",
        };
      }
    } catch (error) {
      logger.error("[Topic Interview] Error generating TTS audio:", error);
    }
    return null;
  }
}

module.exports = TopicInterviewWebSocketHandler;
