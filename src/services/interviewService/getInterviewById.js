const { Interview, logger } = require("./dependencies");

/**
 * Get interview by ID
 * @param {string} interviewId - Interview ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Interview result
 */
const getInterviewById = async (interviewId, userId) => {
  try {
    const interview = await Interview.findOne({
      _id: interviewId,
      candidateId: userId,
      isActive: true,
    }).populate("resumeId", "resumeName originalFileName resumeText");

    if (!interview) {
      return {
        success: false,
        message: "Interview not found",
      };
    }

    return {
      success: true,
      data: {
        id: interview._id,
        status: interview.status,
        interviewType: interview.interviewType,
        level: interview.level,
        difficultyLevel: interview.difficultyLevel,
        jobRole: interview.jobRole,
        interviewerId: interview.interviewerId,
        companyName: interview.companyName,
        experienceLevel: interview.experienceLevel,
        skills: interview.skills,
        additionalNotes: interview.additionalNotes,
        scheduled: interview.scheduled,
        scheduledDate: interview.scheduledDate,
        scheduledTime: interview.scheduledTime,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        totalDuration: interview.totalDuration,
        resume: {
          id: interview.resumeId?._id,
          name: interview.resumeId?.resumeName,
          originalFileName: interview.resumeId?.originalFileName,
          text: interview.resumeId?.resumeText,
        },
        questions: interview.questions.map((q) => ({
          questionId: q.questionId,
          question: q.question,
          category: q.category,
          difficulty: q.difficulty,
          expectedAnswer: q.expectedAnswer,
          answer: q.answer,
          answerAnalysis: q.answerAnalysis,
          timeSpent: q.timeSpent,
          answeredAt: q.answeredAt,
          isAnswered: q.isAnswered,
        })),
        overallAnalysis: interview.overallAnalysis,
        createdAt: interview.createdAt,
        updatedAt: interview.updatedAt,
      },
    };
  } catch (error) {
    logger.error("Error retrieving interview:", error);
    throw error;
  }
};

module.exports = getInterviewById;

