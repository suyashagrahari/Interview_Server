const {
  QuestionPool,
  Interview,
  chatGPTService,
  logger,
} = require("./dependencies");

/**
 * Generate questions for an interview based on resume
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateQuestions = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { interviewId } = req.params;

    // Get interview details
    const interview = await Interview.findOne({
      _id: interviewId,
      candidateId: req.user.id,
      isActive: true,
    }).populate("resumeId", "resumeText resumeName");

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Check if questions already exist for this interview
    const existingQuestionPool = await QuestionPool.findOne({
      interviewId: interviewId,
    });

    if (existingQuestionPool) {
      return res.status(409).json({
        success: false,
        message: "Questions already generated for this interview",
        data: {
          questionPoolId: existingQuestionPool._id,
          questionCount: existingQuestionPool.questionCount,
        },
      });
    }

    // Generate questions using ChatGPT
    logger.info("Generating questions for interview:", {
      interviewId,
      resumeId: interview.resumeId._id,
      jobRole: interview.jobRole,
      interviewType: interview.interviewType,
      level: interview.level,
      difficultyLevel: interview.difficultyLevel,
    });

    const chatGPTResponse = await chatGPTService.generateInterviewQuestions({
      resumeText: interview.resumeId.resumeText,
      interviewType: interview.interviewType,
      level: interview.level,
      difficultyLevel: interview.difficultyLevel,
      jobRole: interview.jobRole,
    });

    if (!chatGPTResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate questions",
      });
    }

    // Create question pool
    const questionPool = new QuestionPool({
      resumeId: interview.resumeId._id,
      interviewId: interviewId,
      userId: req.user.id,
      interviewType: interview.interviewType,
      level: interview.level,
      difficultyLevel: interview.difficultyLevel,
      jobRole: interview.jobRole,
      questions: chatGPTResponse.questions,
      totalTokensUsed: chatGPTResponse.totalTokensUsed,
    });

    await questionPool.save();

    // Add questions to the interview
    for (const questionData of chatGPTResponse.questions) {
      await interview.addQuestion({
        questionId: questionData.questionId,
        question: questionData.question,
        category: questionData.category,
        difficulty: "medium", // Default difficulty
        expectedAnswer: questionData.expectedAnswer,
      });
    }

    logger.info("Questions generated successfully", {
      interviewId,
      questionPoolId: questionPool._id,
      questionCount: chatGPTResponse.questions.length,
      totalTokensUsed: chatGPTResponse.totalTokensUsed,
    });

    res.status(201).json({
      success: true,
      message: "Questions generated successfully",
      data: {
        questionPoolId: questionPool._id,
        questionCount: chatGPTResponse.questions.length,
        totalTokensUsed: chatGPTResponse.totalTokensUsed,
        questions: chatGPTResponse.questions.map((q) => ({
          questionId: q.questionId,
          question: q.question,
          category: q.category,
          keywords: q.keywords,
        })),
      },
    });
  } catch (error) {
    logger.error("Error generating questions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while generating questions",
    });
  }
};

module.exports = generateQuestions;

