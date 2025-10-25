const { ResumeInterview, logger } = require("./dependencies");
const InterviewStateService = require("../interviewStateService");

/**
 * Create new interview
 * @param {string} userId - User ID
 * @param {Object} interviewData - Interview data
 * @returns {Promise<Object>} Creation result
 */
const createInterview = async (userId, interviewData) => {
  try {
    const {
      resumeId,
      interviewType,
      level,
      difficultyLevel,
      jobRole,
      interviewerId,
      interviewer,
      companyName,
      experienceLevel,
      skills,
      additionalNotes,
      scheduled,
      scheduledDate,
      scheduledTime,
    } = interviewData;

    const interview = new ResumeInterview({
      candidateId: userId,
      resumeId,
      interviewType,
      level,
      difficultyLevel,
      jobRole,
      interviewerId,
      interviewer: {
        name: interviewer.name,
        numberOfInterviewers: interviewer.numberOfInterviewers || 1,
        experience: interviewer.experience,
        bio: interviewer.bio,
        introduction: interviewer.introduction || "",
      },
      companyName: companyName || "",
      experienceLevel: experienceLevel || "",
      skills: skills || [],
      additionalNotes: additionalNotes || "",
      scheduled: scheduled || false,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      scheduledTime: scheduledTime || "",
      status: scheduled ? "scheduled" : "in_progress",
      createdBy: userId,
    });

    if (!scheduled) {
      interview.startedAt = new Date();
    }

    await interview.save();
    logger.info(`Interview created for user ${userId}: ${interview._id}`);

    // Update user interview state for cross-device tracking
    if (!scheduled) {
      try {
        await InterviewStateService.updateUserInterviewState(userId, {
          interviewId: interview._id,
          status: interview.status,
          startedAt: interview.startedAt,
          completedAt: null,
          currentQuestionNumber: 0,
          totalQuestions: 0,
          timeRemaining: interview.timeRemaining || 2700, // 45 minutes
          interviewType: "resume",
        });
        logger.info(`User interview state updated for user ${userId}`);
      } catch (stateError) {
        // Log error but don't fail the interview creation
        logger.error("Error updating user interview state:", stateError);
      }
    }

    return {
      success: true,
      interview,
    };
  } catch (error) {
    logger.error("Error creating interview:", error);
    throw error;
  }
};

module.exports = createInterview;



