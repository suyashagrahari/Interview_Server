const Interview = require("../../models/Interview");

const checkActiveInterview = async (req, res) => {
  try {
    console.log("✅ checkActiveInterview called - route is working!");
    const userId = req.user.id;
    console.log("User ID:", userId);

    // Find active interview for this user
    const activeInterview = await Interview.findOne({
      candidateId: userId,
      status: "in_progress",
      completedAt: null,
    })
      .sort({ startedAt: -1 })
      .limit(1);

    console.log("Active interview found:", activeInterview ? "Yes" : "No");

    if (!activeInterview) {
      return res.json({
        success: true,
        hasActiveInterview: false,
        data: null,
      });
    }

    // Calculate time elapsed and remaining
    const startTime = new Date(activeInterview.startedAt);
    const now = new Date();
    const timeElapsed = Math.floor((now - startTime) / 1000); // seconds
    const totalDuration = 45 * 60; // 45 minutes in seconds
    const timeRemaining = Math.max(0, totalDuration - timeElapsed);
    const isExpired = timeRemaining <= 0;

    // Get current question number (number of answered questions + 1)
    const answeredQuestions = activeInterview.questions.filter(q => q.isAnswered).length;
    const currentQuestionNumber = answeredQuestions + 1;
    const totalQuestions = 10;

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

    // Get current question (last unanswered or last question)
    const currentQuestion = activeInterview.questions.length > 0
      ? {
          questionId: activeInterview.questions[activeInterview.questions.length - 1].questionId,
          question: activeInterview.questions[activeInterview.questions.length - 1].question,
          category: activeInterview.questions[activeInterview.questions.length - 1].category || "General",
          difficulty: activeInterview.questions[activeInterview.questions.length - 1].difficulty || "medium",
          expectedAnswer: activeInterview.questions[activeInterview.questions.length - 1].expectedAnswer || "",
        }
      : null;

    // Get violations (these fields might not exist yet, so default to 0)
    const violations = {
      tabSwitches: 0,
      copyPasteCount: 0,
    };

    return res.json({
      success: true,
      hasActiveInterview: true,
      data: {
        interviewId: activeInterview._id,
        interviewType: activeInterview.interviewType || "resume",
        startTime: activeInterview.startedAt,
        currentQuestionNumber,
        totalQuestions,
        timeElapsed,
        timeRemaining,
        isExpired,
        currentQuestion,
        chatHistory,
        warningCount: 0, // This field might not exist yet
        tabSwitchCount: 0, // This field might not exist yet
        violations,
      },
    });
  } catch (error) {
    console.error("Error checking active interview:", error);
    return res.status(500).json({
      success: false,
      hasActiveInterview: false,
      message: "Failed to check for active interview",
      error: error.message,
    });
  }
};

module.exports = checkActiveInterview;
