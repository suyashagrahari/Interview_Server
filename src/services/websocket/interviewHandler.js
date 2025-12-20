const ResumeInterview = require("../../models/ResumeInterview");
const ResumeQuestionPool = require("../../models/ResumeInterviewQuestionPool");

// Use resume-specific services for resume interviews
const ResumeQuestionManagementService = require("../resumeServices/resumeQuestionManagementService");
const UnifiedQuestionManagementService = require("../unifiedQuestionManagementService");
const JobDescriptionInterviewHandler = require("../jobDescriptionServices/jobDescriptionWebSocketHandlers/jobDescriptionInterviewWebSocketHandler");
const JobDescriptionQuestionManagementService = require("../jobDescriptionServices/jobDescriptionQuestionManagementService");
const TopicInterviewWebSocketHandler = require("../topicServices/topicWebSocketHandlers/topicInterviewWebSocketHandler");
const ResumeAnalysisService = require("../resumeServices/resumeAnalysisService");

// Shared services
const sentimentAnalysisService = require("../sentimentAnalysisService");
const ttsService = require("../ttsService");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");

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
      logger.info(
        `🎯 Generating first question for interview ${interviewId}, userId: ${userId}`
      );

      // Detect interview type first (needed for error logging and debugging)
      const interviewType =
        await UnifiedQuestionManagementService.detectInterviewType(interviewId);

      // Check if interview type was detected
      if (!interviewType) {
        socket.emit("question:error", {
          success: false,
          message: "Interview not found",
          code: "INTERVIEW_NOT_FOUND",
        });
        return;
      }

      // Route to appropriate handler based on interview type
      if (interviewType === "topic") {
        // Initialize topic interview handler
        const topicHandler = new TopicInterviewWebSocketHandler(this.io);
        return await topicHandler.handleGenerateFirstQuestion(socket, {
          interviewId,
          userId,
        });
      }

      if (interviewType === "job-description") {
        return await JobDescriptionInterviewHandler.handleGenerateFirstQuestion(
          socket,
          { interviewId, userId }
        );
      }

      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        logger.info(
          "⚠️ Fallback userId detected, fetching actual candidateId from interview"
        );

        // Get the appropriate interview model
        const { InterviewModel } =
          interviewType === "job-description"
            ? {
                InterviewModel: require("../../models/JobDescriptionInterview"),
              }
            : { InterviewModel: ResumeInterview };

        // Validate ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(interviewId)) {
          const interview = await InterviewModel.findById(interviewId);
          if (interview) {
            effectiveUserId = interview.candidateId.toString();
            logger.info(
              `✅ Using actual candidateId: ${effectiveUserId} for ${interviewType} interview`
            );
          }
        } else {
          logger.error(`❌ Invalid interview ID format: ${interviewId}`);
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
        logger.error("❌ Error calling getFirstQuestion:", error);
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
        logger.error("❌ getFirstQuestion failed:", result);
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

      // Debug logging for question data
      console.log(
        "🔍 DEBUG: Converted question object:",
        JSON.stringify(questionObj, null, 2)
      );
      console.log(
        "🔍 DEBUG: After destructuring - questionWithoutAnswer:",
        JSON.stringify(questionWithoutAnswer, null, 2)
      );
      console.log("🔍 DEBUG: Question ID:", questionWithoutAnswer.questionId);
      console.log("🔍 DEBUG: Question text:", questionWithoutAnswer.question);
      console.log(
        "🔍 DEBUG: Question category:",
        questionWithoutAnswer.category
      );
      console.log(
        "🔍 DEBUG: Question difficulty:",
        questionWithoutAnswer.difficulty
      );
      console.log(
        "🔍 DEBUG: Question type:",
        typeof questionWithoutAnswer.question
      );
      console.log(
        "🔍 DEBUG: Question length:",
        questionWithoutAnswer.question
          ? questionWithoutAnswer.question.length
          : 0
      );
      console.log(
        "🔍 DEBUG: Has question property:",
        "question" in questionWithoutAnswer
      );
      console.log(
        "🔍 DEBUG: Question property value:",
        questionWithoutAnswer.question
      );

      // Validate question text before TTS generation
      console.log("🔍 DEBUG: Validation checks:");
      console.log(
        "🔍 DEBUG: - questionWithoutAnswer.question exists:",
        !!questionWithoutAnswer.question
      );
      console.log(
        "🔍 DEBUG: - questionWithoutAnswer.question is string:",
        typeof questionWithoutAnswer.question === "string"
      );
      console.log(
        "🔍 DEBUG: - questionWithoutAnswer.question is not empty:",
        questionWithoutAnswer.question
          ? questionWithoutAnswer.question.trim() !== ""
          : false
      );
      console.log(
        "🔍 DEBUG: - questionWithoutAnswer.question value:",
        questionWithoutAnswer.question
      );
      console.log(
        "🔍 DEBUG: - questionWithoutAnswer.question length:",
        questionWithoutAnswer.question
          ? questionWithoutAnswer.question.length
          : 0
      );

      if (
        !questionWithoutAnswer.question ||
        typeof questionWithoutAnswer.question !== "string" ||
        questionWithoutAnswer.question.trim() === ""
      ) {
        logger.error("❌ Invalid question text for TTS generation:", {
          questionWithoutAnswer,
          originalQuestion: result.data.question,
          interviewId,
          interviewType,
        });
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
            `✅ TTS audio generated: ${audioResult.fileName}, base64 length: ${
              audioResult.audioBase64?.length || 0
            }`
          );
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
        `✅ First question emitted to user ${userId} (question ID: ${
          result.data.question.questionId
        }) with ${audioData ? "audio" : "no audio"}`
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
  async handleSubmitAnswer(
    socket,
    { interviewId, questionId, userId, answer, proctoringData, audioData }
  ) {
    try {
      logger.info(
        `📤 Processing answer submission for interview ${interviewId}, question ${questionId}, userId: ${userId}`
      );

      // Initialize finalAnswer with provided answer (will be updated if audio is transcribed)
      let finalAnswer = answer || "";
      let transcriptionStatus = "none"; // "none", "transcribing", "success", "failed"
      let transcribedText = null;

      // If audio data is provided, transcribe it first
      if (audioData) {
        try {
          // Emit transcription started event immediately
          socket.emit("answer:transcribing", {
            success: true,
            message: "Transcribing your answer...",
            data: {
              questionId,
              status: "transcribing",
            },
          });

          logger.info("🎤 Audio data received, transcribing with Groq...");
          logger.info(
            `📊 Audio data length: ${audioData.length} characters (base64)`
          );
          const groqTranscriptionService = require("../groqTranscriptionService");

          // Convert base64 to buffer
          const audioBuffer = Buffer.from(audioData, "base64");
          logger.info(`📊 Audio buffer size: ${audioBuffer.length} bytes`);

          // Transcribe audio
          const transcriptionResult =
            await groqTranscriptionService.transcribeAudioBuffer(
              audioBuffer,
              `answer-${questionId}-${Date.now()}.mp3`
            );

          if (transcriptionResult.success) {
            finalAnswer = transcriptionResult.text;
            transcribedText = transcriptionResult.text;
            transcriptionStatus = "success";
            logger.info(
              `✅ Transcription successful from Groq: "${finalAnswer.substring(
                0,
                100
              )}${finalAnswer.length > 100 ? "..." : ""}"`
            );
            console.log(
              `📝 [GROQ] Text transcribed from audio: "${finalAnswer}"`
            );
            console.log(`📝 [GROQ] This text came from Groq API transcription`);
          } else {
            transcriptionStatus = "failed";
            logger.warn(
              `⚠️ Transcription failed: ${transcriptionResult.message}, using provided text answer`
            );
            if (!answer || !answer.trim()) {
              socket.emit("answer:error", {
                success: false,
                message:
                  "Failed to transcribe audio and no text answer provided",
                code: "TRANSCRIPTION_FAILED",
              });
              return;
            }
          }
        } catch (transcriptionError) {
          transcriptionStatus = "failed";
          logger.error("Error transcribing audio:", transcriptionError);
          if (!answer || !answer.trim()) {
            socket.emit("answer:error", {
              success: false,
              message: "Failed to transcribe audio and no text answer provided",
              code: "TRANSCRIPTION_ERROR",
            });
            return;
          }
          logger.warn("Using provided text answer as fallback");
        }
      } else {
        logger.info("📝 No audio data provided, using text answer");
      }

      // Detect interview type first
      const interviewType =
        await UnifiedQuestionManagementService.detectInterviewType(interviewId);
      if (!interviewType) {
        socket.emit("answer:error", {
          success: false,
          message: "Interview not found",
          code: "INTERVIEW_NOT_FOUND",
        });
        return;
      }

      // Route to appropriate handler based on interview type
      if (interviewType === "topic") {
        // Initialize topic interview handler
        const topicHandler = new TopicInterviewWebSocketHandler(this.io);
        return await topicHandler.handleSubmitAnswer(socket, {
          interviewId,
          questionId,
          userId,
          answer: finalAnswer,
          proctoringData,
        });
      }

      if (interviewType === "job-description") {
        return await JobDescriptionInterviewHandler.handleSubmitAnswer(socket, {
          interviewId,
          questionId,
          userId,
          answer: finalAnswer,
          proctoringData,
        });
      }

      // Default to resume interview logic for other types
      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        logger.info(
          "⚠️ Fallback userId detected, fetching actual candidateId from interview"
        );

        // Get the appropriate interview model
        const { InterviewModel } =
          interviewType === "job-description"
            ? {
                InterviewModel: require("../../models/JobDescriptionInterview"),
              }
            : { InterviewModel: ResumeInterview };

        // Validate ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(interviewId)) {
          const tempInterview = await InterviewModel.findById(interviewId);
          if (tempInterview) {
            effectiveUserId = tempInterview.candidateId.toString();
            logger.info(
              `✅ Using actual candidateId: ${effectiveUserId} for ${interviewType} interview`
            );
          }
        } else {
          logger.error(`❌ Invalid interview ID format: ${interviewId}`);
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

      const { InterviewModel } =
        interviewType === "job-description"
          ? { InterviewModel: require("../../models/JobDescriptionInterview") }
          : { InterviewModel: ResumeInterview };

      // Find the interview
      const interview = await InterviewModel.findOne({
        _id: interviewId,
        candidateId: effectiveUserId,
        isActive: true,
      }).populate(
        interviewType === "job-description" ? "jobDescriptionId" : "resumeId",
        interviewType === "job-description"
          ? "jdText jdName"
          : "resumeText resumeName"
      );

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

      // Perform sentiment analysis on the answer (use finalAnswer which may be from Groq)
      logger.info(
        `[SubmitAnswer] Analyzing sentiment for answer: "${finalAnswer.substring(
          0,
          100
        )}..."`
      );
      const sentimentResult = await sentimentAnalysisService.analyzeSentiment(
        finalAnswer
      );

      const currentSentiment = sentimentResult.success
        ? sentimentResult.sentiment
        : "NEUTRAL";
      logger.info(
        `[SubmitAnswer] Sentiment analysis result: ${currentSentiment}`
      );

      // Update answer using unified service (use finalAnswer which may be from Groq)
      const updateResult = await UnifiedQuestionManagementService.submitAnswer(
        interviewId,
        questionId,
        effectiveUserId,
        finalAnswer,
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
      await ResumeQuestionManagementService.markQuestionCompleted(
        interviewId,
        effectiveUserId,
        questionId
      );

      // Process answer analysis in background (don't wait)
      // Use finalAnswer which may be from Groq transcription
      const analysisPromise = ResumeAnalysisService.analyzeAnswer(
        interview,
        question,
        finalAnswer, // Use finalAnswer (from Groq if audio provided, otherwise original text)
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
          // Transcription data
          transcribedText: transcribedText || null,
          transcriptionStatus: transcriptionStatus,
          hasAudio: !!audioData,
          originalAnswer: answer || null, // Original text answer (for fallback display)
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
        finalAnswer, // Use finalAnswer (transcribed text from voice, or original text if no audio)
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
          });
        }
      } else if (currentQuestion.questionType === "followup") {
        // Current question is follow-up, get next question from pool
        logger.info("🔄 Getting next question from pool...");

        const poolQuestionIndex = Math.floor(
          (interview.questions.length + 1) / 2
        );

        logger.info(
          `🔍 Calculated poolQuestionIndex: ${poolQuestionIndex}, total questions: ${interview.questions.length}`
        );

        const questionPool = await ResumeQuestionPool.findOne({
          interviewId: interview._id,
          userId: interview.candidateId,
        });

        if (!questionPool) {
          logger.error(
            `❌ Question pool not found for interview ${interview._id}, userId: ${interview.candidateId}`
          );
          socket.emit("question:error", {
            success: false,
            message: "Question pool not found",
            code: "QUESTION_POOL_NOT_FOUND",
          });
          return;
        }

        logger.info(
          `🔍 Question pool found with ${questionPool.questions.length} questions`
        );

        if (poolQuestionIndex >= questionPool.questions.length) {
          logger.warn(
            `⚠️ Pool question index ${poolQuestionIndex} is out of bounds. Pool has ${questionPool.questions.length} questions.`
          );
          socket.emit("interview:complete", {
            success: true,
            message: "Interview completed - no more questions available",
            data: {
              totalQuestionsAsked: interview.questions.length,
              isInterviewComplete: true,
            },
          });
          return;
        }

        const poolQuestion = questionPool.questions[poolQuestionIndex];

        if (!poolQuestion) {
          logger.error(
            `❌ Pool question at index ${poolQuestionIndex} is null or undefined`
          );
          socket.emit("question:error", {
            success: false,
            message: "Question not found in pool",
            code: "POOL_QUESTION_NOT_FOUND",
          });
          return;
        }

        // Check if question was already asked
        if (poolQuestion.isAsked) {
          logger.warn(
            `⚠️ Pool question ${poolQuestion.questionId} at index ${poolQuestionIndex} was already asked. Skipping to next available question.`
          );
          // Try to find next available question
          let foundNextQuestion = false;
          for (
            let i = poolQuestionIndex + 1;
            i < questionPool.questions.length;
            i++
          ) {
            if (!questionPool.questions[i].isAsked) {
              const nextAvailableQuestion = questionPool.questions[i];
              poolQuestion.questionId = nextAvailableQuestion.questionId;
              poolQuestion.question = nextAvailableQuestion.question;
              poolQuestion.category = nextAvailableQuestion.category;
              poolQuestion.difficulty = nextAvailableQuestion.difficulty;
              poolQuestion.expectedAnswer =
                nextAvailableQuestion.expectedAnswer;
              foundNextQuestion = true;
              logger.info(`✅ Found next available question at index ${i}`);
              break;
            }
          }
          if (!foundNextQuestion) {
            logger.warn(`⚠️ No more unasked questions in pool`);
            socket.emit("interview:complete", {
              success: true,
              message: "Interview completed - all questions asked",
              data: {
                totalQuestionsAsked: interview.questions.length,
                isInterviewComplete: true,
              },
            });
            return;
          }
        }

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
          logger.info(
            `✅ Added pool question ${nextQuestion.questionId} to interview`
          );
        } catch (addQuestionError) {
          logger.error(
            "Error adding pool question to interview:",
            addQuestionError
          );
          throw addQuestionError;
        }
      } else if (currentQuestion.questionType === "introduction") {
        // Current question is introduction, generate follow-up question
        logger.info("🔄 Generating follow-up question after introduction...");

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
            logger.info(
              `✅ Added follow-up question ${nextQuestion.questionId} after introduction`
            );
          } catch (addQuestionError) {
            logger.error(
              "Error adding follow-up question to interview:",
              addQuestionError
            );
            throw addQuestionError;
          }
        } else {
          logger.warn(
            "⚠️ Failed to generate follow-up question after introduction"
          );
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
            logger.info(
              `✅ TTS audio generated for next question: ${
                audioResult.fileName
              }, base64 length: ${audioResult.audioBase64?.length || 0}`
            );
          } else {
            logger.warn(
              `⚠️ TTS generation failed for next question: ${audioResult.message}`
            );
          }
        } catch (audioError) {
          logger.error(
            "Error generating TTS audio for next question:",
            audioError
          );
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
          `✅ Next question emitted (question ID: ${
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

      // Detect interview type first
      const interviewType =
        await UnifiedQuestionManagementService.detectInterviewType(interviewId);
      if (!interviewType) {
        socket.emit("reconnection:error", {
          success: false,
          message: "Interview not found",
          code: "INTERVIEW_NOT_FOUND",
        });
        return;
      }

      // Route to appropriate handler based on interview type
      if (interviewType === "job-description") {
        return await JobDescriptionInterviewHandler.handleReconnection(socket, {
          interviewId,
          userId,
        });
      }

      // Default to resume interview logic for other types
      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        logger.info(
          "⚠️ Fallback userId detected, fetching actual candidateId from interview"
        );

        // Get the appropriate interview model
        const { InterviewModel } =
          interviewType === "job-description"
            ? {
                InterviewModel: require("../../models/JobDescriptionInterview"),
              }
            : { InterviewModel: ResumeInterview };

        // Validate ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(interviewId)) {
          const tempInterview = await InterviewModel.findById(interviewId);
          if (tempInterview) {
            effectiveUserId = tempInterview.candidateId.toString();
            logger.info(
              `✅ Using actual candidateId: ${effectiveUserId} for ${interviewType} interview`
            );
          }
        } else {
          logger.error(`❌ Invalid interview ID format: ${interviewId}`);
        }
      }

      const { InterviewModel } =
        interviewType === "job-description"
          ? { InterviewModel: require("../../models/JobDescriptionInterview") }
          : { InterviewModel: ResumeInterview };

      const interview = await InterviewModel.findOne({
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
  async handleProctoringUpdate(
    socket,
    { interviewId, userId, proctoringData }
  ) {
    try {
      logger.info(`🔍 Updating proctoring data for interview ${interviewId}`);

      // Detect interview type first
      const interviewType =
        await UnifiedQuestionManagementService.detectInterviewType(interviewId);
      if (!interviewType) {
        socket.emit("proctoring:error", {
          success: false,
          message: "Interview not found",
        });
        return;
      }

      // If userId is a fallback, fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        // Get the appropriate interview model
        const { InterviewModel } =
          interviewType === "job-description"
            ? {
                InterviewModel: require("../../models/JobDescriptionInterview"),
              }
            : { InterviewModel: ResumeInterview };

        const tempInterview = await InterviewModel.findById(interviewId);
        if (tempInterview) {
          effectiveUserId = tempInterview.candidateId.toString();
        }
      }

      const { InterviewModel } =
        interviewType === "job-description"
          ? { InterviewModel: require("../../models/JobDescriptionInterview") }
          : { InterviewModel: ResumeInterview };

      const interview = await InterviewModel.findOne({
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

      logger.info(
        `✅ Proctoring data updated for interview ${interviewId}:`,
        proctoringData
      );

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

      // Detect interview type first
      const interviewType =
        await UnifiedQuestionManagementService.detectInterviewType(interviewId);
      if (!interviewType) {
        socket.emit("proctoring:error", {
          success: false,
          message: "Interview not found",
        });
        return;
      }

      // If userId is a fallback, fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        // Get the appropriate interview model
        const { InterviewModel } =
          interviewType === "job-description"
            ? {
                InterviewModel: require("../../models/JobDescriptionInterview"),
              }
            : { InterviewModel: ResumeInterview };

        const tempInterview = await InterviewModel.findById(interviewId);
        if (tempInterview) {
          effectiveUserId = tempInterview.candidateId.toString();
        }
      }

      const { InterviewModel } =
        interviewType === "job-description"
          ? { InterviewModel: require("../../models/JobDescriptionInterview") }
          : { InterviewModel: ResumeInterview };

      const interview = await InterviewModel.findOne({
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
