const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const ttsService = require("../ttsService");
const JobDescriptionInterview = require("../../models/JobDescriptionInterview");
const JobDescriptionInterviewQuestionPool = require("../../models/JobDescriptionInterviewQuestionPool");
const UnifiedQuestionManagementService = require("../unifiedQuestionManagementService");

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

      // Detect interview type and get appropriate model
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

      // Submit answer using unified service
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
          code: "ANSWER_SUBMISSION_FAILED",
        });
        return;
      }

      // Check if interview should be terminated due to proctoring violations
      if (proctoringData?.violations?.length > 0) {
        const severeViolations = proctoringData.violations.filter(
          (v) => v.severity === "high"
        );
        if (severeViolations.length >= 3) {
          // Terminate interview
          interview.isActive = false;
          interview.status = "terminated";
          interview.terminatedAt = new Date();
          interview.terminationReason = "Professional conduct violations";
          await interview.save();

          socket.emit("interview:terminated", {
            success: true,
            message:
              "Interview was terminated due to professional conduct violations",
            data: {
              questionId,
              violations: proctoringData.violations,
            },
          });
          return;
        }
      }

      // Get next question if available
      const nextQuestionResult =
        await UnifiedQuestionManagementService.getNextQuestion(
          interviewId,
          effectiveUserId
        );

      // Debug logging for next question result
      console.log(
        "🔍 [JD] DEBUG: Next question result:",
        JSON.stringify(nextQuestionResult, null, 2)
      );

      if (
        nextQuestionResult.success &&
        nextQuestionResult.data &&
        nextQuestionResult.data.question
      ) {
        // Generate TTS audio for next question
        let audioData = null;
        try {
          const audioResult = await ttsService.generateSpeechStream(
            nextQuestionResult.data.question.question,
            null,
            effectiveUserId,
            nextQuestionResult.data.question.questionId
          );

          if (audioResult.success) {
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
              `⚠️ [JD] TTS generation failed for next question: ${audioResult.message}`
            );
          }
        } catch (audioError) {
          logger.error(
            "Error generating TTS audio for next question:",
            audioError
          );
        }

        // Emit next question
        socket.emit("question:next", {
          success: true,
          message: "Next question generated successfully",
          data: {
            question: nextQuestionResult.data.question,
            interviewId: interview._id,
            questionNumber: nextQuestionResult.data.questionNumber,
            audio: audioData,
          },
        });

        logger.info(
          `✅ [JD] Next question emitted (question ID: ${
            nextQuestionResult.data.question.questionId
          }) with ${audioData ? "audio" : "no audio"}`
        );
      } else {
        // No more questions, end interview
        interview.isActive = false;
        interview.status = "completed";
        interview.completedAt = new Date();
        await interview.save();

        socket.emit("interview:complete", {
          success: true,
          message: "Interview completed successfully",
          data: {
            interviewId: interview._id,
            totalQuestions: interview.questions.length,
            completedAt: interview.completedAt,
          },
        });

        logger.info(`✅ [JD] Interview completed: ${interviewId}`);
      }

      // Emit answer confirmation
      socket.emit("answer:submitted", {
        success: true,
        message: "Answer submitted successfully",
        data: {
          questionId,
          answer,
          nextQuestionAvailable:
            nextQuestionResult.success &&
            nextQuestionResult.data &&
            nextQuestionResult.data.question,
        },
      });
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
