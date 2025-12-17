const { TopicInterview, logger } = require("./dependencies");
const InterviewStateService = require("../../interviewStateService");

/**
 * Create new topic interview
 * @param {string} userId - User ID
 * @param {Object} interviewData - Interview data
 * @returns {Promise<Object>} Creation result
 */
const createInterview = async (userId, interviewData) => {
  try {
    const {
      topicId,
      topicName,
      interviewSourceType, // "resume" or "job_description"
      resumeId, // Required if interviewSourceType is "resume"
      jobDescriptionId, // Required if interviewSourceType is "job_description"
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

    // Validate source type and corresponding ID
    if (interviewSourceType === "resume" && !resumeId) {
      throw new Error("Resume ID is required when interview source type is resume");
    }
    if (interviewSourceType === "job_description" && !jobDescriptionId) {
      throw new Error(
        "Job Description ID is required when interview source type is job_description"
      );
    }

    const interview = new TopicInterview({
      candidateId: userId,
      topicId: topicId || topicName.toLowerCase().replace(/\s+/g, "-"),
      topicName,
      interviewSourceType,
      resumeId: interviewSourceType === "resume" ? resumeId : undefined,
      jobDescriptionId:
        interviewSourceType === "job_description" ? jobDescriptionId : undefined,
      interviewType: interviewType || "technical",
      level,
      difficultyLevel,
      jobRole: jobRole || `${topicName} Developer`,
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
      introductionAsked: false,
      currentFollowUpCount: 0,
      maxFollowUpsPerQuestion: 1,
    });

    if (!scheduled) {
      interview.startedAt = new Date();
    }

    await interview.save();
    logger.info(
      `✅ [Topic Interview] Created interview for user ${userId}: ${interview._id} (Topic: ${topicName})`
    );

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
          interviewType: "topic",
        });
        logger.info(
          `✅ [Topic Interview] User interview state updated for user ${userId}`
        );
      } catch (stateError) {
        // Log error but don't fail the interview creation
        logger.error("❌ [Topic Interview] Error updating user interview state:", stateError);
      }
    }

    return {
      success: true,
      interview,
    };
  } catch (error) {
    logger.error("❌ [Topic Interview] Error creating interview:", error);
    throw error;
  }
};

module.exports = createInterview;
