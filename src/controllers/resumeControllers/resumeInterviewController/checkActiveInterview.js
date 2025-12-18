const ResumeInterview = require("../../../models/ResumeInterview");
const InterviewStateService = require("../../../services/interviewStateService");
const logger = require("../../../utils/logger");
const mongoose = require("mongoose");

/**
 * Check for active/incomplete interview for current user
 * Enhanced with user-level state tracking for cross-device support
 * @route GET /api/resume-interview/check-active
 */
const checkActiveInterview = async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`Checking active interview for user ${userId}`);

    // First, check user's interview state (fast lookup)
    let userActiveState = await InterviewStateService.getUserActiveInterview(
      userId
    );

    let activeInterview = null;

    // If no active state or expired, query database to double-check
    if (!userActiveState || userActiveState.isExpired) {
      // Query database for any active interview (matching startInterview logic)
      activeInterview = await ResumeInterview.findOne({
        candidateId: userId,
        status: { $in: ["in_progress", "paused"] },
        completedAt: null,
        isActive: true, // Match the check in startInterview
      })
        .sort({ startedAt: -1 })
        .limit(1);

      // If found an active interview, sync it to user state
      if (activeInterview) {
        const answeredQuestions = activeInterview.questions.filter(
          (q) => q.isAnswered
        ).length;
        const totalQuestions = activeInterview.questions.length;
        const startTime = new Date(activeInterview.startedAt);
        const now = new Date();
        const timeElapsed = Math.floor((now - startTime) / 1000);
        const totalDuration = 45 * 60; // 45 minutes
        const timeRemaining = Math.max(0, totalDuration - timeElapsed);

        // Sync to user state
        await InterviewStateService.updateUserInterviewState(userId, {
          interviewId: activeInterview._id,
          status: activeInterview.status,
          startedAt: activeInterview.startedAt,
          completedAt: activeInterview.completedAt,
          currentQuestionNumber: answeredQuestions,
          totalQuestions,
          timeRemaining,
          interviewType: "resume",
        });

        // Re-fetch userActiveState after syncing
        userActiveState = await InterviewStateService.getUserActiveInterview(
          userId
        );
      } else {
        // No active interview found
        logger.info(`No active interview found for user ${userId}`);
        return res.json({
          success: true,
          hasActiveInterview: false,
          data: null,
        });
      }
    }

    // If we don't have activeInterview yet, fetch it using interviewId from state
    if (!activeInterview) {
      const interviewId = userActiveState?.interviewId;

      if (!interviewId) {
        return res.json({
          success: true,
          hasActiveInterview: false,
          data: null,
        });
      }

      // Validate ObjectId before querying
      if (!mongoose.Types.ObjectId.isValid(interviewId)) {
        logger.error(`Invalid interview ID format: ${interviewId}`);
        await InterviewStateService.clearUserActiveInterview(userId);
        return res.json({
          success: true,
          hasActiveInterview: false,
          data: null,
        });
      }

      activeInterview = await ResumeInterview.findById(interviewId);
    }

    if (!activeInterview) {
      // Interview was deleted or not found, clean up state
      await InterviewStateService.clearUserActiveInterview(userId);
      return res.json({
        success: true,
        hasActiveInterview: false,
        data: null,
      });
    }

    // Check if interview is already completed or cancelled
    if (activeInterview.status === "completed" || activeInterview.status === "cancelled") {
      // Interview is no longer active, clean up state
      await InterviewStateService.clearUserActiveInterview(userId);
      logger.info(`Interview ${interviewId} is ${activeInterview.status}, clearing active state`);
      return res.json({
        success: true,
        hasActiveInterview: false,
        data: null,
      });
    }

    // Calculate time elapsed and remaining
    const startTime = new Date(activeInterview.startedAt);
    const now = new Date();
    const timeElapsed = Math.floor((now - startTime) / 1000);
    const totalDuration = 45 * 60; // 45 minutes in seconds
    const timeRemaining = Math.max(
      0,
      activeInterview.timeRemaining || totalDuration - timeElapsed
    );
    const isExpired = timeRemaining <= 0;

    // If expired, mark as completed and clear state
    if (isExpired && activeInterview.status === "in_progress") {
      activeInterview.status = "completed";
      await activeInterview.save();
      await InterviewStateService.clearUserActiveInterview(userId);

      return res.json({
        success: true,
        hasActiveInterview: false,
        data: null,
        message: "Interview expired and marked as completed",
      });
    }

    // Get current question number
    const answeredQuestions = activeInterview.questions.filter(
      (q) => q.isAnswered
    ).length;
    const currentQuestionNumber = answeredQuestions + 1;
    const totalQuestions = activeInterview.questions.length || 10;

    // Build chat history from questions array
    const chatHistory = [];
    if (activeInterview.questions && activeInterview.questions.length > 0) {
      for (const q of activeInterview.questions) {
        // Add AI question
        chatHistory.push({
          type: "ai",
          message: q.question,
          timestamp: q.createdAt || new Date(),
        });

        // Add user answer if exists
        if (q.answer) {
          chatHistory.push({
            type: "user",
            message: q.answer,
            timestamp: q.answeredAt || new Date(),
          });
        }
      }
    }

    // Get current question (last question that's not fully answered)
    let currentQuestion = null;
    if (activeInterview.questions.length > 0) {
      const lastQuestion =
        activeInterview.questions[activeInterview.questions.length - 1];
      currentQuestion = {
        questionId: lastQuestion.questionId,
        question: lastQuestion.question,
        category: lastQuestion.category || "General",
        difficulty: lastQuestion.difficulty || "medium",
        expectedAnswer: lastQuestion.expectedAnswer || "",
      };
    }

    // Get proctoring violations
    const proctoringData = activeInterview.proctoringData || {};
    const violations = {
      tabSwitches: proctoringData.tabSwitches || 0,
      copyPasteCount: proctoringData.copyPasteCount || 0,
      faceDetectionIssues: proctoringData.faceDetectionIssues || 0,
      multiplePersonDetections: proctoringData.multiplePersonDetections || 0,
      phoneDetections: proctoringData.phoneDetections || 0,
    };

    // Update activity timestamp
    await InterviewStateService.updateActivity(userId);

    // Prepare response with enhanced tracking
    const responseData = {
      // Interview identification
      interviewId: activeInterview._id,
      interviewType: "resume",
      interviewSourceType: activeInterview.interviewType || "technical", // technical/behavioral

      // Timing information
      startTime: activeInterview.startedAt,
      expectedEndTime: userActiveState?.expectedEndTime || null,
      timeElapsed,
      timeRemaining,
      isExpired,

      // Progress tracking
      currentQuestionNumber,
      totalQuestions,
      answeredQuestions,

      // Current state
      status: activeInterview.status,
      currentQuestion,
      chatHistory,

      // Warning & violation tracking
      warningCount: activeInterview.warningCount || 0,
      isTerminated: activeInterview.isTerminated || false,
      tabSwitchCount: proctoringData.tabSwitches || 0,
      violations,

      // User state tracking (for cross-device support)
      lastActivityAt: userActiveState?.lastActivityAt || new Date(),
      isActive: true,
      isCompleted: false,

      // Interview metadata
      jobRole: activeInterview.jobRole || "",
      level: activeInterview.level || "",
      difficultyLevel: activeInterview.difficultyLevel || "",
      interviewerName: activeInterview.interviewer?.name || "AI Interviewer",
    };

    logger.info(`Active interview found for user ${userId}`, {
      interviewId: activeInterview._id,
      questionNumber: currentQuestionNumber,
      timeRemaining,
    });

    return res.json({
      success: true,
      hasActiveInterview: true,
      data: responseData,
    });
  } catch (error) {
    logger.error("Error checking active interview:", error);
    return res.status(500).json({
      success: false,
      hasActiveInterview: false,
      message: "Failed to check for active interview",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = checkActiveInterview;
