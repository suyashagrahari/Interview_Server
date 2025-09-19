const { Interview, logger } = require("./dependencies");

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

    const interview = new Interview({
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

