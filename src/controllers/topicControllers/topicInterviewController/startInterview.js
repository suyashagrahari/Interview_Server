const {
  TopicInterviewService,
  Resume,
  JobDescription,
  logger,
  sendAuthRequiredError,
  sendValidationError,
  sendConflictError,
  sendNotFoundError,
  sendInternalServerError,
  sendCreatedResponse,
} = require("./dependencies");

/**
 * Start a new topic-based interview session
 */
const startInterview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return sendAuthRequiredError(res);
    }

    const {
      topic,
      topicName,
      interviewType,
      difficultyLevel,
      experienceLevel,
      interviewFormat,
      interviewerId,
      resumeId,
      jobDescriptionId,
    } = req.body;

    // Validate required fields
    if (!topic || !interviewerId || !experienceLevel || !difficultyLevel) {
      return sendValidationError(res, [
        "Topic, interviewer ID, experience level, and difficulty level are required",
      ]);
    }

    // Determine interview source type (resume or job description)
    let interviewSourceType = "resume";
    let sourceId = resumeId;

    if (jobDescriptionId) {
      interviewSourceType = "job_description";
      sourceId = jobDescriptionId;
    } else if (!resumeId) {
      // If neither is provided, try to get user's latest resume
      const latestResume = await Resume.findOne({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(1);

      if (!latestResume) {
        return sendValidationError(res, [
          "No resume found. Please upload a resume first.",
        ]);
      }
      sourceId = latestResume._id;
    }

    // Check for active interview
    const activeInterviewCheck = await TopicInterviewService.checkActiveInterview(
      req.user.id
    );
    if (activeInterviewCheck.hasActiveInterview) {
      return sendConflictError(
        res,
        "You already have an active interview session. Please complete or cancel it before starting a new one.",
        {
          interviewId: activeInterviewCheck.interview._id,
          status: activeInterviewCheck.interview.status,
        }
      );
    }

    // Verify source ownership (resume or JD)
    let sourceName = "";
    if (interviewSourceType === "resume") {
      const resume = await Resume.findOne({ _id: sourceId, userId: req.user.id });
      if (!resume) {
        return sendNotFoundError(res, "Resume not found or access denied");
      }
      sourceName = resume.resumeName;
    } else {
      const jd = await JobDescription.findOne({ _id: sourceId, userId: req.user.id });
      if (!jd) {
        return sendNotFoundError(res, "Job description not found or access denied");
      }
      sourceName = jd.title;
    }

    // Get interviewer details (you may need to implement this)
    const interviewer = {
      name: "AI Interviewer",
      numberOfInterviewers: 1,
      experience: "5+ years",
      bio: `Experienced ${topic} interviewer`,
    };

    // Create interview data
    const interviewData = {
      topicId: topic.toLowerCase().replace(/\s+/g, "-"),
      topicName: topicName || topic,
      interviewSourceType,
      resumeId: interviewSourceType === "resume" ? sourceId : undefined,
      jobDescriptionId:
        interviewSourceType === "job_description" ? sourceId : undefined,
      interviewType: interviewFormat || "technical",
      level: experienceLevel,
      difficultyLevel,
      jobRole: `${topicName || topic} Developer`,
      interviewerId,
      interviewer,
      companyName: "",
      experienceLevel: experienceLevel,
      skills: [topicName || topic],
      additionalNotes: "",
      scheduled: false,
    };

    // Create interview
    const interviewResult = await TopicInterviewService.createInterview(
      req.user.id,
      interviewData
    );

    if (!interviewResult.success) {
      return sendInternalServerError(res, "Failed to create interview");
    }

    const responseData = {
      interviewId: interviewResult.interview._id,
      status: interviewResult.interview.status,
      startedAt: interviewResult.interview.startedAt,
      topicName: interviewResult.interview.topicName,
      sourceName,
      sourceType: interviewSourceType,
      jobRole: interviewResult.interview.jobRole,
      interviewType: interviewResult.interview.interviewType,
      level: interviewResult.interview.level,
      difficultyLevel: interviewResult.interview.difficultyLevel,
      interviewer: {
        name: interviewResult.interview.interviewer.name,
        experience: interviewResult.interview.interviewer.experience,
        bio: interviewResult.interview.interviewer.bio,
      },
    };

    return sendCreatedResponse(
      res,
      "Topic interview started successfully",
      responseData
    );
  } catch (error) {
    logger.error("❌ [Topic Interview Controller] Error starting interview:", error);
    return sendInternalServerError(
      res,
      "Internal server error while starting interview"
    );
  }
};

module.exports = startInterview;
