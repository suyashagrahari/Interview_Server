const { QuestionPool, chatGPTService, logger } = require("./dependencies");
const Interview = require("../../models/Interview");
const User = require("../../models/User");
const generateIntroductionQuestion = require("./generateIntroductionQuestion");

/**
 * Generate complete question set (1 introduction + 8 regular questions) for an interview
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Generation result
 */
const generateCompleteQuestionSet = async (interviewId, userId) => {
  try {
    // Get interview details
    const interview = await Interview.findOne({
      _id: interviewId,
      candidateId: userId,
      isActive: true,
    }).populate("resumeId", "resumeText resumeName");

    if (!interview) {
      return {
        success: false,
        message: "Interview not found",
      };
    }

    // Check if questions already exist for this interview
    const existingQuestionPool = await QuestionPool.findOne({
      interviewId: interviewId,
    });

    if (existingQuestionPool) {
      return {
        success: false,
        message: "Questions already generated for this interview",
        data: {
          questionPoolId: existingQuestionPool._id,
          questionCount: existingQuestionPool.questionCount,
        },
      };
    }

    // Get candidate's name from user data
    const candidate = await User.findById(userId);
    const candidateName = candidate
      ? `${candidate.firstName} ${candidate.lastName}`.trim()
      : "Candidate";

    logger.info("Generating complete question set for interview:", {
      interviewId,
      resumeId: interview.resumeId._id,
      jobRole: interview.jobRole,
      interviewType: interview.interviewType,
      level: interview.level,
      difficultyLevel: interview.difficultyLevel,
      candidateName,
    });

    // Generate both introduction and regular questions asynchronously
    const [introductionResult, regularQuestionsResult] = await Promise.all([
      // Generate introduction question
      generateIntroductionQuestion(interview, candidateName).catch((error) => {
        logger.error("Error generating introduction question:", error);
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return {
          questionId: `${timestamp}${random}`,
          question:
            "Hello! I'm your interviewer. Could you please introduce yourself and tell me about your background?",
          category: "Introduction",
          difficulty: "easy",
          expectedAnswer:
            "Candidate should provide a brief overview of their background, relevant experience, skills, and interest in the role.",
          keywords: [
            "introduction",
            "background",
            "experience",
            "skills",
            "motivation",
          ],
        };
      }),

      // Generate 8 regular questions
      chatGPTService
        .generateInterviewQuestions({
          resumeText: interview.resumeId.resumeText,
          interviewType: interview.interviewType,
          level: interview.level,
          difficultyLevel: interview.difficultyLevel,
          jobRole: interview.jobRole,
        })
        .catch((error) => {
          logger.error("Error generating regular questions:", error);
          return {
            success: false,
            questions: [],
            totalTokensUsed: 0,
          };
        }),
    ]);

    // Prepare questions array with introduction at index 0
    const allQuestions = [];

    // Generate unique numeric question IDs
    const generateUniqueQuestionId = () => {
      const timestamp = Date.now(); // Current timestamp
      const random = Math.floor(Math.random() * 1000); // Random number between 0-999
      return `${timestamp}${random}`; // Combine timestamp with random number for uniqueness
    };

    // Add introduction question at index 0
    allQuestions.push({
      questionId: generateUniqueQuestionId().toString(),
      question: introductionResult.question,
      category: introductionResult.category,
      difficulty: introductionResult.difficulty,
      expectedAnswer: introductionResult.expectedAnswer,
      keywords: introductionResult.keywords || [
        "introduction",
        "background",
        "experience",
        "skills",
        "motivation",
      ],
    });

    // Add regular questions at indices 1-8
    if (regularQuestionsResult.success && regularQuestionsResult.questions) {
      regularQuestionsResult.questions.forEach((question, index) => {
        allQuestions.push({
          questionId: question.questionId, // Use ChatGPT's generated unique timestamp-based ID
          question: question.question,
          category: question.category,
          difficulty: question.difficulty || "medium",
          expectedAnswer: question.expectedAnswer,
          keywords: question.keywords || [],
        });
      });
    }

    // Create question pool with all questions
    const questionPool = new QuestionPool({
      resumeId: interview.resumeId._id,
      interviewId: interviewId,
      userId: userId,
      interviewType: interview.interviewType,
      level: interview.level,
      difficultyLevel: interview.difficultyLevel,
      jobRole: interview.jobRole,
      questions: allQuestions,
      totalTokensUsed: regularQuestionsResult.totalTokensUsed || 0,
    });

    await questionPool.save();

    logger.info("Complete question set generated successfully", {
      interviewId,
      questionPoolId: questionPool._id,
      questionCount: allQuestions.length,
      introductionQuestion: allQuestions[0].questionId,
      regularQuestionsCount: allQuestions.length - 1,
      totalTokensUsed: regularQuestionsResult.totalTokensUsed || 0,
    });

    return {
      success: true,
      message: "Complete question set generated successfully",
      data: {
        questionPoolId: questionPool._id,
        questionCount: allQuestions.length,
        introductionQuestion: allQuestions[0],
        regularQuestions: allQuestions.slice(1),
        totalTokensUsed: regularQuestionsResult.totalTokensUsed || 0,
      },
    };
  } catch (error) {
    logger.error("Error generating complete question set:", error);
    return {
      success: false,
      message: "Failed to generate complete question set",
    };
  }
};

module.exports = generateCompleteQuestionSet;
