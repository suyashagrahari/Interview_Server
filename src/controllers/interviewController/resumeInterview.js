const Interview = require("../../models/Interview");

const resumeInterview = async (req, res) => {
  try {
    const { id: interviewId } = req.params;
    const userId = req.user.id;

    // Find interview and verify ownership
    const interview = await Interview.findOne({
      _id: interviewId,
      candidateId: userId,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found or access denied",
      });
    }

    // Check if interview is already ended
    if (interview.status === "completed" || interview.completedAt) {
      return res.status(400).json({
        success: false,
        message: "This interview has already been completed",
      });
    }

    // Calculate time remaining
    const startTime = new Date(interview.startedAt);
    const now = new Date();
    const timeElapsed = Math.floor((now - startTime) / 1000);
    const totalDuration = 45 * 60;
    const timeRemaining = Math.max(0, totalDuration - timeElapsed);

    // If expired, automatically end it
    if (timeRemaining <= 0) {
      interview.status = "completed";
      interview.completedAt = now;
      await interview.save();

      return res.status(400).json({
        success: false,
        message: "This interview has expired and been automatically ended",
      });
    }

    // Build chat history
    const chatHistory = [];
    if (interview.questions && interview.questions.length > 0) {
      for (const q of interview.questions) {
        chatHistory.push({
          id: `ai-${q._id}`,
          type: "ai",
          message: q.question,
          timestamp: q.createdAt || new Date(),
          questionId: q.questionId,
        });

        if (q.answer) {
          chatHistory.push({
            id: `user-${q._id}`,
            type: "user",
            message: q.answer,
            timestamp: q.answeredAt || new Date(),
            analysis: q.answerAnalysis,
          });
        }
      }
    }

    // Get current question (last question in array)
    const currentQuestion = interview.questions.length > 0
      ? {
          questionId: interview.questions[interview.questions.length - 1].questionId,
          question: interview.questions[interview.questions.length - 1].question,
          category: interview.questions[interview.questions.length - 1].category || "General",
          difficulty: interview.questions[interview.questions.length - 1].difficulty || "medium",
          expectedAnswer: interview.questions[interview.questions.length - 1].expectedAnswer || "",
        }
      : null;

    // Get current question number
    const answeredQuestions = interview.questions.filter(q => q.isAnswered).length;
    const currentQuestionNumber = answeredQuestions + 1;

    return res.json({
      success: true,
      data: {
        interviewId: interview._id,
        interviewType: interview.interviewType || "resume",
        startTime: interview.startedAt,
        currentQuestionNumber,
        currentQuestion,
        chatHistory,
        timeRemaining,
        warningCount: 0,
        violations: {
          tabSwitches: 0,
          copyPasteCount: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error resuming interview:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resume interview",
      error: error.message,
    });
  }
};

module.exports = resumeInterview;
