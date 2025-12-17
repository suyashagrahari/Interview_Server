const logger = require("../../../utils/logger");
const mongoose = require("mongoose");
const ttsService = require("../../ttsService");
const JobDescriptionInterview = require("../../../models/JobDescriptionInterview");
const JobDescriptionInterviewQuestionPool = require("../../../models/JobDescriptionInterviewQuestionPool");
const UnifiedQuestionManagementService = require("../../unifiedQuestionManagementService");
const JobDescriptionAnalysisService = require("../jobDescriptionAnalysisService");
const sentimentAnalysisService = require("../../sentimentAnalysisService");
const JobDescriptionQuestionManagementService = require("../jobDescriptionQuestionManagementService");

/**
 * Job Description Interview WebSocket Handler
 * Dedicated handler for job description-based interviews
 */
class JobDescriptionInterviewHandler {
  /**
   * Handle generating first question for job description interview
   */
  async handleGenerateFirstQuestion(socket, { interviewId, userId }) {
    try {
      logger.info(
        `🎯 [JD] Generating first question for interview ${interviewId}, userId: ${userId}`
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

      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        logger.info(
          "⚠️ [JD] Fallback userId detected, fetching actual candidateId from interview"
        );

        // Validate ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(interviewId)) {
          const interview = await JobDescriptionInterview.findById(interviewId);
          if (interview) {
            effectiveUserId = interview.candidateId.toString();
            logger.info(
              `✅ [JD] Using actual candidateId: ${effectiveUserId} for job description interview`
            );
          }
        } else {
          logger.error(`❌ [JD] Invalid interview ID format: ${interviewId}`);
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
        logger.error("❌ [JD] Error calling getFirstQuestion:", error);
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
        logger.error("❌ [JD] getFirstQuestion failed:", result);
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
        "🔍 [JD] DEBUG: Converted question object:",
        JSON.stringify(questionObj, null, 2)
      );
      console.log(
        "🔍 [JD] DEBUG: After destructuring - questionWithoutAnswer:",
        JSON.stringify(questionWithoutAnswer, null, 2)
      );

      // Validate question text before TTS generation
      console.log("🔍 [JD] DEBUG: Validation checks:");
      console.log(
        "🔍 [JD] DEBUG: - questionWithoutAnswer.question exists:",
        !!questionWithoutAnswer.question
      );
      console.log(
        "🔍 [JD] DEBUG: - questionWithoutAnswer.question is string:",
        typeof questionWithoutAnswer.question === "string"
      );
      console.log(
        "🔍 [JD] DEBUG: - questionWithoutAnswer.question is not empty:",
        questionWithoutAnswer.question
          ? questionWithoutAnswer.question.trim() !== ""
          : false
      );
      console.log(
        "🔍 [JD] DEBUG: - questionWithoutAnswer.question value:",
        questionWithoutAnswer.question
      );
      console.log(
        "🔍 [JD] DEBUG: - questionWithoutAnswer.question length:",
        questionWithoutAnswer.question
          ? questionWithoutAnswer.question.length
          : 0
      );

      if (
        !questionWithoutAnswer.question ||
        typeof questionWithoutAnswer.question !== "string" ||
        questionWithoutAnswer.question.trim() === ""
      ) {
        logger.error("❌ [JD] Invalid question text for TTS generation:", {
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
            `✅ [JD] TTS audio generated: ${
              audioResult.fileName
            }, base64 length: ${audioResult.audioBase64?.length || 0}`
          );
        } else {
          logger.warn(`⚠️ [JD] TTS generation failed: ${audioResult.message}`);
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
        `✅ [JD] First question emitted to user ${userId} (question ID: ${
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
   * Handle answer submission for job description interview
   */
  async handleSubmitAnswer(
    socket,
    { interviewId, questionId, userId, answer, proctoringData }
  ) {
    try {
      logger.info(
        `📝 [JD] Submitting answer for interview ${interviewId}, question ${questionId}`
      );

      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        logger.info(
          "⚠️ [JD] Fallback userId detected, fetching actual candidateId from interview"
        );

        // Validate ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(interviewId)) {
          const interview = await JobDescriptionInterview.findById(interviewId);
          if (interview) {
            effectiveUserId = interview.candidateId.toString();
            logger.info(
              `✅ [JD] Using actual candidateId: ${effectiveUserId} for job description interview`
            );
          }
        } else {
          logger.error(`❌ [JD] Invalid interview ID format: ${interviewId}`);
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

      // Find the interview with job description data
      const interview = await JobDescriptionInterview.findOne({
        _id: interviewId,
        candidateId: effectiveUserId,
        isActive: true,
      }).populate("jobDescriptionId", "jdText jdName");

      if (!interview) {
        socket.emit("answer:error", {
          success: false,
          message: "Interview not found or not active",
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
        `[JD SubmitAnswer] Analyzing sentiment for answer: "${answer.substring(
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
        `[JD SubmitAnswer] Sentiment analysis result: ${currentSentiment}`
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
          `[JD SubmitAnswer] Negative sentiment detected, current warning count: ${interview.warningCount}`
        );

        if (interview.warningCount === 0) {
          // First warning
          interview.warningCount = 1;
          interview.lastWarningAt = new Date();
          warningIssued = true;
          logger.warn(
            `[JD SubmitAnswer] First warning issued for negative sentiment`
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
            `[JD SubmitAnswer] Interview terminated due to second negative sentiment`
          );
        }
      }

      // Save interview with updated warning data
      await interview.save();

      // Mark question as completed in question pool
      await JobDescriptionQuestionManagementService.markQuestionCompleted(
        interviewId,
        effectiveUserId,
        questionId
      );

      // Process answer analysis in background (don't wait)
      const analysisPromise = JobDescriptionAnalysisService.analyzeAnswer(
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
          logger.info(`✅ [JD] Analysis completed for question ${questionId}`);
        }
      } catch (error) {
        logger.error("[JD] Error processing analysis:", error);
      }

      // If interview terminated, end the interview properly
      if (interviewTerminated) {
        logger.info(
          `[JD SubmitAnswer] Ending terminated interview ${interviewId}`
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
          `[JD SubmitAnswer] Interview ${interviewId} completed due to termination`
        );

        // Clear user's active interview state
        try {
          const InterviewStateService = require("../../interviewStateService");
          await InterviewStateService.markInterviewCompleted(
            effectiveUserId,
            interviewId
          );
          logger.info(
            `[JD SubmitAnswer] User interview state cleared for user ${effectiveUserId}, interview ${interviewId}`
          );
        } catch (stateError) {
          logger.error(
            "[JD SubmitAnswer] Error clearing user interview state:",
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
        effectiveUserId,
        questionNumber,
        currentSentiment
      );
    } catch (error) {
      logger.error("[JD] Error submitting answer:", error);
      socket.emit("answer:error", {
        success: false,
        message: "Internal server error while submitting answer",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Generate next question based on current question type for JD interview
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
        logger.info("🔄 [JD] Generating follow-up question...");

        nextQuestion =
          await JobDescriptionAnalysisService.generateFollowUpQuestion(
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
              "[JD] Error adding follow-up question to interview:",
              addQuestionError
            );
            throw addQuestionError;
          }
        }
      } else if (currentQuestion.questionType === "followup") {
        // Current question is follow-up, get next question from pool
        logger.info("🔄 [JD] Getting next question from pool...");

        const poolQuestionIndex = Math.floor(
          (interview.questions.length + 1) / 2
        );

        const questionPool = await JobDescriptionInterviewQuestionPool.findOne({
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
              await JobDescriptionAnalysisService.rephraseQuestionWithWarning(
                poolQuestion.question,
                currentSentiment
              );
          } else {
            // Personalize based on previous answer
            personalizedQuestion =
              await JobDescriptionAnalysisService.rephraseQuestionWithPersonalization(
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
              "[JD] Error adding pool question to interview:",
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
          logger.error("[JD] Invalid nextQuestion data:", nextQuestion);
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
            null,
            userId,
            nextQuestion.questionId
          );

          if (audioResult && audioResult.success) {
            audioData = {
              audioBase64: audioResult.audioBase64,
              url: audioResult.url,
              fileName: audioResult.fileName,
              mimeType: "audio/mpeg",
            };
            logger.info(
              `✅ [JD] TTS audio generated for next question: ${
                audioResult.fileName
              }, base64 length: ${audioResult.audioBase64?.length || 0}`
            );
          } else {
            logger.warn(
              `⚠️ [JD] TTS generation failed for next question: ${
                audioResult?.message || "Unknown error"
              }`
            );
          }
        } catch (audioError) {
          logger.error(
            "[JD] Error generating TTS audio for next question:",
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
          `✅ [JD] Next question emitted (question ID: ${
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
      logger.error("[JD] Error generating next question:", error);
      socket.emit("question:error", {
        success: false,
        message: "Error generating next question",
        code: "NEXT_QUESTION_ERROR",
      });
    }
  }

  /**
   * Handle reconnection for job description interview
   */
  async handleReconnection(socket, { interviewId, userId }) {
    try {
      logger.info(`🔄 [JD] Handling reconnection for interview ${interviewId}`);

      // If userId is a fallback (starts with 'interview-'), fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        logger.info(
          "⚠️ [JD] Fallback userId detected, fetching actual candidateId from interview"
        );

        // Validate ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(interviewId)) {
          const tempInterview = await JobDescriptionInterview.findById(
            interviewId
          );
          if (tempInterview) {
            effectiveUserId = tempInterview.candidateId.toString();
            logger.info(
              `✅ [JD] Using actual candidateId: ${effectiveUserId} for job description interview`
            );
          }
        } else {
          logger.error(`❌ [JD] Invalid interview ID format: ${interviewId}`);
        }
      }

      // Detect interview type and get appropriate model
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

      const interview = await JobDescriptionInterview.findOne({
        _id: interviewId,
        candidateId: effectiveUserId,
        isActive: true,
      });

      if (!interview) {
        socket.emit("reconnection:error", {
          success: false,
          message: "Interview not found or not active",
          code: "INTERVIEW_NOT_FOUND",
        });
        return;
      }

      // Emit reconnection success
      socket.emit("reconnection:success", {
        success: true,
        message: "Successfully reconnected to interview",
        data: {
          interviewId: interview._id,
          status: interview.status,
          currentQuestionNumber: interview.questions.length,
          totalQuestions: interview.questions.length,
        },
      });

      logger.info(
        `✅ [JD] Reconnection successful for interview ${interviewId}`
      );
    } catch (error) {
      logger.error("Error handling reconnection:", error);
      socket.emit("reconnection:error", {
        success: false,
        message: "Internal server error during reconnection",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Handle proctoring data updates for job description interview
   */
  async handleProctoringUpdate(
    socket,
    { interviewId, userId, proctoringData }
  ) {
    try {
      logger.info(
        `🔍 [JD] Updating proctoring data for interview ${interviewId}`
      );

      // If userId is a fallback, fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        // Detect interview type first
        const interviewType =
          await UnifiedQuestionManagementService.detectInterviewType(
            interviewId
          );
        if (!interviewType) {
          socket.emit("proctoring:error", {
            success: false,
            message: "Interview not found",
            code: "INTERVIEW_NOT_FOUND",
          });
          return;
        }

        // Validate ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(interviewId)) {
          const tempInterview = await JobDescriptionInterview.findById(
            interviewId
          );
          if (tempInterview) {
            effectiveUserId = tempInterview.candidateId.toString();
            logger.info(
              `✅ [JD] Using actual candidateId: ${effectiveUserId} for job description interview`
            );
          }
        } else {
          logger.error(`❌ [JD] Invalid interview ID format: ${interviewId}`);
        }
      }

      // Detect interview type and get appropriate model
      const interviewType =
        await UnifiedQuestionManagementService.detectInterviewType(interviewId);
      if (!interviewType) {
        socket.emit("proctoring:error", {
          success: false,
          message: "Interview not found",
          code: "INTERVIEW_NOT_FOUND",
        });
        return;
      }

      const interview = await JobDescriptionInterview.findOne({
        _id: interviewId,
        candidateId: effectiveUserId,
        isActive: true,
      });

      if (!interview) {
        socket.emit("proctoring:error", {
          success: false,
          message: "Interview not found or not active",
          code: "INTERVIEW_NOT_FOUND",
        });
        return;
      }

      // Update proctoring data
      await interview.updateProctoringData(proctoringData);

      logger.info(
        `✅ [JD] Proctoring data updated for interview ${interviewId}:`,
        proctoringData
      );

      // Acknowledge update
      socket.emit("proctoring:updated", {
        success: true,
        message: "Proctoring data updated successfully",
        data: {
          interviewId: interview._id,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error("Error updating proctoring data:", error);
      socket.emit("proctoring:error", {
        success: false,
        message: "Internal server error while updating proctoring data",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Handle getting proctoring data for job description interview
   */
  async handleGetProctoringData(socket, { interviewId, userId }) {
    try {
      logger.info(
        `📊 [JD] Getting proctoring data for interview ${interviewId}`
      );

      // If userId is a fallback, fetch actual candidateId
      let effectiveUserId = userId;
      if (userId && userId.startsWith("interview-")) {
        // Detect interview type first
        const interviewType =
          await UnifiedQuestionManagementService.detectInterviewType(
            interviewId
          );
        if (!interviewType) {
          socket.emit("proctoring:error", {
            success: false,
            message: "Interview not found",
            code: "INTERVIEW_NOT_FOUND",
          });
          return;
        }

        // Validate ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(interviewId)) {
          const tempInterview = await JobDescriptionInterview.findById(
            interviewId
          );
          if (tempInterview) {
            effectiveUserId = tempInterview.candidateId.toString();
            logger.info(
              `✅ [JD] Using actual candidateId: ${effectiveUserId} for job description interview`
            );
          }
        } else {
          logger.error(`❌ [JD] Invalid interview ID format: ${interviewId}`);
        }
      }

      // Detect interview type and get appropriate model
      const interviewType =
        await UnifiedQuestionManagementService.detectInterviewType(interviewId);
      if (!interviewType) {
        socket.emit("proctoring:error", {
          success: false,
          message: "Interview not found",
          code: "INTERVIEW_NOT_FOUND",
        });
        return;
      }

      const interview = await JobDescriptionInterview.findOne({
        _id: interviewId,
        candidateId: effectiveUserId,
        isActive: true,
      });

      if (!interview) {
        socket.emit("proctoring:error", {
          success: false,
          message: "Interview not found or not active",
          code: "INTERVIEW_NOT_FOUND",
        });
        return;
      }

      // Get proctoring data
      const proctoringData = interview.getProctoringData();

      socket.emit("proctoring:data", {
        success: true,
        message: "Proctoring data retrieved successfully",
        data: {
          interviewId: interview._id,
          proctoringData,
          timestamp: new Date(),
        },
      });

      logger.info(`✅ [JD] Proctoring data sent for interview ${interviewId}`);
    } catch (error) {
      logger.error("Error getting proctoring data:", error);
      socket.emit("proctoring:error", {
        success: false,
        message: "Internal server error while getting proctoring data",
        code: "INTERNAL_ERROR",
      });
    }
  }
}

module.exports = new JobDescriptionInterviewHandler();
