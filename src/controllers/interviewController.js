const Interview = require("../models/Interview");
const Resume = require("../models/Resume");
const logger = require("../utils/logger");
const questionGenerationService = require("../services/questionGenerationService");
const chatGPTService = require("../services/chatgptService");

/**
 * Start a new interview session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const startInterview = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

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
    } = req.body;

    logger.info("req.body -->", req.body);
    console.log("req.body -->", req.body);
    // Validate required fields
    if (
      !resumeId ||
      !interviewType ||
      !level ||
      !difficultyLevel ||
      !jobRole ||
      !interviewerId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: resumeId, interviewType, level, difficultyLevel, jobRole, interviewerId",
      });
    }

    // Validate interviewer details
    if (
      !interviewer ||
      !interviewer.name ||
      !interviewer.experience ||
      !interviewer.bio
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required interviewer details: name, experience, and bio are required",
      });
    }

    // Validate number of interviewers
    if (
      interviewer.numberOfInterviewers &&
      (interviewer.numberOfInterviewers < 1 ||
        interviewer.numberOfInterviewers > 10)
    ) {
      return res.status(400).json({
        success: false,
        message: "Number of interviewers must be between 1 and 10",
      });
    }

    // Verify resume belongs to the user
    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user.id,
      isActive: true,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found or access denied",
      });
    }

    // Check if user already has an active interview
    const existingActiveInterview = await Interview.findOne({
      candidateId: req.user.id,
      status: { $in: ["scheduled", "in_progress"] },
      isActive: true,
    });

    if (existingActiveInterview) {
      return res.status(409).json({
        success: false,
        message:
          "You already have an active interview session. Please complete or cancel it before starting a new one.",
        data: {
          interviewId: existingActiveInterview._id,
          status: existingActiveInterview.status,
        },
      });
    }

    // Create new interview
    const interview = new Interview({
      candidateId: req.user.id,
      resumeId: resumeId,
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
      },
      companyName: companyName || "",
      experienceLevel: experienceLevel || "",
      skills: skills || [],
      additionalNotes: additionalNotes || "",
      scheduled: scheduled || false,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      scheduledTime: scheduledTime || "",
      status: scheduled ? "scheduled" : "in_progress",
      createdBy: req.user.id,
    });

    // If not scheduled, start immediately
    if (!scheduled) {
      interview.startedAt = new Date();
    }

    await interview.save();

    logger.info(`Interview started for user ${req.user.id}: ${interview._id}`);

    // Generate questions asynchronously (don't wait for completion)
    questionGenerationService
      .generateQuestionsForInterview(interview._id, req.user.id)
      .then((result) => {
        if (result.success) {
          logger.info("Questions generated successfully for interview:", {
            interviewId: interview._id,
            questionCount: result.data.questionCount,
            totalTokensUsed: result.data.totalTokensUsed,
          });
          console.log("result -->", result);
        } else {
          logger.warn("Questions generation failed or already exists:", {
            interviewId: interview._id,
            message: result.message,
          });
        }
      })
      .catch((error) => {
        logger.error("Error generating questions asynchronously:", {
          interviewId: interview._id,
          error: error.message,
        });
      });

    res.status(201).json({
      success: true,
      message: scheduled
        ? "Interview scheduled successfully"
        : "Interview started successfully",
      data: {
        interviewId: interview._id,
        status: interview.status,
        startedAt: interview.startedAt,
        scheduledDate: interview.scheduledDate,
        scheduledTime: interview.scheduledTime,
        resumeName: resume.resumeName,
        jobRole: interview.jobRole,
        interviewType: interview.interviewType,
        level: interview.level,
        difficultyLevel: interview.difficultyLevel,
        interviewer: {
          name: interview.interviewer.name,
          numberOfInterviewers: interview.interviewer.numberOfInterviewers,
          experience: interview.interviewer.experience,
          bio: interview.interviewer.bio,
        },
        questionsGenerating: true, // Indicate that questions are being generated
      },
    });
  } catch (error) {
    logger.error("Error starting interview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while starting interview",
    });
  }
};

/**
 * Get all interviews for authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserInterviews = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { status, limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let query = { candidateId: req.user.id, isActive: true };
    if (status) {
      query.status = status;
    }

    const interviews = await Interview.find(query)
      .populate("resumeId", "resumeName originalFileName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalInterviews = await Interview.countDocuments(query);

    const interviewList = interviews.map((interview) => ({
      id: interview._id,
      status: interview.status,
      interviewType: interview.interviewType,
      jobRole: interview.jobRole,
      level: interview.level,
      difficultyLevel: interview.difficultyLevel,
      companyName: interview.companyName,
      resumeName: interview.resumeId?.resumeName || "Unknown Resume",
      startedAt: interview.startedAt,
      completedAt: interview.completedAt,
      totalDuration: interview.totalDuration,
      scheduledDate: interview.scheduledDate,
      scheduledTime: interview.scheduledTime,
      overallAnalysis: {
        totalQuestions: interview.overallAnalysis.totalQuestions,
        answeredQuestions: interview.overallAnalysis.answeredQuestions,
        averageRating: interview.overallAnalysis.averageRating,
        recommendation: interview.overallAnalysis.recommendation,
        confidenceScore: interview.overallAnalysis.confidenceScore,
      },
      createdAt: interview.createdAt,
    }));

    res.status(200).json({
      success: true,
      message: "Interviews retrieved successfully",
      data: {
        interviews: interviewList,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalInterviews / limit),
          totalInterviews,
          hasNext: page * limit < totalInterviews,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Error retrieving interviews:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving interviews",
    });
  }
};

/**
 * Get specific interview by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getInterviewById = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;
    const interview = await Interview.findOne({
      _id: id,
      candidateId: req.user.id,
      isActive: true,
    }).populate("resumeId", "resumeName originalFileName resumeText");

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Interview retrieved successfully",
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
    });
  } catch (error) {
    logger.error("Error retrieving interview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving interview",
    });
  }
};

/**
 * Update interview status (start, pause, resume, complete, cancel)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateInterviewStatus = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = [
      "scheduled",
      "in_progress",
      "completed",
      "cancelled",
      "paused",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Valid statuses are: " + validStatuses.join(", "),
      });
    }

    const interview = await Interview.findOne({
      _id: id,
      candidateId: req.user.id,
      isActive: true,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Update status using appropriate method
    switch (status) {
      case "in_progress":
        await interview.startInterview();
        break;
      case "completed":
        await interview.completeInterview();
        break;
      case "paused":
        await interview.pauseInterview();
        break;
      case "cancelled":
        await interview.cancelInterview();
        break;
      default:
        interview.status = status;
        await interview.save();
    }

    logger.info(
      `Interview ${id} status updated to ${status} by user ${req.user.id}`
    );

    res.status(200).json({
      success: true,
      message: `Interview ${status} successfully`,
      data: {
        interviewId: interview._id,
        status: interview.status,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        totalDuration: interview.totalDuration,
      },
    });
  } catch (error) {
    logger.error("Error updating interview status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating interview status",
    });
  }
};

/**
 * Add question to interview
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addQuestion = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;
    const { questionId, question, category, difficulty, expectedAnswer } =
      req.body;

    if (!questionId || !question || !category) {
      return res.status(400).json({
        success: false,
        message: "questionId, question, and category are required",
      });
    }

    const interview = await Interview.findOne({
      _id: id,
      candidateId: req.user.id,
      isActive: true,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    const questionData = {
      questionId,
      question,
      category,
      difficulty: difficulty || "medium",
      expectedAnswer: expectedAnswer || "",
    };

    await interview.addQuestion(questionData);

    res.status(200).json({
      success: true,
      message: "Question added successfully",
      data: {
        questionId,
        question,
        category,
        difficulty: questionData.difficulty,
      },
    });
  } catch (error) {
    logger.error("Error adding question:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while adding question",
    });
  }
};

/**
 * Update answer for a question
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateAnswer = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id, questionId } = req.params;
    const { answer, timeSpent } = req.body;

    if (!answer) {
      return res.status(400).json({
        success: false,
        message: "Answer is required",
      });
    }

    const interview = await Interview.findOne({
      _id: id,
      candidateId: req.user.id,
      isActive: true,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    await interview.updateAnswer(questionId, answer, timeSpent);

    res.status(200).json({
      success: true,
      message: "Answer updated successfully",
      data: {
        questionId,
        answer,
        timeSpent: timeSpent || 0,
        answeredAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("Error updating answer:", error);
    if (error.message === "Question not found") {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error while updating answer",
    });
  }
};

/**
 * Update answer analysis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateAnswerAnalysis = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id, questionId } = req.params;
    const analysis = req.body;

    const interview = await Interview.findOne({
      _id: id,
      candidateId: req.user.id,
      isActive: true,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    await interview.updateAnswerAnalysis(questionId, analysis);

    res.status(200).json({
      success: true,
      message: "Answer analysis updated successfully",
      data: {
        questionId,
        analysis,
      },
    });
  } catch (error) {
    logger.error("Error updating answer analysis:", error);
    if (error.message === "Question not found") {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error while updating answer analysis",
    });
  }
};

/**
 * Delete interview
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteInterview = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;
    const interview = await Interview.findOne({
      _id: id,
      candidateId: req.user.id,
      isActive: true,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Soft delete
    interview.isActive = false;
    await interview.save();

    logger.info(`Interview deleted by user ${req.user.id}: ${interview._id}`);

    res.status(200).json({
      success: true,
      message: "Interview deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting interview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting interview",
    });
  }
};

/**
 * Get questions for an interview
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getInterviewQuestions = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;

    const result = await questionGenerationService.getQuestionsForInterview(
      id,
      req.user.id
    );

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logger.error("Error retrieving interview questions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving interview questions",
    });
  }
};

/**
 * Generate questions for an interview (manual trigger)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateInterviewQuestions = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;

    const result =
      await questionGenerationService.generateQuestionsForInterview(
        id,
        req.user.id
      );

    if (!result.success) {
      return res.status(409).json({
        success: false,
        message: result.message,
        data: result.data,
      });
    }

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logger.error("Error generating interview questions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while generating interview questions",
    });
  }
};

/**
 * Test ChatGPT API connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const testChatGPTConnection = async (req, res) => {
  try {
    const isWorking = await chatGPTService.testConnection();

    res.status(200).json({
      success: true,
      message: isWorking
        ? "ChatGPT API is working"
        : "ChatGPT API is not working",
      data: {
        isWorking,
      },
    });
  } catch (error) {
    logger.error("Error testing ChatGPT connection:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while testing ChatGPT connection",
    });
  }
};

module.exports = {
  startInterview,
  getUserInterviews,
  getInterviewById,
  updateInterviewStatus,
  addQuestion,
  updateAnswer,
  updateAnswerAnalysis,
  deleteInterview,
  getInterviewQuestions,
  generateInterviewQuestions,
  testChatGPTConnection,
};
